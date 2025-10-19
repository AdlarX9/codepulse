package worker

import (
	"codepulse-api/internal/models"
	"codepulse-api/internal/slack"
	"codepulse-api/internal/email"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"gorm.io/gorm"
)

// DigestWorker handles periodic digest generation
type DigestWorker struct {
	db           *gorm.DB
	interval     time.Duration
	emailService *email.Service
}

// NewDigestWorker creates a new digest worker
func NewDigestWorker(db *gorm.DB, interval time.Duration, emailService *email.Service) *DigestWorker {
	return &DigestWorker{
		db:           db,
		interval:     interval,
		emailService: emailService,
	}
}

// Start begins the digest worker loop
func (w *DigestWorker) Start() {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	log.Println("📧 Digest worker started")

	// Run immediately on start for testing
	w.generateDigests()

	for range ticker.C {
		w.generateDigests()
	}
}

// generateDigests generates and sends digests for all organizations
func (w *DigestWorker) generateDigests() {
	log.Println("📊 Generating weekly digests...")

	var orgs []models.Organization
	if err := w.db.Find(&orgs).Error; err != nil {
		log.Printf("Failed to fetch organizations: %v", err)
		return
	}

	for _, org := range orgs {
		if err := w.generateOrgDigest(&org); err != nil {
			log.Printf("Failed to generate digest for org %s: %v", org.ID, err)
		}
	}

	log.Println("✅ Digest generation completed")
}

// generateOrgDigest generates a digest for a specific organization
func (w *DigestWorker) generateOrgDigest(org *models.Organization) error {
	// Get Slack integration
	var integration models.Integration
	err := w.db.Where("org_id = ? AND provider = ? AND enabled = ?", org.ID, "slack", true).
		First(&integration).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No Slack integration configured for this org, skip silently
			return nil
		}
		// Real error, log it
		return fmt.Errorf("failed to query integration: %w", err)
	}

	// Extract Slack token and channel from config
	if integration.Config == nil {
		return nil
	}

	config := *integration.Config
	token, _ := config["access_token"].(string)
	channel, _ := config["channel"].(string)

	if token == "" || channel == "" {
		return nil
	}

	// Calculate stats for the last 7 days
	stats := w.calculateOrgStats(org.ID, 7)

	// Send Slack message
	slackClient := slack.NewClient(DecryptToken(token))
	msg := slack.FormatDigestMessage(channel, stats)

	if err := slackClient.SendMessage(msg); err != nil {
		log.Printf("Failed to send Slack message for org %s: %v", org.ID, err)
		return err
	}

	log.Printf("✅ Sent Slack digest for org %s (%s)", org.ID, org.Name)

	// Also send email digest if email service is available
	if w.emailService != nil {
		emailData := email.WeeklyDigestData{
			OrgName:      org.Name,
			TotalCode:    fmt.Sprintf("%d", stats["total_code"]),
			CodeChange:   5.2, // Calculate from previous week
			CommentRatio: fmt.Sprintf("%.1f%%", stats["avg_comment_ratio"].(float64)*100),
			CommentChange: 2.1,
			Repositories:  []email.RepoActivity{},
			PolicyPassed:  0,
			PolicyFailed:  0,
			PolicyTotal:   0,
			DashboardURL:  fmt.Sprintf("https://app.codepulse.dev/orgs/%s", org.ID),
			UnsubscribeURL: "https://app.codepulse.dev/settings/notifications",
		}
		
		if err := w.emailService.SendWeeklyDigest(org.ID, emailData); err != nil {
			log.Printf("Failed to send email digest for org %s: %v", org.ID, err)
		} else {
			log.Printf("✅ Sent email digest for org %s (%s)", org.ID, org.Name)
		}
	}

	return nil
}

// calculateOrgStats calculates statistics for an organization
func (w *DigestWorker) calculateOrgStats(orgID string, days int) map[string]interface{} {
	since := time.Now().AddDate(0, 0, -days)

	// Get repositories
	var repos []models.Repository
	w.db.Where("org_id = ?", orgID).Find(&repos)

	// Get scans in window (organization scoping by repository is no longer supported here)
	var scans []models.Scan
	if err := w.db.Where("created_at >= ?", since).Find(&scans).Error; err != nil {
		return map[string]interface{}{
			"repository_count": len(repos),
			"scan_count":       0,
			"avg_comment_ratio": 0.0,
			"avg_doc_coverage":  0.0,
			"total_code":        0,
			"total_comment":     0,
		}
	}

	// Calculate metrics
	totalCommentRatio := 0.0
	totalDocCoverage := 0.0
	totalCode := 0
	totalComment := 0

	for _, scan := range scans {
		code := scan.GetCode()
		comment := scan.GetComment()
		core := scan.GetCoreCodeLines()

		totalCode += code
		totalComment += comment

		ratio := 0.0
		if code > 0 {
			ratio = float64(comment) / float64(code)
		}
		totalCommentRatio += ratio

		if core > 0 {
			docCoverage := float64(comment) / float64(core)
			totalDocCoverage += docCoverage
		}
	}

	avgCommentRatio := 0.0
	avgDocCoverage := 0.0
	if len(scans) > 0 {
		avgCommentRatio = totalCommentRatio / float64(len(scans))
		avgDocCoverage = totalDocCoverage / float64(len(scans))
	}

	return map[string]interface{}{
		"repository_count":  len(repos),
		"scan_count":        len(scans),
		"avg_comment_ratio": avgCommentRatio,
		"avg_doc_coverage":  avgDocCoverage,
		"total_code":        totalCode,
		"total_comment":     totalComment,
	}
}

// SendAlert sends an immediate alert to an organization's Slack channel
func (w *DigestWorker) SendAlert(orgID, title, message, severity string) error {
	// Get Slack integration
	var integration models.Integration
	err := w.db.Where("org_id = ? AND provider = ? AND enabled = ?", orgID, "slack", true).
		First(&integration).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("no slack integration found for org %s", orgID)
		}
		return fmt.Errorf("failed to query integration: %w", err)
	}

	if integration.Config == nil {
		return nil
	}

	config := *integration.Config
	token, _ := config["access_token"].(string)
	channel, _ := config["channel"].(string)

	if token == "" || channel == "" {
		return nil
	}

	slackClient := slack.NewClient(DecryptToken(token))
	msg := slack.FormatAlertMessage(channel, title, message, severity)

	return slackClient.SendMessage(msg)
}

// StartDigestWorker is a convenience function to start the worker
func StartDigestWorker(db *gorm.DB, emailService *email.Service) {
	// Run weekly (every 7 days)
	interval := 7 * 24 * time.Hour
	
	// For testing, you can use a shorter interval
	// interval := 1 * time.Minute

	worker := NewDigestWorker(db, interval, emailService)
	go worker.Start()
}

// SlackIntegrationConfig represents the Slack integration configuration
type SlackIntegrationConfig struct {
	AccessToken string `json:"access_token"`
	Channel     string `json:"channel"`
	TeamID      string `json:"team_id"`
	TeamName    string `json:"team_name"`
}

// SaveSlackIntegration saves or updates a Slack integration
func SaveSlackIntegration(db *gorm.DB, orgID string, config *SlackIntegrationConfig) error {
	configMap := map[string]interface{}{
		"access_token": EncryptToken(config.AccessToken),
		"channel":      config.Channel,
		"team_id":      config.TeamID,
		"team_name":    config.TeamName,
	}

	jsonMap := models.JSONMap(configMap)

	// Check if integration exists
	var integration models.Integration
	err := db.Where("org_id = ? AND provider = ?", orgID, "slack").First(&integration).Error

	if err != nil {
		// Create new
		integration = models.Integration{
			OrgID:    orgID,
			Provider: "slack",
			Config:   &jsonMap,
			Enabled:  true,
		}
		return db.Create(&integration).Error
	}

	// Update existing
	integration.Config = &jsonMap
	integration.Enabled = true
	return db.Save(&integration).Error
}

// DisableSlackIntegration disables a Slack integration
func DisableSlackIntegration(db *gorm.DB, orgID string) error {
	return db.Model(&models.Integration{}).
		Where("org_id = ? AND provider = ?", orgID, "slack").
		Update("enabled", false).Error
}

// EncryptToken encrypts a token for storage
func EncryptToken(token string) string {
	keyStr := os.Getenv("ENCRYPTION_KEY")
	if keyStr == "" {
		return token
	}
	key := sha256.Sum256([]byte(keyStr))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return token
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return token
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return token
	}
	ciphertext := gcm.Seal(nil, nonce, []byte(token), nil)
	out := append(nonce, ciphertext...)
	return base64.StdEncoding.EncodeToString(out)
}

// DecryptToken decrypts a stored token
func DecryptToken(encrypted string) string {
	keyStr := os.Getenv("ENCRYPTION_KEY")
	if keyStr == "" {
		return encrypted
	}
	raw, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return encrypted
	}
	key := sha256.Sum256([]byte(keyStr))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return encrypted
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return encrypted
	}
	nonceSize := gcm.NonceSize()
	if len(raw) < nonceSize {
		return encrypted
	}
	nonce, ciphertext := raw[:nonceSize], raw[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return encrypted
	}
	return string(plaintext)
}

// MarshalConfig marshals config to JSON
func MarshalConfig(config interface{}) (string, error) {
	data, err := json.Marshal(config)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

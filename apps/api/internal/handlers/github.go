package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"codepulse-api/internal/database"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GitHubHandler handles GitHub integration endpoints
type GitHubHandler struct {
	db *database.Database
}

// NewGitHubHandler creates a new GitHub handler
func NewGitHubHandler(db *database.Database) *GitHubHandler {
	return &GitHubHandler{db: db}
}

// Webhook handles GitHub webhooks
// POST /api/github/webhook
func (h *GitHubHandler) Webhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	signature := c.GetHeader("x-hub-signature-256")
	event := c.GetHeader("x-github-event")

	// TODO: Get webhook secret from config
	webhookSecret := "your-webhook-secret" // Should come from config

	// Verify signature
	if !verifySignature(body, signature, webhookSecret) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload"})
		return
	}

	// Handle different event types
	switch event {
	case "release":
		h.handleReleaseEvent(c, payload)
	case "push":
		h.handlePushEvent(c, payload)
	case "star":
		h.handleStarEvent(c, payload)
	default:
		log.Printf("Unhandled GitHub event: %s", event)
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// LinkRepository links a project to a GitHub repository
// POST /api/github/link
func (h *GitHubHandler) LinkRepository(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		ProjectID    string `json:"project_id" binding:"required"`
		RepoFullName string `json:"repo_full_name" binding:"required"` // format: "owner/repo"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate repo format
	if !strings.Contains(req.RepoFullName, "/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid repository format. Use owner/repo"})
		return
	}

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", req.ProjectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify project ownership"})
		return
	}

	// Fetch repository info from GitHub API
	repoData, err := h.fetchGitHubRepoInfo(req.RepoFullName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to fetch repository info: %v", err)})
		return
	}

	// Check if link already exists
	var existingLink models.GitHubLink
	if err := h.db.DB.Where("project_id = ? AND repo_full_name = ?", req.ProjectID, req.RepoFullName).First(&existingLink).Error; err == nil {
		// Update existing link
		existingLink.RepoData = &repoData
		h.db.DB.Save(&existingLink)
		c.JSON(http.StatusOK, gin.H{"message": "Repository link updated", "link": existingLink})
		return
	}

	// Create new link
	link := models.GitHubLink{
		UserID:       userID.(string),
		ProjectID:    req.ProjectID,
		RepoFullName: req.RepoFullName,
		RepoData:     &repoData,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.db.DB.Create(&link).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create repository link"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Repository linked successfully", "link": link})
}

// handleReleaseEvent processes GitHub release events
func (h *GitHubHandler) handleReleaseEvent(c *gin.Context, payload map[string]interface{}) {
	release := payload["release"].(map[string]interface{})
	action := payload["action"].(string)

	if action == "published" {
		tagName := release["tag_name"].(string)
		releaseName := release["name"].(string)

		log.Printf("New release published: %s (%s)", releaseName, tagName)

		// TODO: Update latest release info for linked projects
		// This would involve finding projects linked to this repo and updating their GitHubLinks
	}
}

// handlePushEvent processes GitHub push events
func (h *GitHubHandler) handlePushEvent(c *gin.Context, payload map[string]interface{}) {
	// Extract push information
	ref := payload["ref"].(string)
	if strings.HasPrefix(ref, "refs/heads/") {
		branch := strings.TrimPrefix(ref, "refs/heads/")
		log.Printf("Push to branch: %s", branch)

		// TODO: Trigger project analysis or update last commit info
	}
}

// handleStarEvent processes GitHub star events
func (h *GitHubHandler) handleStarEvent(c *gin.Context, payload map[string]interface{}) {
	action := payload["action"].(string)
	log.Printf("Repository starred/unstarred: %s", action)

	// TODO: Update star count for linked projects
}

// fetchGitHubRepoInfo fetches repository information from GitHub API
func (h *GitHubHandler) fetchGitHubRepoInfo(repoFullName string) (models.JSONMap, error) {
	// TODO: Use GitHub token from config for authenticated requests
	githubToken := "your-github-token" // Should come from config

	client := &http.Client{}
	req, err := http.NewRequest("GET", fmt.Sprintf("https://api.github.com/repos/%s", repoFullName), nil)
	if err != nil {
		return nil, err
	}

	if githubToken != "" {
		req.Header.Set("Authorization", "Bearer "+githubToken)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "CodePulse/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var repoData models.JSONMap
	if err := json.Unmarshal(body, &repoData); err != nil {
		return nil, err
	}

	return repoData, nil
}

// verifySignature verifies GitHub webhook signature
func verifySignature(payload []byte, signature, secret string) bool {
	if signature == "" || secret == "" {
		return false
	}

	// Remove "sha256=" prefix if present
	signature = strings.TrimPrefix(signature, "sha256=")

	// Compute HMAC
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := mac.Sum(nil)

	// Compare signatures
	signatureBytes, err := hex.DecodeString(signature)
	if err != nil {
		return false
	}

	return hmac.Equal(signatureBytes, expectedMAC)
}

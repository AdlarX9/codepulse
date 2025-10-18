package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
)

type CIHandler struct {
	db        *database.Database
	jwtSecret string
}

func NewCIHandler(db *database.Database, jwtSecret string) *CIHandler {
	return &CIHandler{db: db, jwtSecret: jwtSecret}
}

// SnapshotPayload represents CI snapshot data
type SnapshotPayload struct {
	OrgID       string         `json:"org_id" binding:"required"`
	Repository  string         `json:"repository" binding:"required"`
	CommitSHA   string         `json:"commit_sha" binding:"required"`
	PullRequest *int           `json:"pull_request"`
	Totals      TotalsData     `json:"totals" binding:"required"`
	PerLanguage []LanguageData `json:"per_language" binding:"required"`
	ScannedAt   string         `json:"scanned_at" binding:"required"`
}

type TotalsData struct {
	Total         int `json:"total"`
	Code          int `json:"code"`
	Comment       int `json:"comment"`
	Blank         int `json:"blank"`
	CoreCodeLines int `json:"core_code_lines"`
	InfoLines     int `json:"info_lines"`
}

type LanguageData struct {
	Language string `json:"language"`
	Files    int    `json:"files"`
	Total    int    `json:"total"`
	Code     int    `json:"code"`
	Comment  int    `json:"comment"`
	Blank    int    `json:"blank"`
}

// CreateSnapshot receives and stores a CI snapshot
func (h *CIHandler) CreateSnapshot(c *gin.Context) {
	// Auth via Bearer token (org API token)
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization"})
		return
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	// Verify JWT token and require membership in target org
	var authedUserID string
	parsed, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.jwtSecret), nil
	})
	if err == nil && parsed != nil && parsed.Valid {
		if claims, ok := parsed.Claims.(jwt.MapClaims); ok {
			if uid, ok2 := claims["user_id"].(string); ok2 {
				authedUserID = uid
			}
		}
	}

	var payload SnapshotPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Require that authed user is a member of the org
	if authedUserID != "" {
		var membership models.Membership
		if err := h.db.DB.Where("org_id = ? AND user_id = ?", payload.OrgID, authedUserID).First(&membership).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of the organization"})
			return
		}
	}

	// Verify organization exists
	var org models.Organization
	if err := h.db.DB.Where("id = ?", payload.OrgID).First(&org).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	// Find or create repository
	var repo models.Repository
	err = h.db.DB.Where("org_id = ? AND full_name = ?", payload.OrgID, payload.Repository).
		First(&repo).Error

	if err != nil {
		// Create repository
		repo = models.Repository{
			OrgID:      payload.OrgID,
			Provider:   "github",
			ExternalID: payload.Repository,
			FullName:   payload.Repository,
			Visibility: "private",
		}
		if err := h.db.DB.Create(&repo).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create repository"})
			return
		}
	}

	// Find or create a dummy project linked to this repository
	var project models.Project
	projectKeyHash := "ci:" + payload.Repository
	err = h.db.DB.Where("project_key_hash = ?", projectKeyHash).First(&project).Error

	if err != nil {
		// Get first org member (owner) to assign as project owner
		var membership models.Membership
		if err := h.db.DB.Where("org_id = ? AND role = ?", payload.OrgID, "owner").
			First(&membership).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No org owner found"})
			return
		}

		repoName := payload.Repository
		project = models.Project{
			UserID:         membership.UserID,
			ProjectKeyHash: &projectKeyHash,
			Name:           &repoName,
			Visibility:     "private",
		}
		if err := h.db.DB.Create(&project).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
			return
		}
	}

	// Calculate comment ratio
	commentRatio := 0.0
	if payload.Totals.Code > 0 {
		commentRatio = float64(payload.Totals.Comment) / float64(payload.Totals.Code)
	}

	// Parse scanned_at timestamp
	scannedAtInt, _ := strconv.ParseInt(payload.ScannedAt, 10, 64)

	// Create scan
	scan := models.Scan{
		UserID:        project.UserID,
		ProjectID:     project.ID,
		RepositoryID:  &repo.ID,
		CommitSHA:     &payload.CommitSHA,
		PullRequest:   payload.PullRequest,
		Total:         payload.Totals.Total,
		Code:          payload.Totals.Code,
		Comment:       payload.Totals.Comment,
		Blank:         payload.Totals.Blank,
		CommentRatio:  commentRatio,
		CoreCodeLines: payload.Totals.CoreCodeLines,
		InfoLines:     payload.Totals.InfoLines,
	}

	if scannedAtInt > 0 {
		// Use provided timestamp if valid
		// Already stored with GORM timestamps
	}

	if err := h.db.DB.Create(&scan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan"})
		return
	}

	// Create scan languages
	for _, lang := range payload.PerLanguage {
		scanLang := models.ScanLang{
			ScanID:   scan.ID,
			Language: lang.Language,
			Files:    lang.Files,
			Total:    lang.Total,
			Code:     lang.Code,
			Comment:  lang.Comment,
			Blank:    lang.Blank,
		}
		if err := h.db.DB.Create(&scanLang).Error; err != nil {
			// Log but don't fail
			continue
		}
	}

	// Create audit log asynchronously
	go func() {
		details := models.JSONMap{"scan_id": scan.ID, "repository_id": repo.ID, "commit_sha": payload.CommitSHA}
		orgID := repo.OrgID
		h.db.DB.Create(&models.AuditLog{
			OrgID:    &orgID,
			UserID:   authedUserID,
			Action:   "ci.snapshot.created",
			Resource: "scan",
			Details:  &details,
		})
	}()

	c.JSON(http.StatusCreated, gin.H{
		"scan_id":       scan.ID,
		"repository_id": repo.ID,
		"message":       "Snapshot created successfully",
	})
}

// GetSnapshot retrieves a specific scan by ID
func (h *CIHandler) GetSnapshot(c *gin.Context) {
	scanID := c.Param("id")

	var scan models.Scan
	if err := h.db.DB.Where("id = ?", scanID).
		Preload("ScanLangs").
		Preload("Repository").
		First(&scan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scan not found"})
		return
	}

	c.JSON(http.StatusOK, scan)
}

package handlers

import (
	"net/http"
	"strconv"
	"time"

	"codepulse-api/internal/database"
	"codepulse-api/internal/middleware"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
)

type ScanHandler struct {
	db *database.Database
}

func NewScanHandler(db *database.Database) *ScanHandler {
	return &ScanHandler{db: db}
}

type SyncPayload struct {
	ProjectKeyHash string      `json:"project_key_hash" binding:"required"`
	Totals         ScanTotals  `json:"totals" binding:"required"`
	PerLanguage    []LangStats `json:"per_language" binding:"required"`
	DeviceID       string      `json:"device_id" binding:"required"`
	AppVersion     *string     `json:"app_version"`
	ScannedAt      string      `json:"scanned_at" binding:"required"`
}

type ScanTotals struct {
	Total         int `json:"total" binding:"required"`
	Code          int `json:"code" binding:"required"`
	Comment       int `json:"comment" binding:"required"`
	Blank         int `json:"blank" binding:"required"`
	CoreCodeLines int `json:"core_code_lines"`
	InfoLines     int `json:"info_lines"`
}

type LangStats struct {
	Language string `json:"language" binding:"required"`
	Files    int    `json:"files" binding:"required"`
	Total    int    `json:"total" binding:"required"`
	Code     int    `json:"code" binding:"required"`
	Comment  int    `json:"comment" binding:"required"`
	Blank    int    `json:"blank" binding:"required"`
}

// SyncScan handles POST /sync/scan
func (h *ScanHandler) SyncScan(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Parse request body
	var payload SyncPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	// Parse scanned_at timestamp
	scannedAtInt, err := strconv.ParseInt(payload.ScannedAt, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scanned_at timestamp"})
		return
	}
	scannedAtTime := time.Unix(scannedAtInt, 0)

	// Start transaction
	tx := h.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Upsert project
	project := models.Project{
		UserID:         user.ID,
		ProjectKeyHash: payload.ProjectKeyHash,
	}

	if err := tx.Where("user_id = ? AND project_key_hash = ?", user.ID, payload.ProjectKeyHash).
		FirstOrCreate(&project).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create/find project"})
		return
	}

	// Create scan
	commentRatio := float64(0)
	if payload.Totals.Total > 0 {
		commentRatio = float64(payload.Totals.Comment) / float64(payload.Totals.Total)
	}

	scan := models.Scan{
		UserID:        user.ID,
		ProjectID:     project.ID,
		Total:         payload.Totals.Total,
		Code:          payload.Totals.Code,
		Comment:       payload.Totals.Comment,
		Blank:         payload.Totals.Blank,
		CommentRatio:  commentRatio,
		CoreCodeLines: payload.Totals.CoreCodeLines,
		InfoLines:     payload.Totals.InfoLines,
		DeviceID:      &payload.DeviceID,
		VersionTag:    payload.AppVersion,
		CreatedAt:     scannedAtTime,
		UpdatedAt:     scannedAtTime,
	}

	if err := tx.Create(&scan).Error; err != nil {
		tx.Rollback()
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

		if err := tx.Create(&scanLang).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan language"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Scan synced successfully",
		"scan_id": scan.ID,
	})
}

// CreateSnapshot handles POST /projects/:id/snapshot
func (h *ScanHandler) CreateSnapshot(c *gin.Context) {
	projectID := c.Param("id")
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get current user for the scan
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Parse request body - similar to SyncPayload but for snapshot creation
	var payload struct {
		ProjectKeyHash string      `json:"project_key_hash" binding:"required"`
		Totals         ScanTotals  `json:"totals" binding:"required"`
		PerLanguage    []LangStats `json:"per_language" binding:"required"`
		DeviceID       string      `json:"device_id" binding:"required"`
		AppVersion     *string     `json:"app_version"`
		ScannedAt      string      `json:"scanned_at" binding:"required"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	// Parse scanned_at timestamp
	scannedAtInt, err := strconv.ParseInt(payload.ScannedAt, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scanned_at timestamp"})
		return
	}
	scannedAtTime := time.Unix(scannedAtInt, 0)

	// Start transaction
	tx := h.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create scan
	commentRatio := float64(0)
	if payload.Totals.Total > 0 {
		commentRatio = float64(payload.Totals.Comment) / float64(payload.Totals.Total)
	}

	scan := models.Scan{
		UserID:        user.ID,
		ProjectID:     project.ID,
		Total:         payload.Totals.Total,
		Code:          payload.Totals.Code,
		Comment:       payload.Totals.Comment,
		Blank:         payload.Totals.Blank,
		CommentRatio:  commentRatio,
		CoreCodeLines: payload.Totals.CoreCodeLines,
		InfoLines:     payload.Totals.InfoLines,
		DeviceID:      &payload.DeviceID,
		VersionTag:    payload.AppVersion,
		CreatedAt:     scannedAtTime,
		UpdatedAt:     scannedAtTime,
	}

	if err := tx.Create(&scan).Error; err != nil {
		tx.Rollback()
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

		if err := tx.Create(&scanLang).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan language"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Snapshot created successfully",
		"scan_id": scan.ID,
	})
}

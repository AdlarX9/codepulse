package handlers

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"codepulse-api/internal/database"
	"codepulse-api/internal/middleware"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateProjectRequest struct {
	Name        *string         `json:"name"`
	Description *string         `json:"description"`
	Path        *string         `json:"path"`
	Visibility  *string         `json:"visibility"`
	Settings    *models.JSONMap `json:"settings"`
}

// CreateProject handles POST /me/projects
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate visibility if provided
	if req.Visibility != nil && *req.Visibility != "private" && *req.Visibility != "public" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Visibility must be 'private' or 'public'"})
		return
	}

	// Generate project key hash from path or create a unique one
	projectKeyHash := ""
	if req.Path != nil {
		projectKeyHash = fmt.Sprintf("%x", sha256.Sum256([]byte(*req.Path)))
	} else {
		// Generate a unique hash for projects without path (e.g., using user ID and timestamp)
		uniqueData := fmt.Sprintf("%s-%d", userID, time.Now().UnixNano())
		projectKeyHash = fmt.Sprintf("%x", sha256.Sum256([]byte(uniqueData)))
	}

	// Delete any existing project with the same user_id and project_key_hash to allow recreation
	h.db.DB.Unscoped().Where("user_id = ? AND project_key_hash = ?", userID, projectKeyHash).Delete(&models.Project{})

	// Create project
	project := models.Project{
		UserID:         userID,
		ProjectKeyHash: &projectKeyHash,
		Name:           req.Name,
		Visibility:     "private", // Default to private
		Settings:       req.Settings,
	}

	if req.Visibility != nil {
		project.Visibility = *req.Visibility
	}

	if err := h.db.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"project": project})
}

type ProjectHandler struct {
	db *database.Database
}

func NewProjectHandler(db *database.Database) *ProjectHandler {
	return &ProjectHandler{db: db}
}

type UpdateProjectRequest struct {
	Name       *string         `json:"name"`
	Visibility *string         `json:"visibility"`
	Settings   *models.JSONMap `json:"settings"`
}

// GetProjects handles GET /me/projects
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var projects []models.Project
	query := h.db.DB.Where("user_id = ?", userID).
		Preload("Scans", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(1)
		}).
		Preload("GitHubLinks").
		Order("created_at DESC")

	if err := query.Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"projects": projects})
}

// GetProject handles GET /me/projects/:id
func (h *ProjectHandler) GetProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).
		Preload("GitHubLinks").
		First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"project": project})
}

// UpdateProject handles PATCH /me/projects/:id
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate visibility if provided
	if req.Visibility != nil && *req.Visibility != "private" && *req.Visibility != "public" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Visibility must be 'private' or 'public'"})
		return
	}

	// Find and update project
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Visibility != nil {
		updates["visibility"] = *req.Visibility
	}
	if req.Settings != nil {
		updates["settings"] = *req.Settings
	}

	if err := h.db.DB.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}

	// Reload project with associations
	if err := h.db.DB.Where("id = ?", projectID).
		Preload("GitHubLinks").
		First(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"project": project})
}

// DeleteProject handles DELETE /me/projects/:id
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	projectID := c.Param("id")
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Soft delete the project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).Delete(&models.Project{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

// GetPublicProject handles GET /u/:handle/:project_id (public projects)
func (h *ProjectHandler) GetPublicProject(c *gin.Context) {
	handle := c.Param("handle")
	projectID := c.Param("project_id")

	// Find user by handle
	var profile models.Profile
	if err := h.db.DB.Where("handle = ? AND visibility = 'public'", handle).
		Preload("User").
		First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	// Find public project
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ? AND visibility = 'public'", projectID, profile.UserID).
		Preload("Scans", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(10)
		}).
		Preload("GitHubLinks").
		First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"project": project,
		"profile": profile,
	})
}

// GetProjectStats handles GET /me/projects/:id/stats (deprecated - use /details instead)
func (h *ProjectHandler) GetProjectStats(c *gin.Context) {
	// This function is deprecated - use GetProjectDetails instead
	c.Redirect(http.StatusMovedPermanently, "/me/projects/"+c.Param("id")+"/details")
}

// GetProjectDetails handles GET /me/projects/:id/details
func (h *ProjectHandler) GetProjectDetails(c *gin.Context) {
	projectID := c.Param("id")
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify project ownership and get basic project info
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).
		Preload("GitHubLinks").
		First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Get scan count
	var scanCount int64
	h.db.DB.Model(&models.Scan{}).Where("project_id = ?", projectID).Count(&scanCount)

	// Get latest scan
	var latestScan models.Scan
	latestScanExists := h.db.DB.Where("project_id = ?", projectID).
		Order("created_at DESC").
		First(&latestScan).Error == nil

	// Get language distribution from latest scan
	var languageStats []models.ScanLang
	if latestScanExists {
		h.db.DB.Where("scan_id = ?", latestScan.ID).
			Order("code DESC").
			Find(&languageStats)
	}

	// Get all scans with pagination
	var scans []models.Scan
	query := h.db.DB.Where("project_id = ?", projectID).
		Preload("ScanLangs").
		Order("created_at DESC")

	// Add pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	if err := query.Offset(offset).Limit(limit).Find(&scans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
		return
	}

	// Build response combining project info, scans, and statistics
	response := gin.H{
		"project": project,
		"scans":   scans,
		"stats": gin.H{
			"total_scans":    scanCount,
			"has_scans":      scanCount > 0,
			"language_stats": languageStats,
			"latest_scan":    nil,
		},
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
		},
	}

	if latestScanExists {
		response["stats"].(gin.H)["latest_scan"] = latestScan
	}

	c.JSON(http.StatusOK, response)
}

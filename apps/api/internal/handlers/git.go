package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GitHandler handles Git-related operations
type GitHandler struct {
	db *database.Database
}

// NewGitHandler creates a new Git handler
func NewGitHandler(db *database.Database) *GitHandler {
	return &GitHandler{db: db}
}

// LinkGitRepo links a Git repository to a project
// PATCH /api/projects/:id/git
func (h *GitHandler) LinkGitRepo(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	type LinkRequest struct {
		GitRepoURL  string  `json:"git_repo_url" binding:"required"`
		GitProvider *string `json:"git_provider"` // github, gitlab, local
	}

	var req LinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Update project with Git info
	provider := "local"
	if req.GitProvider != nil {
		provider = *req.GitProvider
	}

	updates := map[string]interface{}{
		"git_repo_url": req.GitRepoURL,
		"git_provider": provider,
	}

	if err := h.db.DB.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link repository"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Git repository linked successfully",
		"project": project,
	})
}

// UnlinkGitRepo removes Git repository link from a project
// DELETE /api/projects/:id/git
func (h *GitHandler) UnlinkGitRepo(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Clear Git fields
	updates := map[string]interface{}{
		"git_repo_url":    nil,
		"git_provider":    nil,
		"last_commit_sha": nil,
		"last_synced_at":  nil,
	}

	if err := h.db.DB.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink repository"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Git repository unlinked successfully"})
}

// GetCommitScans returns commit scans for a project
// GET /api/projects/:id/commits
func (h *GitHandler) GetCommitScans(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	limit := c.DefaultQuery("limit", "50")

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get commit scans
	var commitScans []models.CommitScan
	if err := h.db.DB.Where("project_id = ?", projectID).
		Order("commit_date DESC").
		Limit(50).
		Preload("CommitScanLangs").
		Find(&commitScans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch commit scans"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"commits": commitScans,
		"count":   len(commitScans),
		"limit":   limit,
	})
}

// GetCollaborators returns collaborators for a project
// GET /api/projects/:id/collaborators
func (h *GitHandler) GetCollaborators(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	// Verify project ownership or visibility
	var project models.Project
	query := h.db.DB.Where("id = ?", projectID)
	query = query.Where("user_id = ? OR visibility = ?", userID, "public")

	if err := query.First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get collaborators
	var collaborators []models.Collaborator
	if err := h.db.DB.Where("project_id = ?", projectID).
		Order("commits_count DESC").
		Find(&collaborators).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch collaborators"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"collaborators": collaborators,
		"count":         len(collaborators),
	})
}

// SyncCommit records a new commit scan
// POST /api/projects/:id/commits/sync
func (h *GitHandler) SyncCommit(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	type SyncRequest struct {
		CommitSHA     string                 `json:"commit_sha" binding:"required"`
		Branch        *string                `json:"branch"`
		CommitMessage *string                `json:"commit_message"`
		CommitAuthor  *string                `json:"commit_author"`
		CommitDate    time.Time              `json:"commit_date" binding:"required"`
		FilesChanged  int                    `json:"files_changed"`
		LinesAdded    int                    `json:"lines_added"`
		LinesDeleted  int                    `json:"lines_deleted"`
		Languages     map[string]interface{} `json:"languages"`
		MedianLines   float64                `json:"median_lines"`
		GapLines      float64                `json:"gap_lines"`
	}

	var req SyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check if commit already scanned
	var existing models.CommitScan
	if err := h.db.DB.Where("project_id = ? AND commit_sha = ?", projectID, req.CommitSHA).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{
			"message":     "Commit already scanned",
			"commit_scan": existing,
		})
		return
	}

	// Create commit scan
	commitScan := models.CommitScan{
		ProjectID:     projectID,
		CommitSHA:     req.CommitSHA,
		Branch:        req.Branch,
		CommitMessage: req.CommitMessage,
		CommitAuthor:  req.CommitAuthor,
		CommitDate:    req.CommitDate,
		FilesChanged:  req.FilesChanged,
		LinesAdded:    req.LinesAdded,
		LinesDeleted:  req.LinesDeleted,
		MedianLines:   req.MedianLines,
		GapLines:      req.GapLines,
	}

	if err := h.db.DB.Create(&commitScan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create commit scan"})
		return
	}

	// Create language stats
	for lang, stats := range req.Languages {
		statsMap := stats.(map[string]interface{})
		langScan := models.CommitScanLang{
			CommitScanID: commitScan.ID,
			Language:     lang,
			Files:        int(statsMap["files"].(float64)),
			Total:        int(statsMap["total"].(float64)),
			Comment:      int(statsMap["comment"].(float64)),
			Blank:        int(statsMap["blank"].(float64)),
			LinesAdded:   int(statsMap["lines_added"].(float64)),
			LinesDeleted: int(statsMap["lines_deleted"].(float64)),
		}
		h.db.DB.Create(&langScan)
	}

	// Update project's last commit
	h.db.DB.Model(&project).Updates(map[string]interface{}{
		"last_commit_sha": req.CommitSHA,
		"last_synced_at":  time.Now(),
	})

	// Update user activity for streaks
	h.db.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"last_activity_date": time.Now(),
		"total_commit_scans": gorm.Expr("total_commit_scans + 1"),
	})

	c.JSON(http.StatusOK, gin.H{
		"message":     "Commit synced successfully",
		"commit_scan": commitScan,
	})
}

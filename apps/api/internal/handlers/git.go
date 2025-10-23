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

// --- Permissions helpers ---
func (h *GitHandler) isProjectOwner(userID string, projectID string) (bool, error) {
	var count int64
	if err := h.db.DB.Model(&models.Project{}).Where("id = ? AND user_id = ?", projectID, userID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h *GitHandler) isProjectAdmin(userID string, projectID string) (bool, error) {
	// Owner is implicitly admin
	if ok, err := h.isProjectOwner(userID, projectID); err != nil {
		return false, err
	} else if ok {
		return true, nil
	}
	var count int64
	if err := h.db.DB.Model(&models.Collaborator{}).
		Where("project_id = ? AND user_id = ? AND role = ?", projectID, userID, "admin").
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h *GitHandler) isProjectCollaborator(userID string, projectID string) (bool, error) {
	var count int64
	if err := h.db.DB.Model(&models.Collaborator{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
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

	// Verify admin (owner or admin collaborator)
	var project models.Project
	if err := h.db.DB.Where("id = ?", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	isAdmin, err := h.isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
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

	// Verify membership (owner or collaborator) or public visibility
	var project models.Project
	if err := h.db.DB.Where("id = ?", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	permitted := project.Visibility == "public"
	if !permitted {
		if ok, err := h.isProjectOwner(userID.(string), projectID); err == nil && ok {
			permitted = true
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
			return
		}
		if !permitted {
			if ok, err := h.isProjectCollaborator(userID.(string), projectID); err == nil && ok {
				permitted = true
			} else if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
				return
			}
		}
	}
	if !permitted {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
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

// --- Collaborators management ---

// AddCollaborator adds a collaborator to the project
// POST /api/me/projects/:id/collaborators
func (h *GitHandler) AddCollaborator(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	type AddRequest struct {
		UserID      *string `json:"user_id"`
		GitUsername *string `json:"git_username"`
		GitEmail    *string `json:"git_email"`
		Role        *string `json:"role"` // admin | collaborator
	}

	var req AddRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Permission: owner or admin
	isAdmin, err := h.isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	// Validate input
	if req.UserID == nil && (req.GitUsername == nil || *req.GitUsername == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id or git_username is required"})
		return
	}
	role := "collaborator"
	if req.Role != nil && (*req.Role == "admin" || *req.Role == "collaborator") {
		role = *req.Role
	}

	// Upsert collaborator by user_id or git_username
	var collab models.Collaborator
	tx := h.db.DB.Where("project_id = ? AND (user_id = ? OR git_username = ?)", projectID, req.UserID, req.GitUsername).
		First(&collab)
	if tx.Error == nil {
		// Update existing
		updates := map[string]interface{}{"role": role}
		if req.GitEmail != nil {
			updates["git_email"] = *req.GitEmail
		}
		if err := h.db.DB.Model(&collab).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update collaborator"})
			return
		}
	} else if tx.Error == gorm.ErrRecordNotFound {
		// Create new
		collab = models.Collaborator{
			ProjectID: projectID,
			UserID:    req.UserID,
			GitUsername: func() string {
				if req.GitUsername != nil {
					return *req.GitUsername
				}
				return ""
			}(),
			GitEmail: req.GitEmail,
			Role:     role,
		}
		if err := h.db.DB.Create(&collab).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add collaborator"})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"collaborator": collab})
}

// UpdateCollaborator updates collaborator role
// PATCH /api/me/projects/:id/collaborators/:collab_id
func (h *GitHandler) UpdateCollaborator(c *gin.Context) {
	projectID := c.Param("id")
	collabID := c.Param("collab_id")
	userID, _ := c.Get("user_id")

	type UpdateRequest struct {
		Role *string `json:"role"`
	}
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Permission
	isAdmin, err := h.isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	// Load collaborator
	var collab models.Collaborator
	if err := h.db.DB.Where("id = ? AND project_id = ?", collabID, projectID).First(&collab).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Collaborator not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	updates := map[string]interface{}{}
	if req.Role != nil && (*req.Role == "admin" || *req.Role == "collaborator") {
		updates["role"] = *req.Role
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}
	if err := h.db.DB.Model(&collab).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update collaborator"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"collaborator": collab})
}

// RemoveCollaborator removes a collaborator from the project
// DELETE /api/me/projects/:id/collaborators/:collab_id
func (h *GitHandler) RemoveCollaborator(c *gin.Context) {
	projectID := c.Param("id")
	collabID := c.Param("collab_id")
	userID, _ := c.Get("user_id")

	isAdmin, err := h.isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	if err := h.db.DB.Where("id = ? AND project_id = ?", collabID, projectID).Delete(&models.Collaborator{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove collaborator"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Collaborator removed"})
}

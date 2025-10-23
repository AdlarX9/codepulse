package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"codepulse-api/internal/database"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type InviteHandler struct {
	db *database.Database
}

func NewInviteHandler(db *database.Database) *InviteHandler {
	return &InviteHandler{db: db}
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// CreateInvite creates an invite for a project (admin only)
func (h *InviteHandler) CreateInvite(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	type Req struct {
		Email       *string `json:"email"`
		GitUsername *string `json:"git_username"`
		Role        *string `json:"role"` // admin | collaborator
		ExpiresIn   *int    `json:"expires_in_days"`
	}
	var req Req
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Permission: owner or admin
	isAdmin, err := NewGitHandler(h.db).isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	role := "collaborator"
	if req.Role != nil && (*req.Role == "admin" || *req.Role == "collaborator") {
		role = *req.Role
	}
	tkn, err := randomToken(16)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	var expires *time.Time
	if req.ExpiresIn != nil && *req.ExpiresIn > 0 {
		e := time.Now().Add(time.Duration(*req.ExpiresIn) * 24 * time.Hour)
		expires = &e
	} else {
		e := time.Now().Add(14 * 24 * time.Hour)
		expires = &e
	}

	invite := models.Invite{
		ProjectID:     projectID,
		InviterUserID: userID.(string),
		InviteeUserID: nil,
		Email:         req.Email,
		GitUsername:   req.GitUsername,
		Role:          role,
		Token:         tkn,
		Status:        "pending",
		ExpiresAt:     expires,
	}
	if err := h.db.DB.Create(&invite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invite"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"invite": invite})
}

// ListInvites lists invites for a project (admin only)
func (h *InviteHandler) ListInvites(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")

	isAdmin, err := NewGitHandler(h.db).isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	var invites []models.Invite
	if err := h.db.DB.Where("project_id = ? AND status = ?", projectID, "pending").Order("created_at DESC").Find(&invites).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invites"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"invites": invites})
}

// RevokeInvite revokes an invite (admin only)
func (h *InviteHandler) RevokeInvite(c *gin.Context) {
	projectID := c.Param("id")
	inviteID := c.Param("invite_id")
	userID, _ := c.Get("user_id")

	isAdmin, err := NewGitHandler(h.db).isProjectAdmin(userID.(string), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized"})
		return
	}

	if err := h.db.DB.Model(&models.Invite{}).Where("id = ? AND project_id = ?", inviteID, projectID).Update("status", "revoked").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke invite"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Invite revoked"})
}

// GetInvitePublic returns invite info by token (public)
func (h *InviteHandler) GetInvitePublic(c *gin.Context) {
	token := c.Param("token")
	var invite models.Invite
	if err := h.db.DB.Where("token = ? AND status = ?", token, "pending").First(&invite).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invite not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if invite.ExpiresAt != nil && time.Now().After(*invite.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invite expired"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"invite": gin.H{"project_id": invite.ProjectID, "role": invite.Role}})
}

// AcceptInvite accepts an invite (requires auth)
func (h *InviteHandler) AcceptInvite(c *gin.Context) {
	token := c.Param("token")
	userID, _ := c.Get("user_id")

	var invite models.Invite
	if err := h.db.DB.Where("token = ? AND status = ?", token, "pending").First(&invite).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invite not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if invite.ExpiresAt != nil && time.Now().After(*invite.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invite expired"})
		return
	}

	// Add collaborator or upsert
	var collab models.Collaborator
	tx := h.db.DB.Where("project_id = ? AND user_id = ?", invite.ProjectID, userID.(string)).First(&collab)
	if tx.Error == nil {
		// Update role if needed
		if collab.Role != invite.Role {
			if err := h.db.DB.Model(&collab).Update("role", invite.Role).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update collaborator"})
				return
			}
		}
	} else if tx.Error == gorm.ErrRecordNotFound {
		// Create new collaborator
		username := ""
		if invite.GitUsername != nil {
			username = *invite.GitUsername
		}
		collab = models.Collaborator{
			ProjectID:   invite.ProjectID,
			UserID:      ptr(userID.(string)),
			GitUsername: username,
			Role:        invite.Role,
		}
		if err := h.db.DB.Create(&collab).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add collaborator"})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Mark invite accepted
	if err := h.db.DB.Model(&invite).Updates(map[string]interface{}{"status": "accepted", "invitee_user_id": userID.(string)}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark invite accepted"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invite accepted"})
}

func ptr[T any](v T) *T { return &v }

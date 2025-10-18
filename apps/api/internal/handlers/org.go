package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/email"
	"codepulse-api/internal/models"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gosimple/slug"
)

type OrgHandler struct {
	db           *database.Database
	emailService *email.Service
}

func NewOrgHandler(db *database.Database, emailService *email.Service) *OrgHandler {
	return &OrgHandler{db: db, emailService: emailService}
}

// CreateOrg creates a new organization
func (h *OrgHandler) CreateOrg(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Name string `json:"name" binding:"required"`
		Slug string `json:"slug"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate slug if not provided
	orgSlug := req.Slug
	if orgSlug == "" {
		orgSlug = slug.Make(req.Name)
	} else {
		orgSlug = slug.Make(orgSlug)
	}

	// Create organization
	org := models.Organization{
		Name: req.Name,
		Slug: orgSlug,
	}

	if err := h.db.DB.Create(&org).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "Organization slug already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organization"})
		return
	}

	// Create owner membership
	membership := models.Membership{
		OrgID:  org.ID,
		UserID: userID.(string),
		Role:   "owner",
	}

	if err := h.db.DB.Create(&membership).Error; err != nil {
		// Rollback: delete org if membership creation fails
		h.db.DB.Delete(&org)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create membership"})
		return
	}

	// Create default free subscription
	subscription := models.Subscription{
		OrgID:  org.ID,
		Plan:   "free",
		Seats:  1,
		Status: "active",
	}

	if err := h.db.DB.Create(&subscription).Error; err != nil {
		// Log error but don't fail the request
		log.Printf("failed creating default subscription for org %s: %v", org.ID, err)
	}

	c.JSON(http.StatusCreated, org)
}

// GetUserOrgs returns all organizations for the current user
func (h *OrgHandler) GetUserOrgs(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var memberships []models.Membership
	if err := h.db.DB.Where("user_id = ?", userID).
		Preload("Organization").
		Preload("Organization.Subscriptions", "deleted_at IS NULL").
		Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch organizations"})
		return
	}

	// Extract organizations with role
	type OrgWithRole struct {
		models.Organization
		Role         string               `json:"role"`
		Subscription *models.Subscription `json:"subscription,omitempty"`
	}

	orgs := make([]OrgWithRole, len(memberships))
	for i, m := range memberships {
		orgs[i] = OrgWithRole{
			Organization: *m.Organization,
			Role:         m.Role,
		}
		if len(m.Organization.Subscriptions) > 0 {
			orgs[i].Subscription = &m.Organization.Subscriptions[0]
		}
	}

	c.JSON(http.StatusOK, orgs)
}

// GetOrg returns a specific organization
func (h *OrgHandler) GetOrg(c *gin.Context) {
	orgID := c.Param("id")
	userID, _ := c.Get("user_id")

	// Verify membership
	var membership models.Membership
	if err := h.db.DB.Where("org_id = ? AND user_id = ?", orgID, userID).
		First(&membership).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	var org models.Organization
	if err := h.db.DB.Where("id = ?", orgID).
		Preload("Subscriptions", "deleted_at IS NULL").
		First(&org).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"organization": org,
		"role":         membership.Role,
	})
}

// UpdateOrg updates organization details (owner/admin only)
func (h *OrgHandler) UpdateOrg(c *gin.Context) {
	orgID := c.Param("id")

	var req struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var org models.Organization
	if err := h.db.DB.Where("id = ?", orgID).First(&org).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	if req.Name != "" {
		org.Name = req.Name
	}
	if req.Slug != "" {
		org.Slug = slug.Make(req.Slug)
	}

	if err := h.db.DB.Save(&org).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organization"})
		return
	}

	c.JSON(http.StatusOK, org)
}

// GetMembers returns all members of an organization
func (h *OrgHandler) GetMembers(c *gin.Context) {
	orgID := c.Param("id")

	var memberships []models.Membership
	if err := h.db.DB.Where("org_id = ?", orgID).
		Preload("User").
		Preload("User.Profile").
		Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}

	c.JSON(http.StatusOK, memberships)
}

// InviteMember invites a user to the organization (owner/admin only)
func (h *OrgHandler) InviteMember(c *gin.Context) {
	orgID := c.Param("id")

	var req struct {
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role" binding:"required,oneof=admin member"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := h.db.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already a member
	var existingMembership models.Membership
	if err := h.db.DB.Where("org_id = ? AND user_id = ?", orgID, user.ID).
		First(&existingMembership).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already a member"})
		return
	}

	// Create membership
	membership := models.Membership{
		OrgID:  orgID,
		UserID: user.ID,
		Role:   req.Role,
	}

	if err := h.db.DB.Create(&membership).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create membership"})
		return
	}

	// Send invitation email (best effort)
	if h.emailService != nil {
		// Fetch org name
		var org models.Organization
		_ = h.db.DB.Where("id = ?", orgID).First(&org).Error

		inviterName := user.Email
		if u, ok := c.Get("user"); ok {
			if current, ok2 := u.(*models.User); ok2 && current.Email != "" {
				inviterName = current.Email
			}
		}

		_ = h.emailService.SendInvitation(user.Email, email.InvitationData{
			InviterName: inviterName,
			OrgName:     org.Name,
			Role:        req.Role,
			AcceptURL:   "https://app.codepulse.dev/orgs/" + orgID + "/team",
		})
	}

	c.JSON(http.StatusCreated, membership)
}

// UpdateMemberRole updates a member's role (owner/admin only)
func (h *OrgHandler) UpdateMemberRole(c *gin.Context) {
	orgID := c.Param("id")
	userID := c.Param("user_id")

	var req struct {
		Role string `json:"role" binding:"required,oneof=owner admin member"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var membership models.Membership
	if err := h.db.DB.Where("org_id = ? AND user_id = ?", orgID, userID).
		First(&membership).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Membership not found"})
		return
	}

	membership.Role = req.Role

	if err := h.db.DB.Save(&membership).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	c.JSON(http.StatusOK, membership)
}

// RemoveMember removes a member from the organization (owner/admin only)
func (h *OrgHandler) RemoveMember(c *gin.Context) {
	orgID := c.Param("id")
	userID := c.Param("user_id")
	currentUserID, _ := c.Get("user_id")

	// Prevent self-removal
	if userID == currentUserID.(string) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove yourself"})
		return
	}

	var membership models.Membership
	if err := h.db.DB.Where("org_id = ? AND user_id = ?", orgID, userID).
		First(&membership).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Membership not found"})
		return
	}

	// Soft delete
	if err := h.db.DB.Delete(&membership).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

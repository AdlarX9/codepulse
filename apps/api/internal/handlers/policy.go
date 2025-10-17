package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PolicyHandler struct {
	db *database.Database
}

func NewPolicyHandler(db *database.Database) *PolicyHandler {
	return &PolicyHandler{db: db}
}

// GetPolicies returns all quality budgets for an organization
func (h *PolicyHandler) GetPolicies(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var policies []models.QualityBudget
	query := h.db.DB.Where("org_id = ?", orgID)

	// Optional filters
	if scope := c.Query("scope"); scope != "" {
		query = query.Where("scope = ?", scope)
	}
	if refID := c.Query("ref_id"); refID != "" {
		query = query.Where("ref_id = ?", refID)
	}

	if err := query.Find(&policies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch policies"})
		return
	}

	c.JSON(http.StatusOK, policies)
}

// GetPolicy returns a specific quality budget
func (h *PolicyHandler) GetPolicy(c *gin.Context) {
	policyID := c.Param("id")
	orgID, _ := c.Get("org_id")

	var policy models.QualityBudget
	if err := h.db.DB.Where("id = ? AND org_id = ?", policyID, orgID).
		First(&policy).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Policy not found"})
		return
	}

	c.JSON(http.StatusOK, policy)
}

// CreatePolicy creates a new quality budget
func (h *PolicyHandler) CreatePolicy(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var req struct {
		Scope      string                 `json:"scope" binding:"required,oneof=org repo project"`
		RefID      *string                `json:"ref_id"`
		Name       string                 `json:"name" binding:"required"`
		Thresholds map[string]interface{} `json:"thresholds" binding:"required"`
		Mode       string                 `json:"mode" binding:"oneof=soft hard"`
		Enabled    *bool                  `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default values
	mode := "soft"
	if req.Mode != "" {
		mode = req.Mode
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	thresholds := models.JSONMap(req.Thresholds)

	policy := models.QualityBudget{
		OrgID:      orgID.(string),
		Scope:      req.Scope,
		RefID:      req.RefID,
		Name:       req.Name,
		Thresholds: &thresholds,
		Mode:       mode,
		Enabled:    enabled,
	}

	if err := h.db.DB.Create(&policy).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create policy"})
		return
	}

	c.JSON(http.StatusCreated, policy)
}

// UpdatePolicy updates a quality budget
func (h *PolicyHandler) UpdatePolicy(c *gin.Context) {
	policyID := c.Param("id")
	orgID, _ := c.Get("org_id")

	var policy models.QualityBudget
	if err := h.db.DB.Where("id = ? AND org_id = ?", policyID, orgID).
		First(&policy).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Policy not found"})
		return
	}

	var req struct {
		Name       *string                 `json:"name"`
		Thresholds *map[string]interface{} `json:"thresholds"`
		Mode       *string                 `json:"mode" binding:"omitempty,oneof=soft hard"`
		Enabled    *bool                   `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != nil {
		policy.Name = *req.Name
	}
	if req.Thresholds != nil {
		thresholds := models.JSONMap(*req.Thresholds)
		policy.Thresholds = &thresholds
	}
	if req.Mode != nil {
		policy.Mode = *req.Mode
	}
	if req.Enabled != nil {
		policy.Enabled = *req.Enabled
	}

	if err := h.db.DB.Save(&policy).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update policy"})
		return
	}

	c.JSON(http.StatusOK, policy)
}

// DeletePolicy deletes a quality budget
func (h *PolicyHandler) DeletePolicy(c *gin.Context) {
	policyID := c.Param("id")
	orgID, _ := c.Get("org_id")

	var policy models.QualityBudget
	if err := h.db.DB.Where("id = ? AND org_id = ?", policyID, orgID).
		First(&policy).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Policy not found"})
		return
	}

	if err := h.db.DB.Delete(&policy).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete policy"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Policy deleted successfully"})
}

package middleware

import (
	"codepulse-api/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// OrgContextMiddleware resolves organization context from header or user default
type OrgContextMiddleware struct {
	db *gorm.DB
}

// NewOrgContextMiddleware creates a new org context middleware
func NewOrgContextMiddleware(db *gorm.DB) *OrgContextMiddleware {
	return &OrgContextMiddleware{db: db}
}

// ResolveOrg resolves the organization from X-Codepulse-Org header or user's default
func (m *OrgContextMiddleware) ResolveOrg() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		// Try to get org_id from header
		orgIDHeader := c.GetHeader("X-Codepulse-Org")

		var membership models.Membership
		var err error

		if orgIDHeader != "" {
			// Verify user has access to this org
			err = m.db.Where("org_id = ? AND user_id = ?", orgIDHeader, userID).
				Preload("Organization").
				First(&membership).Error
		} else {
			// Get user's first organization (default)
			err = m.db.Where("user_id = ?", userID).
				Preload("Organization").
				Order("created_at ASC").
				First(&membership).Error
		}

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No organization found"})
			c.Abort()
			return
		}

		// Set context
		c.Set("org_id", membership.OrgID)
		c.Set("org", membership.Organization)
		c.Set("membership", &membership)
		c.Set("user_role", membership.Role)

		c.Next()
	}
}

// RequireRole checks if the user has the required role in the organization
func (m *OrgContextMiddleware) RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "No role found in context"})
			c.Abort()
			return
		}

		userRole := role.(string)
		allowed := false
		for _, r := range allowedRoles {
			if userRole == r {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireOwner is a convenience method that requires owner role
func (m *OrgContextMiddleware) RequireOwner() gin.HandlerFunc {
	return m.RequireRole("owner")
}

// RequireAdmin requires owner or admin role
func (m *OrgContextMiddleware) RequireAdmin() gin.HandlerFunc {
	return m.RequireRole("owner", "admin")
}

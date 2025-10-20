package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"codepulse-api/internal/database"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// OGHandler handles Open Graph image generation
type OGHandler struct {
	db *database.Database
}

// NewOGHandler creates a new OG handler
func NewOGHandler(db *database.Database) *OGHandler {
	return &OGHandler{db: db}
}

// GenerateProjectOG generates an Open Graph image for a project
// GET /api/og/project/:id?handle=username
func (h *OGHandler) GenerateProjectOG(c *gin.Context) {
	projectID := c.Param("id")
	handle := c.Query("handle")

	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project ID is required"})
		return
	}

	// Build query for project data
	query := h.db.DB.Preload("Scans", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC").Limit(1)
	}).Preload("Scans.ScanLangs").Preload("Profile")

	if handle != "" {
		query = query.Joins("JOIN profiles ON profiles.user_id = projects.user_id").
			Where("profiles.handle = ?", handle)
	}

	query = query.Where("projects.id = ? AND projects.visibility = ?", projectID, "public")

	var project models.Project
	if err := query.First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch project"})
		return
	}

	// Get latest scan data
	var latestScan *models.Scan
	if len(project.Scans) > 0 {
		latestScan = &project.Scans[0]
	}

	// Generate simple text-based response for now
	// In production, you'd use a library like go-rod or puppeteer to generate actual images
	projectName := "Untitled Project"
	if project.Name != nil {
		projectName = *project.Name
	}

	// Create a simple SVG as placeholder
	svg := h.generateProjectOGSVG(projectName, latestScan)

	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "public, max-age=3600") // Cache for 1 hour
	c.Data(http.StatusOK, "image/svg+xml", []byte(svg))
}

func (h *OGHandler) generateProjectOGSVG(projectName string, scan *models.Scan) string {
	// Simple SVG template for project OG image
	svg := `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="#1f2937"/>

  <!-- CodePulse Logo -->
  <circle cx="100" cy="100" r="60" fill="#3b82f6" opacity="0.8"/>
  <text x="100" y="110" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">CP</text>

  <!-- Project Title -->
  <text x="200" y="80" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">` + projectName + `</text>`

	if scan != nil {
		total := scan.GetTotal()
		code := scan.GetCode()
		svg += fmt.Sprintf(`
  <!-- Stats -->
  <text x="200" y="120" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">Latest Scan</text>

  <!-- Total Lines -->
  <text x="200" y="160" font-family="Arial, sans-serif" font-size="20" fill="white">%s total lines</text>

  <!-- Code vs Comments -->
  <rect x="200" y="180" width="300" height="20" fill="#374151" rx="10"/>
  <rect x="200" y="180" width="%.1f" height="20" fill="#3b82f6" rx="10"/>
  <text x="520" y="195" font-family="Arial, sans-serif" font-size="16" fill="white">%.1f%% code</text>`,
			formatNumber(total),
			func() float64 {
				if total == 0 {
					return 0
				}
				return float64(code) / float64(total) * 300
			}(),
			func() float64 {
				if total == 0 {
					return 0
				}
				return float64(code) / float64(total) * 100
			}(),
		)

		// Top languages (if available)
		if len(scan.ScanLangs) > 0 {
			svg += `<text x="200" y="240" font-family="Arial, sans-serif" font-size="20" fill="#9ca3af">Top Languages:</text>`

			for i, lang := range scan.ScanLangs {
				if i >= 3 { // Show top 3 only
					break
				}
				y := 270 + i*25
				percentage := func() float64 {
					if total == 0 {
						return 0
					}
					return float64(lang.Total) / float64(total) * 100
				}()

				svg += fmt.Sprintf(`
  <rect x="200" y="%d" width="200" height="15" fill="#374151" rx="7"/>
  <rect x="200" y="%d" width="%.1f" height="15" fill="#10b981" rx="7"/>
  <text x="420" y="%d" font-family="Arial, sans-serif" font-size="14" fill="white">%s (%.1f%%)</text>`,
					y, y, percentage*2, y+12, lang.Language, percentage,
				)
			}
		}
	}

	svg += `
  <!-- Footer -->
  <text x="1000" y="600" font-family="Arial, sans-serif" font-size="18" fill="#6b7280" text-anchor="end">codepulse.app</text>
</svg>`

	return svg
}

func formatNumber(n int) string {
	if n >= 1000000 {
		return strconv.FormatFloat(float64(n)/1000000, 'f', 1, 64) + "M"
	}
	if n >= 1000 {
		return strconv.FormatFloat(float64(n)/1000, 'f', 1, 64) + "K"
	}
	return strconv.Itoa(n)
}

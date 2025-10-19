package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type StatsHandler struct {
	db *database.Database
}

func NewStatsHandler(db *database.Database) *StatsHandler {
	return &StatsHandler{db: db}
}

// GetOrgStats returns aggregated stats for an organization
func (h *StatsHandler) GetOrgStats(c *gin.Context) {
	orgID, _ := c.Get("org_id")
	window := c.DefaultQuery("window", "30d")

	// Calculate time range
	now := time.Now()
	var since time.Time
	switch window {
	case "7d":
		since = now.AddDate(0, 0, -7)
	case "30d":
		since = now.AddDate(0, 0, -30)
	case "90d":
		since = now.AddDate(0, 0, -90)
	default:
		since = now.AddDate(0, 0, -30)
	}

	// Get all repositories for this org
	var repos []models.Repository
	if err := h.db.DB.Where("org_id = ?", orgID).Find(&repos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repositories"})
		return
	}

	// Aggregate scans (organization-wide)
	var scans []models.Scan
	if err := h.db.DB.Where("created_at >= ?", since).
		Order("created_at ASC").
		Preload("ScanLangs").
		Find(&scans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
		return
	}

	// Calculate aggregated metrics
	stats := h.calculateAggregateStats(scans)
	stats["window"] = window
	stats["repository_count"] = len(repos)
	stats["scan_count"] = len(scans)

	c.JSON(http.StatusOK, stats)
}

// GetRepoStats returns stats for a specific repository
func (h *StatsHandler) GetRepoStats(c *gin.Context) {
	repoID := c.Param("id")
	orgID, _ := c.Get("org_id")
	window := c.DefaultQuery("window", "30d")

	// Verify repo belongs to org
	var repo models.Repository
	if err := h.db.DB.Where("id = ? AND org_id = ?", repoID, orgID).First(&repo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Repository not found"})
		return
	}

	// Calculate time range
	now := time.Now()
	var since time.Time
	switch window {
	case "7d":
		since = now.AddDate(0, 0, -7)
	case "30d":
		since = now.AddDate(0, 0, -30)
	case "90d":
		since = now.AddDate(0, 0, -90)
	default:
		since = now.AddDate(0, 0, -30)
	}

	// Get scans for time window (repository-scoped stats no longer supported; falling back to window only)
	var scans []models.Scan
	if err := h.db.DB.Where("created_at >= ?", since).
		Order("created_at ASC").
		Preload("ScanLangs").
		Find(&scans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
		return
	}

	stats := h.calculateAggregateStats(scans)
	stats["window"] = window
	stats["repository"] = repo
	stats["scan_count"] = len(scans)

	// Add language breakdown
	stats["languages"] = h.getLanguageBreakdown(scans)

	c.JSON(http.StatusOK, stats)
}

// GetProjectStats returns stats for a specific project
func (h *StatsHandler) GetProjectStats(c *gin.Context) {
	projectID := c.Param("id")
	userID, _ := c.Get("user_id")
	window := c.DefaultQuery("window", "30d")

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Calculate time range
	now := time.Now()
	var since time.Time
	switch window {
	case "7d":
		since = now.AddDate(0, 0, -7)
	case "30d":
		since = now.AddDate(0, 0, -30)
	case "90d":
		since = now.AddDate(0, 0, -90)
	default:
		since = now.AddDate(0, 0, -30)
	}

	// Get scans
	var scans []models.Scan
	if err := h.db.DB.Where("project_id = ? AND created_at >= ?", projectID, since).
		Order("created_at ASC").
		Preload("ScanLangs").
		Find(&scans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
		return
	}

	stats := h.calculateAggregateStats(scans)
	stats["window"] = window
	stats["project"] = project
	stats["scan_count"] = len(scans)
	stats["languages"] = h.getLanguageBreakdown(scans)

	c.JSON(http.StatusOK, stats)
}

// calculateAggregateStats computes aggregate metrics from scans
func (h *StatsHandler) calculateAggregateStats(scans []models.Scan) map[string]interface{} {
	if len(scans) == 0 {
		return map[string]interface{}{
			"avg_comment_ratio": 0,
			"avg_bloat_ratio":   0,
			"avg_doc_coverage":  0,
			"total_lines":       0,
			"total_code":        0,
			"total_comment":     0,
			"trend":             []interface{}{},
		}
	}

	totalCommentRatio := 0.0
	totalBloatRatio := 0.0
	totalDocCoverage := 0.0
	totalLines := 0
	totalCode := 0
	totalComment := 0
	totalCore := 0
	totalInfo := 0

	trend := []map[string]interface{}{}

	for _, scan := range scans {
		total := scan.GetTotal()
		code := scan.GetCode()
		comment := scan.GetComment()
		core := scan.GetCoreCodeLines()
		info := scan.GetInfoLines()

		ratio := 0.0
		if code > 0 {
			ratio = float64(comment) / float64(code)
		}

		totalCommentRatio += ratio
		totalLines += total
		totalCode += code
		totalComment += comment
		totalCore += core
		totalInfo += info

		bloatRatio := 0.0
		if code > 0 {
			bloatRatio = float64(info) / float64(code)
		}
		totalBloatRatio += bloatRatio

		docCoverage := 0.0
		if core > 0 {
			docCoverage = float64(comment) / float64(core)
		}
		totalDocCoverage += docCoverage

		// Add to trend
		trend = append(trend, map[string]interface{}{
			"date":          scan.CreatedAt.Format("2006-01-02"),
			"code":          code,
			"comment":       comment,
			"comment_ratio": ratio,
			"bloat_ratio":   bloatRatio,
			"doc_coverage":  docCoverage,
		})
	}

	count := float64(len(scans))

	return map[string]interface{}{
		"avg_comment_ratio": totalCommentRatio / count,
		"avg_bloat_ratio":   totalBloatRatio / count,
		"avg_doc_coverage":  totalDocCoverage / count,
		"total_lines":       totalLines,
		"total_code":        totalCode,
		"total_comment":     totalComment,
		"total_core":        totalCore,
		"total_info":        totalInfo,
		"trend":             trend,
	}
}

// getLanguageBreakdown returns language statistics
func (h *StatsHandler) getLanguageBreakdown(scans []models.Scan) map[string]interface{} {
	langStats := make(map[string]map[string]int)

	for _, scan := range scans {
		for _, lang := range scan.ScanLangs {
			if _, exists := langStats[lang.Language]; !exists {
				langStats[lang.Language] = map[string]int{
					"files":   0,
					"total":   0,
					"code":    0,
					"comment": 0,
					"blank":   0,
				}
			}
			code := lang.Total - lang.Comment - lang.Blank
			langStats[lang.Language]["files"] += lang.Files
			langStats[lang.Language]["total"] += lang.Total
			langStats[lang.Language]["code"] += code
			langStats[lang.Language]["comment"] += lang.Comment
			langStats[lang.Language]["blank"] += lang.Blank
		}
	}

	result := make(map[string]interface{})
	for lang, stats := range langStats {
		result[lang] = stats
	}

	return result
}

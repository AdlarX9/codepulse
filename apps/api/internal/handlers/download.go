package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// DownloadHandler handles download-related endpoints
type DownloadHandler struct {
	db *database.Database
}

// NewDownloadHandler creates a new download handler
func NewDownloadHandler(db *database.Database) *DownloadHandler {
	return &DownloadHandler{db: db}
}

// DownloadAsset handles asset downloads with tracking
// GET /api/download?platform=mac&version=v1.0.0
func (h *DownloadHandler) DownloadAsset(c *gin.Context) {
	platform := c.Query("platform")
	version := c.Query("version")

	if platform == "" {
		platform = "mac"
	}
	if version == "" {
		version = "latest"
	}

	// Validate platform
	validPlatforms := map[string]bool{
		"mac":   true,
		"win":   true,
		"linux": true,
	}

	if !validPlatforms[platform] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid platform"})
		return
	}

	// Extract tracking data from headers (like Vercel does)
	country := c.GetHeader("x-vercel-ip-country")
	if country == "" {
		country = c.GetHeader("cf-ipcountry")
	}

	city := c.GetHeader("x-vercel-ip-city")
	if city == "" {
		city = c.GetHeader("cf-ipcity")
	}

	region := c.GetHeader("x-vercel-ip-country-region")
	userAgent := c.GetHeader("user-agent")
	referrer := c.GetHeader("referer")
	realIP := c.GetHeader("x-real-ip")
	if realIP == "" {
		realIP = c.GetHeader("x-forwarded-for")
		if realIP != "" {
			// Take the first IP if there are multiple
			realIP = strings.Split(realIP, ",")[0]
		}
	}

	// Hash IP address for privacy (this should use the same salt as Next.js)
	ipHash := ""
	if realIP != "" {
		hash := sha256.Sum256([]byte(realIP + "your-download-salt"))
		ipHash = hex.EncodeToString(hash[:])
	}

	// Create download record
	download := models.Download{
		Platform:  platform,
		Version:   version,
		Country:   &country,
		Region:    &region,
		City:      &city,
		Referrer:  &referrer,
		UserAgent: &userAgent,
		IPHash:    &ipHash,
		CreatedAt: time.Now(),
	}

	if err := h.db.DB.Create(&download).Error; err != nil {
		log.Printf("Failed to record download: %v", err)
		// Don't fail the request if tracking fails
	}

	// TODO: Implement asset URL resolution based on platform/version
	// For now, return a placeholder response
	c.JSON(http.StatusNotImplemented, gin.H{
		"error":    "Asset resolution not yet implemented",
		"platform": platform,
		"version":  version,
	})
}

// GetDownloadStats handles admin download statistics
// GET /api/admin/stats?period=30
func (h *DownloadHandler) GetDownloadStats(c *gin.Context) {
	// Calculate start date (default 30 days)
	startDate := time.Now().AddDate(0, 0, -30)

	var totalDownloads int64
	var platformStats []struct {
		Platform string `json:"platform"`
		Count    int64  `json:"count"`
	}
	var countryStats []struct {
		Country string `json:"country"`
		Count   int64  `json:"count"`
	}
	var versionStats []struct {
		Version string `json:"version"`
		Count   int64  `json:"count"`
	}

	// Total downloads
	h.db.DB.Model(&models.Download{}).Where("created_at >= ?", startDate).Count(&totalDownloads)

	// Platform breakdown
	h.db.DB.Model(&models.Download{}).
		Select("platform, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("platform").
		Scan(&platformStats)

	// Country breakdown (top 10)
	h.db.DB.Model(&models.Download{}).
		Select("COALESCE(country, 'Unknown') as country, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("country").
		Order("count DESC").
		Limit(10).
		Scan(&countryStats)

	// Version breakdown
	h.db.DB.Model(&models.Download{}).
		Select("version, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("version").
		Order("count DESC").
		Scan(&versionStats)

	// Daily trend (last 30 days)
	var trendStats []struct {
		Date  string `json:"date"`
		Count int64  `json:"downloads"`
	}

	h.db.DB.Model(&models.Download{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date").
		Scan(&trendStats)

	c.JSON(http.StatusOK, gin.H{
		"downloads": gin.H{
			"total":       totalDownloads,
			"by_platform": h.groupByPlatform(platformStats),
			"by_country":  h.groupByCountry(countryStats),
			"by_version":  h.groupByVersion(versionStats),
			"trend":       trendStats,
		},
	})
}

func (h *DownloadHandler) groupByPlatform(stats []struct {
	Platform string `json:"platform"`
	Count    int64  `json:"count"`
}) map[string]int64 {
	result := make(map[string]int64)
	for _, stat := range stats {
		result[stat.Platform] = stat.Count
	}
	return result
}

func (h *DownloadHandler) groupByCountry(stats []struct {
	Country string `json:"country"`
	Count   int64  `json:"count"`
}) map[string]int64 {
	result := make(map[string]int64)
	for _, stat := range stats {
		result[stat.Country] = stat.Count
	}
	return result
}

func (h *DownloadHandler) groupByVersion(stats []struct {
	Version string `json:"version"`
	Count   int64  `json:"count"`
}) map[string]int64 {
	result := make(map[string]int64)
	for _, stat := range stats {
		result[stat.Version] = stat.Count
	}
	return result
}

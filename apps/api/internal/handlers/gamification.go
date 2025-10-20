package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GamificationHandler handles gamification features (streaks, challenges, badges)
type GamificationHandler struct {
	db *database.Database
}

// NewGamificationHandler creates a new gamification handler
func NewGamificationHandler(db *database.Database) *GamificationHandler {
	return &GamificationHandler{db: db}
}

// GetUserStreaks returns the user's streak information
// GET /api/me/streaks
func (h *GamificationHandler) GetUserStreaks(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"current_streak":     user.CurrentStreak,
		"longest_streak":     user.LongestStreak,
		"last_activity_date": user.LastActivityDate,
		"total_commit_scans": user.TotalCommitScans,
	})
}

// GetUserBadges returns the user's earned badges
// GET /api/me/badges
func (h *GamificationHandler) GetUserBadges(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	badges := []string{}
	if user.Badges != nil {
		// Extract badge list from JSONMap
		if badgeList, ok := (*user.Badges)["badges"].([]interface{}); ok {
			for _, badge := range badgeList {
				if badgeStr, ok := badge.(string); ok {
					badges = append(badges, badgeStr)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"badges": badges,
		"count":  len(badges),
	})
}

// GetChallenges returns user's challenges
// GET /api/me/challenges
func (h *GamificationHandler) GetChallenges(c *gin.Context) {
	userID, _ := c.Get("user_id")
	status := c.DefaultQuery("status", "active") // active, completed, failed, expired

	var challenges []models.Challenge
	query := h.db.DB.Where("user_id = ?", userID)

	if status != "all" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&challenges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch challenges"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"challenges": challenges,
		"count":      len(challenges),
	})
}

// CreateChallenge creates a new challenge for the user
// POST /api/me/challenges
func (h *GamificationHandler) CreateChallenge(c *gin.Context) {
	userID, _ := c.Get("user_id")

	type CreateChallengeRequest struct {
		ProjectID    *string                `json:"project_id"`
		Type         string                 `json:"type" binding:"required"` // weekly_commits, reduce_debt, throughput_boost
		Title        string                 `json:"title" binding:"required"`
		Description  *string                `json:"description"`
		Target       map[string]interface{} `json:"target" binding:"required"`
		DurationDays int                    `json:"duration_days" binding:"required"`
	}

	var req CreateChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate project ownership if project_id provided
	if req.ProjectID != nil {
		var project models.Project
		if err := h.db.DB.Where("id = ? AND user_id = ?", *req.ProjectID, userID).First(&project).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
	}

	now := time.Now()
	targetMap := models.JSONMap(req.Target)
	progressMap := models.JSONMap(map[string]interface{}{})

	challenge := models.Challenge{
		UserID:      userID.(string),
		ProjectID:   req.ProjectID,
		Type:        req.Type,
		Title:       req.Title,
		Description: req.Description,
		Target:      &targetMap,
		Progress:    &progressMap,
		Status:      "active",
		StartsAt:    now,
		EndsAt:      now.AddDate(0, 0, req.DurationDays),
	}

	if err := h.db.DB.Create(&challenge).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create challenge"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Challenge created successfully",
		"challenge": challenge,
	})
}

// UpdateChallengeProgress updates progress on a challenge
// PATCH /api/me/challenges/:id/progress
func (h *GamificationHandler) UpdateChallengeProgress(c *gin.Context) {
	challengeID := c.Param("id")
	userID, _ := c.Get("user_id")

	type UpdateProgressRequest struct {
		Progress map[string]interface{} `json:"progress" binding:"required"`
	}

	var req UpdateProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify challenge ownership
	var challenge models.Challenge
	if err := h.db.DB.Where("id = ? AND user_id = ?", challengeID, userID).First(&challenge).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Challenge not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check if challenge is still active
	if challenge.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Challenge is not active"})
		return
	}

	// Check if expired
	if time.Now().After(challenge.EndsAt) {
		h.db.DB.Model(&challenge).Update("status", "expired")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Challenge has expired"})
		return
	}

	// Update progress
	progressMap := models.JSONMap(req.Progress)
	if err := h.db.DB.Model(&challenge).Update("progress", &progressMap).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress"})
		return
	}

	// Check if challenge is completed
	if h.isChallengeCompleted(&challenge, req.Progress) {
		now := time.Now()
		updates := map[string]interface{}{
			"status":       "completed",
			"completed_at": now,
		}
		h.db.DB.Model(&challenge).Updates(updates)

		// Award badge if reward is specified
		if challenge.Reward != nil {
			h.awardBadge(userID.(string), *challenge.Reward)
		}
	}

	// Reload challenge
	h.db.DB.Where("id = ?", challengeID).First(&challenge)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Progress updated",
		"challenge": challenge,
	})
}

// CompleteChallenge marks a challenge as completed
// POST /api/me/challenges/:id/complete
func (h *GamificationHandler) CompleteChallenge(c *gin.Context) {
	challengeID := c.Param("id")
	userID, _ := c.Get("user_id")

	var challenge models.Challenge
	if err := h.db.DB.Where("id = ? AND user_id = ?", challengeID, userID).First(&challenge).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Challenge not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if challenge.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Challenge is not active"})
		return
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":       "completed",
		"completed_at": now,
	}

	if err := h.db.DB.Model(&challenge).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete challenge"})
		return
	}

	// Award badge
	if challenge.Reward != nil {
		h.awardBadge(userID.(string), *challenge.Reward)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Challenge completed!",
		"challenge": challenge,
	})
}

// Helper: Check if challenge is completed based on progress
func (h *GamificationHandler) isChallengeCompleted(challenge *models.Challenge, progress map[string]interface{}) bool {
	if challenge.Target == nil {
		return false
	}

	target := *challenge.Target

	switch challenge.Type {
	case "weekly_commits":
		targetCommits, _ := target["commits"].(float64)
		currentCommits, _ := progress["commits"].(float64)
		return currentCommits >= targetCommits

	case "reduce_debt":
		targetReduction, _ := target["reduction_percent"].(float64)
		currentReduction, _ := progress["reduction_percent"].(float64)
		return currentReduction >= targetReduction

	case "throughput_boost":
		targetIncrease, _ := target["increase_percent"].(float64)
		currentIncrease, _ := progress["increase_percent"].(float64)
		return currentIncrease >= targetIncrease

	default:
		return false
	}
}

// Helper: Award a badge to a user
func (h *GamificationHandler) awardBadge(userID string, badgeName string) {
	var user models.User
	if err := h.db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return
	}

	badges := []interface{}{}
	if user.Badges != nil {
		if badgeList, ok := (*user.Badges)["badges"].([]interface{}); ok {
			badges = badgeList
		}
	}

	// Check if badge already awarded
	for _, b := range badges {
		if b.(string) == badgeName {
			return // Already has this badge
		}
	}

	// Add new badge
	badges = append(badges, badgeName)
	badgesMap := models.JSONMap(map[string]interface{}{
		"badges": badges,
	})

	h.db.DB.Model(&user).Update("badges", &badgesMap)
}

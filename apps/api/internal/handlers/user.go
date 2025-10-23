package handlers

import (
	"codepulse-api/internal/database"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	db *database.Database
}

func NewUserHandler(db *database.Database) *UserHandler {
	return &UserHandler{db: db}
}

// GetUserSummary aggregates across projects the user owns or collaborates on
// GET /api/me/summary
func (h *UserHandler) GetUserSummary(c *gin.Context) {
	userID, _ := c.Get("user_id")

	// Collect project IDs the user owns or collaborates on
	var projectIDs []string
	h.db.DB.Raw(`
		SELECT id FROM projects WHERE user_id = ?
		UNION
		SELECT project_id FROM collaborators WHERE user_id = ?
	`, userID, userID).Scan(&projectIDs)

	if len(projectIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"repos":         []string{},
			"top_languages": []gin.H{},
			"additions_deletions": gin.H{
				"this_week": gin.H{"added": 0, "deleted": 0},
				"last_week": gin.H{"added": 0, "deleted": 0},
			},
			"recent_activity":   []gin.H{},
			"active_challenges": 0,
		})
		return
	}

	// Distinct repos from github_links
	var repos []string
	h.db.DB.Raw(`SELECT DISTINCT repo_full_name FROM github_links WHERE project_id IN (?) AND repo_full_name IS NOT NULL`, projectIDs).Scan(&repos)

	// Top languages from latest scan per project (legacy scans)
	type LangRow struct {
		Language string
		Total    int
	}
	var langs []LangRow
	h.db.DB.Raw(`
		WITH latest_scans AS (
			SELECT DISTINCT ON (project_id) id
			FROM scans
			WHERE project_id IN (?)
			ORDER BY project_id, created_at DESC
		)
		SELECT sl.language AS language, SUM(sl.total) AS total
		FROM scan_langs sl
		JOIN latest_scans ls ON sl.scan_id = ls.id
		GROUP BY sl.language
		ORDER BY total DESC
		LIMIT 10
	`, projectIDs).Scan(&langs)

	// Additions/deletions via commit_scans (this week vs last week)
	now := time.Now()
	// Weeks start Monday for simplicity
	weekday := int(now.Weekday())
	if weekday == 0 { // Sunday -> 7
		weekday = 7
	}
	startOfThisWeek := time.Date(now.Year(), now.Month(), now.Day()-weekday+1, 0, 0, 0, 0, now.Location())
	startOfLastWeek := startOfThisWeek.AddDate(0, 0, -7)
	endOfLastWeek := startOfThisWeek.Add(-time.Nanosecond)

	type SumRow struct {
		Added   int
		Deleted int
	}
	var thisWeek SumRow
	var lastWeek SumRow
	h.db.DB.Raw(`
		SELECT COALESCE(SUM(lines_added),0) AS added, COALESCE(SUM(lines_deleted),0) AS deleted
		FROM commit_scans WHERE project_id IN (?) AND commit_date >= ?
	`, projectIDs, startOfThisWeek).Scan(&thisWeek)
	h.db.DB.Raw(`
		SELECT COALESCE(SUM(lines_added),0) AS added, COALESCE(SUM(lines_deleted),0) AS deleted
		FROM commit_scans WHERE project_id IN (?) AND commit_date BETWEEN ? AND ?
	`, projectIDs, startOfLastWeek, endOfLastWeek).Scan(&lastWeek)

	// Recent activity: commits per day last 14 days
	var activity []struct {
		Date  time.Time
		Count int
	}
	h.db.DB.Raw(`
		SELECT DATE(commit_date) AS date, COUNT(*) AS count
		FROM commit_scans
		WHERE project_id IN (?) AND commit_date >= ?
		GROUP BY DATE(commit_date)
		ORDER BY DATE(commit_date) ASC
	`, projectIDs, now.AddDate(0, 0, -14)).Scan(&activity)

	// Active challenges count
	var activeChallenges int64
	h.db.DB.Raw(`SELECT COUNT(*) FROM challenges WHERE user_id = ? AND status = 'active'`, userID).Scan(&activeChallenges)

	// Build response
	topLangs := make([]gin.H, 0, len(langs))
	for _, l := range langs {
		topLangs = append(topLangs, gin.H{"language": l.Language, "total": l.Total})
	}
	recent := make([]gin.H, 0, len(activity))
	for _, a := range activity {
		recent = append(recent, gin.H{"date": a.Date.Format("2006-01-02"), "count": a.Count})
	}

	c.JSON(http.StatusOK, gin.H{
		"repos":         repos,
		"top_languages": topLangs,
		"additions_deletions": gin.H{
			"this_week": gin.H{"added": thisWeek.Added, "deleted": thisWeek.Deleted},
			"last_week": gin.H{"added": lastWeek.Added, "deleted": lastWeek.Deleted},
		},
		"recent_activity":   recent,
		"active_challenges": activeChallenges,
	})
}

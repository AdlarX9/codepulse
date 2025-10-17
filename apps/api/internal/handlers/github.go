package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/github"
	"codepulse-api/internal/models"
	"codepulse-api/internal/quality"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GitHubHandler struct {
	db            *database.Database
	githubClient  *github.Client
	webhookSecret string
}

func NewGitHubHandler(db *database.Database, appID string, privateKey []byte, webhookSecret string) *GitHubHandler {
	return &GitHubHandler{
		db:            db,
		githubClient:  github.NewClient(appID, privateKey),
		webhookSecret: webhookSecret,
	}
}

// HandleWebhook processes GitHub webhook events
func (h *GitHubHandler) HandleWebhook(c *gin.Context) {
	// Get signature and event type
	signature := c.GetHeader("X-Hub-Signature-256")
	eventType := c.GetHeader("X-GitHub-Event")

	// Read payload
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read payload"})
		return
	}

	// Verify signature
	if !github.VerifyWebhookSignature(payload, signature, h.webhookSecret) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	// Parse event
	event, err := github.ParseWebhookPayload(eventType, payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse payload"})
		return
	}

	// Handle different event types
	switch eventType {
	case "installation", "installation_repositories":
		h.handleInstallation(c, event.(*github.WebhookEvent))
	case "pull_request":
		h.handlePullRequest(c, event.(*github.PullRequestEvent))
	default:
		c.JSON(http.StatusOK, gin.H{"message": "Event ignored"})
	}
}

// handleInstallation processes installation events
func (h *GitHubHandler) handleInstallation(c *gin.Context, event *github.WebhookEvent) {
	// Log installation for admin tracking
	// In a full implementation, we'd create/update Integration records
	// and associate repositories with organizations

	c.JSON(http.StatusOK, gin.H{
		"message": "Installation event received",
		"action":  event.Action,
	})
}

// handlePullRequest processes pull request events
func (h *GitHubHandler) handlePullRequest(c *gin.Context, event *github.PullRequestEvent) {
	// Only process opened, synchronize, and reopened events
	if event.Action != "opened" && event.Action != "synchronize" && event.Action != "reopened" {
		c.JSON(http.StatusOK, gin.H{"message": "PR action ignored"})
		return
	}

	// Find repository in our database
	var repo models.Repository
	externalID := event.Repository.FullName
	if err := h.db.DB.Where("full_name = ?", externalID).First(&repo).Error; err != nil {
		// Repository not linked yet, skip
		c.JSON(http.StatusOK, gin.H{"message": "Repository not linked"})
		return
	}

	// Find the latest scan for this PR/commit
	var scan models.Scan
	err := h.db.DB.Where("repository_id = ? AND commit_sha = ? AND pull_request = ?",
		repo.ID, event.PullRequest.Head.SHA, event.PullRequest.Number).
		Order("created_at DESC").
		First(&scan).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// No scan yet, create a pending check run
			h.createPendingCheckRun(event, repo)
			c.JSON(http.StatusOK, gin.H{"message": "Waiting for CI scan"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scan"})
		return
	}

	// Evaluate against policies
	h.evaluateAndCreateCheckRun(&scan, &repo, event)

	c.JSON(http.StatusOK, gin.H{"message": "PR check created"})
}

// createPendingCheckRun creates a pending check run
func (h *GitHubHandler) createPendingCheckRun(event *github.PullRequestEvent, repo models.Repository) {
	if event.Installation == nil {
		return
	}

	installationID := event.Installation.ID
	owner := event.Repository.Owner.Login
	repoName := event.Repository.Name

	now := time.Now()
	checkRun := &github.CheckRunRequest{
		Name:      "CodePulse Quality Check",
		HeadSHA:   event.PullRequest.Head.SHA,
		Status:    "in_progress",
		StartedAt: &now,
		Output: &github.CheckRunOutput{
			Title:   "⏳ Waiting for scan data",
			Summary: "Waiting for CI agent to upload scan results...",
		},
	}

	h.githubClient.CreateCheckRun(installationID, owner, repoName, checkRun)
}

// evaluateAndCreateCheckRun evaluates scan against policies and creates check run
func (h *GitHubHandler) evaluateAndCreateCheckRun(scan *models.Scan, repo *models.Repository, event *github.PullRequestEvent) {
	// Find applicable policies
	var policies []models.QualityBudget
	h.db.DB.Where("org_id = ? AND enabled = ? AND (scope = ? OR (scope = ? AND ref_id = ?))",
		repo.OrgID, true, "org", "repo", repo.ID).
		Find(&policies)

	if len(policies) == 0 {
		// No policies, skip check
		return
	}

	// Evaluate against first policy (or could aggregate multiple)
	policy := policies[0]
	result := quality.EvaluatePolicy(&policy, scan)

	// Create check run
	if event.Installation == nil {
		return
	}

	installationID := event.Installation.ID
	owner := event.Repository.Owner.Login
	repoName := event.Repository.Name

	now := time.Now()
	conclusion := github.GetCheckRunConclusion(result.Passed, result.Mode)
	title, summary := quality.FormatCheckRunOutput(result, policy.Name)

	checkRun := &github.CheckRunRequest{
		Name:        "CodePulse Quality Check",
		HeadSHA:     event.PullRequest.Head.SHA,
		Status:      "completed",
		Conclusion:  conclusion,
		StartedAt:   &scan.CreatedAt,
		CompletedAt: &now,
		Output: &github.CheckRunOutput{
			Title:   title,
			Summary: summary,
		},
	}

	h.githubClient.CreateCheckRun(installationID, owner, repoName, checkRun)
}

// InstallCallback handles OAuth callback from GitHub App installation
func (h *GitHubHandler) InstallCallback(c *gin.Context) {
	installationID := c.Query("installation_id")
	setupAction := c.Query("setup_action")

	// Redirect to web app with installation info
	redirectURL := c.Query("state") // state should contain return URL
	if redirectURL == "" {
		redirectURL = "/dashboard"
	}

	c.Redirect(http.StatusTemporaryRedirect, redirectURL+"?installation_id="+installationID+"&setup_action="+setupAction)
}

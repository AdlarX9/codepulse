package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/github"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
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

// HandleWebhook processes GitHub webhook events (simplified for personal use)
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

	// For now, just acknowledge the webhook
	// Future: Add push event handling for auto-sync
	c.JSON(http.StatusOK, gin.H{
		"message": "Webhook received",
		"event":   eventType,
	})
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

package handlers

import (
	"codepulse-api/internal/database"
	"codepulse-api/internal/models"
	"codepulse-api/internal/slack"
	"codepulse-api/internal/worker"
	"net/http"

	"github.com/gin-gonic/gin"
)

type IntegrationsHandler struct {
	db                *database.Database
	slackClientID     string
	slackClientSecret string
	slackRedirectURI  string
}

func NewIntegrationsHandler(db *database.Database, clientID, clientSecret, redirectURI string) *IntegrationsHandler {
	return &IntegrationsHandler{
		db:                db,
		slackClientID:     clientID,
		slackClientSecret: clientSecret,
		slackRedirectURI:  redirectURI,
	}
}

// ConnectSlack initiates Slack OAuth flow
func (h *IntegrationsHandler) ConnectSlack(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	// Generate OAuth URL
	authURL := "https://slack.com/oauth/v2/authorize?" +
		"client_id=" + h.slackClientID +
		"&scope=chat:write,channels:read" +
		"&redirect_uri=" + h.slackRedirectURI +
		"&state=" + orgID.(string)

	c.JSON(http.StatusOK, gin.H{
		"auth_url": authURL,
	})
}

// SlackCallback handles Slack OAuth callback
func (h *IntegrationsHandler) SlackCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state") // org_id
	errorMsg := c.Query("error")

	if errorMsg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": errorMsg})
		return
	}

	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code or state"})
		return
	}

	orgID := state

	// Exchange code for access token
	oauthResp, err := slack.ExchangeOAuthCode(h.slackClientID, h.slackClientSecret, code, h.slackRedirectURI)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange OAuth code"})
		return
	}

	// Save integration
	config := &worker.SlackIntegrationConfig{
		AccessToken: oauthResp.AccessToken,
		Channel:     "general", // Default channel, can be configured later
		TeamID:      oauthResp.TeamID,
		TeamName:    oauthResp.TeamName,
	}

	if err := worker.SaveSlackIntegration(h.db.DB, orgID, config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Slack integration connected successfully",
		"team":    oauthResp.TeamName,
	})
}

// DisconnectSlack removes Slack integration
func (h *IntegrationsHandler) DisconnectSlack(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	if err := worker.DisableSlackIntegration(h.db.DB, orgID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Slack integration disconnected"})
}

// GetIntegrations returns all integrations for an organization
func (h *IntegrationsHandler) GetIntegrations(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	type IntegrationSummary struct {
		Provider string                 `json:"provider"`
		Enabled  bool                   `json:"enabled"`
		Config   map[string]interface{} `json:"config,omitempty"`
	}

	var integrations []IntegrationSummary

	// Query database
	var dbIntegrations []struct {
		Provider string
		Enabled  bool
		Config   string
	}

	h.db.DB.Table("integrations").
		Select("provider, enabled, config").
		Where("org_id = ?", orgID).
		Scan(&dbIntegrations)

	for _, i := range dbIntegrations {
		summary := IntegrationSummary{
			Provider: i.Provider,
			Enabled:  i.Enabled,
		}
		// Don't expose sensitive tokens in the response
		if i.Provider == "slack" {
			summary.Config = map[string]interface{}{
				"connected": i.Enabled,
			}
		}
		integrations = append(integrations, summary)
	}

	c.JSON(http.StatusOK, integrations)
}

// UpdateSlackChannel updates the Slack channel for notifications
func (h *IntegrationsHandler) UpdateSlackChannel(c *gin.Context) {
	orgID, _ := c.Get("org_id")

	var req struct {
		Channel string `json:"channel" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update channel in integration config
	var integration models.Integration
	if err := h.db.DB.Where("org_id = ? AND provider = ?", orgID, "slack").First(&integration).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Slack integration not found"})
		return
	}

	newCfg := map[string]interface{}{}
	if integration.Config != nil {
		for k, v := range *integration.Config {
			newCfg[k] = v
		}
	}
	newCfg["channel"] = req.Channel
	jsonMap := models.JSONMap(newCfg)

	if err := h.db.DB.Model(&integration).Updates(map[string]interface{}{
		"config":  jsonMap,
		"enabled": true,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Channel updated successfully",
		"channel": req.Channel,
	})
}

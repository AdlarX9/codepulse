package handlers

import (
	"net/http"

	"codepulse-api/internal/websocket"

	"github.com/gin-gonic/gin"
	ws "github.com/gorilla/websocket"
)

var upgrader = ws.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub *websocket.Hub
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *websocket.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: hub}
}

// HandleWebSocket upgrades HTTP connection to WebSocket
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get organization ID from context (set by middleware)
	orgID, exists := c.Get("org_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID required"})
		return
	}

	// Get user ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID required"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
		return
	}

	// Create and register client
	client := websocket.NewClient(h.hub, conn, orgID.(string), userID.(string))
	h.hub.RegisterClient(client)

	// Start client pumps
	client.Start()
}

// GetStats returns WebSocket connection statistics
func (h *WebSocketHandler) GetStats(c *gin.Context) {
	stats := gin.H{
		"total_connections": h.hub.GetTotalClients(),
	}

	orgID, exists := c.Get("org_id")
	if exists {
		stats["org_connections"] = h.hub.GetClientCount(orgID.(string))
	}

	c.JSON(http.StatusOK, stats)
}

package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to clients
type Hub struct {
	// Registered clients by organization ID
	clients map[string]map[*Client]bool

	// Inbound messages from clients
	broadcast chan *Message

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// Message represents a WebSocket message
type Message struct {
	OrgID   string      `json:"org_id"`
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		broadcast:  make(chan *Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if _, ok := h.clients[client.orgID]; !ok {
				h.clients[client.orgID] = make(map[*Client]bool)
			}
			h.clients[client.orgID][client] = true
			h.mu.Unlock()
			log.Printf("Client registered for org %s. Total clients: %d", client.orgID, len(h.clients[client.orgID]))

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.orgID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.clients, client.orgID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered from org %s", client.orgID)

		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.clients[message.OrgID]
			h.mu.RUnlock()

			// Marshal message once
			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error marshaling message: %v", err)
				continue
			}

			// Send to all clients in the organization
			for client := range clients {
				select {
				case client.send <- data:
				default:
					// Client's send channel is full, close and remove
					h.mu.Lock()
					close(client.send)
					delete(h.clients[message.OrgID], client)
					h.mu.Unlock()
				}
			}
		}
	}
}

// RegisterClient registers a new client with the hub
func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

// BroadcastToOrg sends a message to all clients in an organization
func (h *Hub) BroadcastToOrg(orgID, msgType string, payload interface{}) {
	msg := &Message{
		OrgID:   orgID,
		Type:    msgType,
		Payload: payload,
	}
	h.broadcast <- msg
}

// GetClientCount returns the number of connected clients for an organization
func (h *Hub) GetClientCount(orgID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients[orgID])
}

// GetTotalClients returns the total number of connected clients
func (h *Hub) GetTotalClients() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	total := 0
	for _, clients := range h.clients {
		total += len(clients)
	}
	return total
}

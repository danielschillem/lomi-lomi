package handlers

import (
	"encoding/json"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type WSHub struct {
	mu      sync.RWMutex
	clients map[uint]*websocket.Conn
}

func NewWSHub() *WSHub {
	return &WSHub{
		clients: make(map[uint]*websocket.Conn),
	}
}

type WSMessage struct {
	Type string      `json:"type"` // message, match, notification, typing, online, offline
	Data interface{} `json:"data"`
}

func (h *WSHub) HandleWebSocket(c *websocket.Conn) {
	userIDStr := c.Params("userID")
	userID64, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		log.Printf("WS: invalid userID %s", userIDStr)
		return
	}
	userID := uint(userID64)

	// Register
	h.mu.Lock()
	h.clients[userID] = c
	h.mu.Unlock()

	// Mark user online
	database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"is_online": true,
	})

	log.Printf("WS: user %d connected", userID)

	defer func() {
		h.mu.Lock()
		delete(h.clients, userID)
		h.mu.Unlock()

		// Mark user offline + last_seen
		now := time.Now()
		database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"is_online":    false,
			"last_seen_at": now,
		})

		log.Printf("WS: user %d disconnected", userID)
		c.Close()
	}()

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			break
		}

		var incoming WSMessage
		if err := json.Unmarshal(msg, &incoming); err != nil {
			continue
		}

		// Handle typing indicator
		if incoming.Type == "typing" {
			if data, ok := incoming.Data.(map[string]interface{}); ok {
				if toIDf, ok := data["to_user_id"].(float64); ok {
					h.SendToUser(uint(toIDf), WSMessage{
						Type: "typing",
						Data: map[string]interface{}{
							"from_user_id": userID,
						},
					})
				}
			}
		}
	}
}

func (h *WSHub) SendToUser(userID uint, msg WSMessage) {
	h.mu.RLock()
	conn, ok := h.clients[userID]
	h.mu.RUnlock()

	if !ok {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		h.mu.Lock()
		delete(h.clients, userID)
		h.mu.Unlock()
	}
}

func (h *WSHub) BroadcastToUser(userID uint, msgType string, data interface{}) {
	h.SendToUser(userID, WSMessage{Type: msgType, Data: data})
}

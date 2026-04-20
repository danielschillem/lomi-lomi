package handlers

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/golang-jwt/jwt/v5"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type WSHub struct {
	mu      sync.RWMutex
	clients map[uint]map[*websocket.Conn]bool // multiple conns per user
	cfg     *config.Config
}

func NewWSHub(cfg *config.Config) *WSHub {
	return &WSHub{
		clients: make(map[uint]map[*websocket.Conn]bool),
		cfg:     cfg,
	}
}

type WSMessage struct {
	Type string      `json:"type"` // message, match, notification, typing, online, offline
	Data interface{} `json:"data"`
}

func (h *WSHub) HandleWebSocket(c *websocket.Conn) {
	// Authenticate via token query param
	tokenStr := c.Query("token")
	if tokenStr == "" {
		log.Println("WS: missing token")
		c.Close()
		return
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		log.Println("WS: invalid token")
		c.Close()
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.Close()
		return
	}
	userID := uint(claims["user_id"].(float64))

	// Register this connection
	h.mu.Lock()
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*websocket.Conn]bool)
	}
	h.clients[userID][c] = true
	connCount := len(h.clients[userID])
	h.mu.Unlock()

	// Mark online only on first connection
	if connCount == 1 {
		database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"is_online": true,
		})
	}

	log.Printf("WS: user %d connected (tabs: %d)", userID, connCount)

	defer func() {
		h.mu.Lock()
		delete(h.clients[userID], c)
		remaining := len(h.clients[userID])
		if remaining == 0 {
			delete(h.clients, userID)
		}
		h.mu.Unlock()

		// Mark offline only when all tabs closed
		if remaining == 0 {
			now := time.Now()
			database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
				"is_online":    false,
				"last_seen_at": now,
			})
		}

		log.Printf("WS: user %d disconnected (remaining: %d)", userID, remaining)
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

		// Handle real-time location sharing via WS (low-latency relay)
		if incoming.Type == "location_update" {
			if data, ok := incoming.Data.(map[string]interface{}); ok {
				if toIDf, ok := data["to_user_id"].(float64); ok {
					h.SendToUser(uint(toIDf), WSMessage{
						Type: "location_update",
						Data: map[string]interface{}{
							"from_user_id": userID,
							"share_id":     data["share_id"],
							"latitude":     data["latitude"],
							"longitude":    data["longitude"],
						},
					})
				}
			}
		}
	}
}

func (h *WSHub) SendToUser(userID uint, msg WSMessage) {
	h.mu.RLock()
	conns, ok := h.clients[userID]
	h.mu.RUnlock()

	if !ok {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.Lock()
	for conn := range conns {
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			delete(h.clients[userID], conn)
			conn.Close()
		}
	}
	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
	}
	h.mu.Unlock()
}

func (h *WSHub) BroadcastToUser(userID uint, msg WSMessage) {
	h.SendToUser(userID, msg)
}

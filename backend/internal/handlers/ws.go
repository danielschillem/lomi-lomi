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

	// Ping/Pong keep-alive
	const (
		pingInterval = 30 * time.Second
		pongWait     = 60 * time.Second
	)

	c.SetReadDeadline(time.Now().Add(pongWait))
	c.SetPongHandler(func(string) error {
		c.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// Start ping ticker in goroutine
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(pingInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				h.mu.Lock()
				err := c.WriteMessage(websocket.PingMessage, nil)
				h.mu.Unlock()
				if err != nil {
					return
				}
			case <-done:
				return
			}
		}
	}()

	defer func() {
		close(done)
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

		// Relay position GPS livreur → client (delivery tracking)
		if incoming.Type == "delivery_location_update" {
			if data, ok := incoming.Data.(map[string]interface{}); ok {
				h.handleDeliveryLocationRelay(userID, data)
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

// BroadcastAll sends a message to all connected users.
func (h *WSHub) BroadcastAll(msg WSMessage) {
	h.mu.RLock()
	userIDs := make([]uint, 0, len(h.clients))
	for uid := range h.clients {
		userIDs = append(userIDs, uid)
	}
	h.mu.RUnlock()

	for _, uid := range userIDs {
		h.SendToUser(uid, msg)
	}
}

// BroadcastToRole envoie un message à tous les utilisateurs connectés ayant le rôle donné.
// Le rôle est résolu en chargeant les IDs depuis la DB pour les connexions actives.
func (h *WSHub) BroadcastToRole(role string, msg WSMessage) {
	h.mu.RLock()
	connectedIDs := make([]uint, 0, len(h.clients))
	for uid := range h.clients {
		connectedIDs = append(connectedIDs, uid)
	}
	h.mu.RUnlock()

	if len(connectedIDs) == 0 {
		return
	}

	// Filtrer les IDs par rôle en DB
	var matched []uint
	database.DB.Model(&models.User{}).
		Select("id").
		Where("id IN ? AND role = ?", connectedIDs, role).
		Pluck("id", &matched)

	for _, uid := range matched {
		h.SendToUser(uid, msg)
	}
}

// HandleDeliveryLocationRelay relaie la position GPS du livreur au client via WS pur (sans HTTP).
// Le message WS attendu : { "type": "delivery_location_update", "data": { "delivery_id": X, "to_user_id": Y, "latitude": Z, "longitude": W } }
func (h *WSHub) handleDeliveryLocationRelay(userID uint, data map[string]interface{}) {
	toIDf, ok := data["to_user_id"].(float64)
	if !ok {
		return
	}
	h.SendToUser(uint(toIDf), WSMessage{
		Type: "delivery_location_update",
		Data: map[string]interface{}{
			"delivery_id":        data["delivery_id"],
			"delivery_person_id": userID,
			"latitude":           data["latitude"],
			"longitude":          data["longitude"],
		},
	})
}

package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type PushHandler struct{}

func NewPushHandler() *PushHandler {
	return &PushHandler{}
}

// RegisterPushToken saves the Expo push token for the authenticated user.
func (h *PushHandler) RegisterPushToken(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		Token string `json:"token"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token requis"})
	}

	database.DB.Model(&models.User{}).Where("id = ?", userID).Update("push_token", req.Token)

	return c.JSON(fiber.Map{"message": "Push token enregistré"})
}

// UnregisterPushToken removes the push token on logout.
func (h *PushHandler) UnregisterPushToken(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	database.DB.Model(&models.User{}).Where("id = ?", userID).Update("push_token", "")

	return c.JSON(fiber.Map{"message": "Push token supprimé"})
}

// ExpoPushMessage represents a single push notification for Expo Push API.
type ExpoPushMessage struct {
	To    string `json:"to"`
	Title string `json:"title"`
	Body  string `json:"body"`
	Sound string `json:"sound,omitempty"`
	Data  any    `json:"data,omitempty"`
}

// SendPushToUser sends a push notification to a user by ID.
// It's a fire-and-forget helper; errors are logged but not returned.
func SendPushToUser(userID uint, title, body string, data map[string]interface{}) {
	var user models.User
	if err := database.DB.Select("push_token").First(&user, userID).Error; err != nil {
		return
	}
	if user.PushToken == "" {
		return
	}

	msg := ExpoPushMessage{
		To:    user.PushToken,
		Title: title,
		Body:  body,
		Sound: "default",
		Data:  data,
	}

	go sendExpoPush([]ExpoPushMessage{msg})
}

// SendPushToUsers sends push notifications to multiple users.
func SendPushToUsers(userIDs []uint, title, body string, data map[string]interface{}) {
	var users []models.User
	database.DB.Select("id, push_token").Where("id IN ? AND push_token != ''", userIDs).Find(&users)

	if len(users) == 0 {
		return
	}

	var msgs []ExpoPushMessage
	for _, u := range users {
		msgs = append(msgs, ExpoPushMessage{
			To:    u.PushToken,
			Title: title,
			Body:  body,
			Sound: "default",
			Data:  data,
		})
	}

	go sendExpoPush(msgs)
}

func sendExpoPush(messages []ExpoPushMessage) {
	payload, err := json.Marshal(messages)
	if err != nil {
		log.Printf("[Push] JSON marshal error: %v", err)
		return
	}

	req, err := http.NewRequest("POST", "https://exp.host/--/api/v2/push/send", bytes.NewReader(payload))
	if err != nil {
		log.Printf("[Push] Create request error: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Push] Send error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Push] Expo API returned %d", resp.StatusCode)
	}
}

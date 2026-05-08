package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"firebase.google.com/go/v4/messaging"
	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	fb "github.com/lomilomi/backend/internal/firebase"
	"github.com/lomilomi/backend/internal/models"
)

type PushHandler struct{}

func NewPushHandler() *PushHandler { return &PushHandler{} }

// RegisterPushToken saves the push token for the authenticated user.
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

// UnregisterPushToken clears the push token on logout.
func (h *PushHandler) UnregisterPushToken(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	database.DB.Model(&models.User{}).Where("id = ?", userID).Update("push_token", "")
	return c.JSON(fiber.Map{"message": "Push token supprimé"})
}

// isFCMToken returns true for native FCM registration tokens (not Expo tokens).
func isFCMToken(token string) bool {
	return token != "" && !strings.HasPrefix(token, "ExponentPushToken")
}

// channelFor maps a notification type to an Android channel ID.
func channelFor(data map[string]interface{}) string {
	t, _ := data["type"].(string)
	switch t {
	case "call":
		return "calls"
	case "message":
		return "messages"
	case "match", "superlike":
		return "matches"
	default:
		return "default"
	}
}

// priorityFor maps a notification type to FCM/Expo priority.
func priorityFor(data map[string]interface{}) string {
	t, _ := data["type"].(string)
	switch t {
	case "call", "message":
		return "high"
	default:
		return "default"
	}
}

// dataToStrings converts a map[string]interface{} to map[string]string for FCM.
func dataToStrings(in map[string]interface{}) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = fmt.Sprintf("%v", v)
	}
	return out
}

// SendPushToUser sends a push notification to a single user (fire-and-forget).
func SendPushToUser(userID uint, title, body string, data map[string]interface{}) {
	var user models.User
	if err := database.DB.Select("push_token").First(&user, userID).Error; err != nil {
		return
	}
	if user.PushToken == "" {
		return
	}
	go sendOne(user.PushToken, title, body, data)
}

// SendPushToUsers sends push notifications to multiple users (fire-and-forget).
func SendPushToUsers(userIDs []uint, title, body string, data map[string]interface{}) {
	var users []models.User
	database.DB.Select("id, push_token").Where("id IN ? AND push_token != ''", userIDs).Find(&users)
	if len(users) == 0 {
		return
	}
	go func() {
		var fcmTokens, expoTokens []string
		for _, u := range users {
			if isFCMToken(u.PushToken) {
				fcmTokens = append(fcmTokens, u.PushToken)
			} else {
				expoTokens = append(expoTokens, u.PushToken)
			}
		}
		if len(fcmTokens) > 0 {
			sendFCMMulticast(fcmTokens, title, body, data)
		}
		if len(expoTokens) > 0 {
			sendExpoPush(buildExpoMessages(expoTokens, title, body, data))
		}
	}()
}

// sendOne routes a single notification to FCM or Expo based on token type.
func sendOne(token, title, body string, data map[string]interface{}) {
	if isFCMToken(token) && fb.Enabled() {
		sendFCM(token, title, body, data)
	} else {
		sendExpoPush(buildExpoMessages([]string{token}, title, body, data))
	}
}

// ── FCM (Firebase Admin SDK) ──────────────────────────────────────────────────

func sendFCM(token, title, body string, data map[string]interface{}) {
	msg := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Android: &messaging.AndroidConfig{
			Priority: priorityFor(data),
			Notification: &messaging.AndroidNotification{
				ChannelID:   channelFor(data),
				Sound:       "default",
				ClickAction: "FLUTTER_NOTIFICATION_CLICK",
			},
		},
		Data: dataToStrings(data),
	}

	if _, err := fb.Messaging.Send(context.Background(), msg); err != nil {
		log.Printf("[Push/FCM] send error (token=%s...): %v", token[:min(10, len(token))], err)
	}
}

func sendFCMMulticast(tokens []string, title, body string, data map[string]interface{}) {
	msg := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Android: &messaging.AndroidConfig{
			Priority: priorityFor(data),
			Notification: &messaging.AndroidNotification{
				ChannelID: channelFor(data),
				Sound:     "default",
			},
		},
		Data: dataToStrings(data),
	}

	res, err := fb.Messaging.SendEachForMulticast(context.Background(), msg)
	if err != nil {
		log.Printf("[Push/FCM] multicast error: %v", err)
		return
	}
	if res.FailureCount > 0 {
		log.Printf("[Push/FCM] %d/%d messages failed", res.FailureCount, len(tokens))
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ── Expo Push Service (fallback for ExponentPushToken[...]) ───────────────────

type expoPushMessage struct {
	To        string            `json:"to"`
	Title     string            `json:"title"`
	Body      string            `json:"body"`
	Sound     string            `json:"sound,omitempty"`
	ChannelID string            `json:"channelId,omitempty"`
	Priority  string            `json:"priority,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

func buildExpoMessages(tokens []string, title, body string, data map[string]interface{}) []expoPushMessage {
	msgs := make([]expoPushMessage, len(tokens))
	ch := channelFor(data)
	prio := priorityFor(data)
	for i, t := range tokens {
		msgs[i] = expoPushMessage{
			To:        t,
			Title:     title,
			Body:      body,
			Sound:     "default",
			ChannelID: ch,
			Priority:  prio,
			Data:      data,
		}
	}
	return msgs
}

func sendExpoPush(messages []expoPushMessage) {
	payload, err := json.Marshal(messages)
	if err != nil {
		log.Printf("[Push/Expo] marshal error: %v", err)
		return
	}
	req, err := http.NewRequest("POST", "https://exp.host/--/api/v2/push/send", bytes.NewReader(payload))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip, deflate")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Push/Expo] send error: %v", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("[Push/Expo] API returned %d", resp.StatusCode)
	}
}

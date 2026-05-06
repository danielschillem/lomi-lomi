package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/middleware"
	"github.com/lomilomi/backend/internal/models"
	"gorm.io/gorm"
)

type notificationTestEnv struct {
	app      *fiber.App
	token    string
	user     models.User
	other    models.User
	notifs   []models.Notification
	otherOne models.Notification
}

func setupNotificationTestEnv(t *testing.T) notificationTestEnv {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	database.DB = db
	if err := db.AutoMigrate(&models.User{}, &models.Notification{}); err != nil {
		t.Fatalf("migrate db: %v", err)
	}

	user := models.User{Username: "alice", Email: "alice@example.com", Phone: "+22670000001", Role: "user"}
	other := models.User{Username: "bob", Email: "bob@example.com", Phone: "+22670000002", Role: "user"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := db.Create(&other).Error; err != nil {
		t.Fatalf("create other user: %v", err)
	}

	notifs := []models.Notification{
		{UserID: user.ID, Type: "match", Title: "Match", Body: "Nouveau match"},
		{UserID: user.ID, Type: "message", Title: "Message", Body: "Nouveau message"},
		{UserID: user.ID, Type: "order", Title: "Commande", Body: "Commande payée", IsRead: true},
	}
	if err := db.Create(&notifs).Error; err != nil {
		t.Fatalf("create notifications: %v", err)
	}
	otherOne := models.Notification{UserID: other.ID, Type: "match", Title: "Secret", Body: "Autre utilisateur"}
	if err := db.Create(&otherOne).Error; err != nil {
		t.Fatalf("create other notification: %v", err)
	}

	cfg := &config.Config{JWTSecret: "test-secret"}
	token, err := middleware.GenerateToken(cfg, user.ID, user.Username, user.Role)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	app := fiber.New()
	jwt := middleware.JWTAuth(cfg)
	matchHandler := NewMatchHandler()
	pushHandler := NewPushHandler()

	app.Get("/notifications", jwt, matchHandler.GetNotifications)
	app.Patch("/notifications", jwt, matchHandler.UpdateNotificationsRead)
	app.Delete("/notifications", jwt, matchHandler.DeleteNotifications)
	app.Get("/notifications/unread", jwt, matchHandler.UnreadCount)
	app.Put("/notifications/read", jwt, matchHandler.MarkNotificationsRead)
	app.Put("/notifications/unread", jwt, matchHandler.MarkNotificationsUnread)
	app.Patch("/notifications/:id", jwt, matchHandler.UpdateNotificationRead)
	app.Delete("/notifications/:id", jwt, matchHandler.DeleteNotification)
	app.Post("/push/register", jwt, pushHandler.RegisterPushToken)
	app.Delete("/push/register", jwt, pushHandler.UnregisterPushToken)

	return notificationTestEnv{
		app:      app,
		token:    token,
		user:     user,
		other:    other,
		notifs:   notifs,
		otherOne: otherOne,
	}
}

func authedJSONRequest(t *testing.T, method, path, token string, body any) *http.Request {
	t.Helper()

	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		reader = bytes.NewReader(payload)
	}

	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func doJSON[T any](t *testing.T, app *fiber.App, req *http.Request, wantStatus int) T {
	t.Helper()

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != wantStatus {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("status = %d, want %d, body=%s", resp.StatusCode, wantStatus, string(body))
	}

	var out T
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return out
}

func unreadCount(t *testing.T, env notificationTestEnv) int {
	t.Helper()
	body := doJSON[struct {
		Count int `json:"count"`
	}](
		t,
		env.app,
		authedJSONRequest(t, http.MethodGet, "/notifications/unread", env.token, nil),
		http.StatusOK,
	)
	return body.Count
}

func TestNotificationReadUnreadAndBulkDeleteContract(t *testing.T) {
	env := setupNotificationTestEnv(t)

	list := doJSON[[]models.Notification](
		t,
		env.app,
		authedJSONRequest(t, http.MethodGet, "/notifications?page=1&limit=2", env.token, nil),
		http.StatusOK,
	)
	if len(list) != 2 {
		t.Fatalf("len(list) = %d, want 2", len(list))
	}
	for _, notif := range list {
		if notif.UserID != env.user.ID {
			t.Fatalf("notification user = %d, want %d", notif.UserID, env.user.ID)
		}
	}

	if got := unreadCount(t, env); got != 2 {
		t.Fatalf("unread count = %d, want 2", got)
	}

	updated := doJSON[models.Notification](
		t,
		env.app,
		authedJSONRequest(t, http.MethodPatch, "/notifications/"+jsonNumber(env.notifs[0].ID), env.token, map[string]bool{"is_read": true}),
		http.StatusOK,
	)
	if !updated.IsRead {
		t.Fatal("single notification was not marked read")
	}
	if got := unreadCount(t, env); got != 1 {
		t.Fatalf("unread count after single read = %d, want 1", got)
	}

	bulk := doJSON[struct {
		Updated int64 `json:"updated"`
	}](
		t,
		env.app,
		authedJSONRequest(t, http.MethodPatch, "/notifications", env.token, map[string]any{
			"ids":     []uint{env.notifs[0].ID, env.notifs[2].ID},
			"is_read": false,
		}),
		http.StatusOK,
	)
	if bulk.Updated != 2 {
		t.Fatalf("bulk updated = %d, want 2", bulk.Updated)
	}
	if got := unreadCount(t, env); got != 3 {
		t.Fatalf("unread count after bulk unread = %d, want 3", got)
	}

	doJSON[map[string]string](
		t,
		env.app,
		authedJSONRequest(t, http.MethodPut, "/notifications/read", env.token, nil),
		http.StatusOK,
	)
	if got := unreadCount(t, env); got != 0 {
		t.Fatalf("unread count after mark all read = %d, want 0", got)
	}

	doJSON[map[string]string](
		t,
		env.app,
		authedJSONRequest(t, http.MethodPut, "/notifications/unread", env.token, nil),
		http.StatusOK,
	)
	if got := unreadCount(t, env); got != 3 {
		t.Fatalf("unread count after mark all unread = %d, want 3", got)
	}

	denied := authedJSONRequest(t, http.MethodPatch, "/notifications/"+jsonNumber(env.otherOne.ID), env.token, map[string]bool{"is_read": true})
	doJSON[map[string]string](t, env.app, denied, http.StatusNotFound)

	deleted := doJSON[struct {
		Deleted int64 `json:"deleted"`
	}](
		t,
		env.app,
		authedJSONRequest(t, http.MethodDelete, "/notifications", env.token, map[string]any{
			"ids": []uint{env.notifs[0].ID, env.notifs[1].ID},
		}),
		http.StatusOK,
	)
	if deleted.Deleted != 2 {
		t.Fatalf("bulk deleted = %d, want 2", deleted.Deleted)
	}

	remaining := doJSON[[]models.Notification](
		t,
		env.app,
		authedJSONRequest(t, http.MethodGet, "/notifications", env.token, nil),
		http.StatusOK,
	)
	if len(remaining) != 1 {
		t.Fatalf("remaining notifications = %d, want 1", len(remaining))
	}
}

func TestPushTokenRegistrationContract(t *testing.T) {
	env := setupNotificationTestEnv(t)

	doJSON[map[string]string](
		t,
		env.app,
		authedJSONRequest(t, http.MethodPost, "/push/register", env.token, map[string]string{
			"token": "ExponentPushToken[test-token]",
		}),
		http.StatusOK,
	)

	var user models.User
	if err := database.DB.First(&user, env.user.ID).Error; err != nil {
		t.Fatalf("reload user: %v", err)
	}
	if user.PushToken != "ExponentPushToken[test-token]" {
		t.Fatalf("push token = %q, want saved token", user.PushToken)
	}

	doJSON[map[string]string](
		t,
		env.app,
		authedJSONRequest(t, http.MethodDelete, "/push/register", env.token, nil),
		http.StatusOK,
	)
	if err := database.DB.First(&user, env.user.ID).Error; err != nil {
		t.Fatalf("reload user after delete: %v", err)
	}
	if user.PushToken != "" {
		t.Fatalf("push token after unregister = %q, want empty", user.PushToken)
	}
}

func jsonNumber(id uint) string {
	payload, _ := json.Marshal(id)
	return string(payload)
}

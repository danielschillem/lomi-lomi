package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type EventHandler struct{}

func NewEventHandler() *EventHandler { return &EventHandler{} }

// GetEvents lists upcoming published events.
func (h *EventHandler) GetEvents(c *fiber.Ctx) error {
	city := c.Query("city")
	category := c.Query("category")

	query := database.DB.Model(&models.Event{}).
		Where("is_published = true AND starts_at > ?", time.Now()).
		Preload("Organizer").
		Preload("Place").
		Order("starts_at ASC").
		Limit(50)

	if city != "" {
		query = query.Where("city ILIKE ?", "%"+city+"%")
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var events []models.Event
	query.Find(&events)

	// Attach attendee count
	type EventWithCount struct {
		models.Event
		AttendeeCount int64 `json:"attendee_count"`
	}

	result := make([]fiber.Map, 0, len(events))
	for _, ev := range events {
		var count int64
		database.DB.Model(&models.EventAttendee{}).Where("event_id = ? AND status = 'going'", ev.ID).Count(&count)
		result = append(result, fiber.Map{
			"id":             ev.ID,
			"title":          ev.Title,
			"description":    ev.Description,
			"image_url":      ev.ImageURL,
			"city":           ev.City,
			"address":        ev.Address,
			"latitude":       ev.Latitude,
			"longitude":      ev.Longitude,
			"starts_at":      ev.StartsAt,
			"ends_at":        ev.EndsAt,
			"price":          ev.Price,
			"category":       ev.Category,
			"max_attendees":  ev.MaxAttendees,
			"organizer":      fiber.Map{"id": ev.Organizer.ID, "username": ev.Organizer.Username, "avatar_url": ev.Organizer.AvatarURL},
			"place":          ev.Place,
			"attendee_count": count,
			"created_at":     ev.CreatedAt,
		})
	}

	return c.JSON(result)
}

// GetEvent returns a single event.
func (h *EventHandler) GetEvent(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var ev models.Event
	if err := database.DB.Preload("Organizer").Preload("Place").First(&ev, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Événement introuvable"})
	}

	var count int64
	database.DB.Model(&models.EventAttendee{}).Where("event_id = ? AND status = 'going'", ev.ID).Count(&count)

	return c.JSON(fiber.Map{
		"id":             ev.ID,
		"title":          ev.Title,
		"description":    ev.Description,
		"image_url":      ev.ImageURL,
		"city":           ev.City,
		"address":        ev.Address,
		"latitude":       ev.Latitude,
		"longitude":      ev.Longitude,
		"starts_at":      ev.StartsAt,
		"ends_at":        ev.EndsAt,
		"price":          ev.Price,
		"category":       ev.Category,
		"max_attendees":  ev.MaxAttendees,
		"organizer":      fiber.Map{"id": ev.Organizer.ID, "username": ev.Organizer.Username, "avatar_url": ev.Organizer.AvatarURL},
		"place":          ev.Place,
		"attendee_count": count,
		"created_at":     ev.CreatedAt,
	})
}

// AttendEvent marks the authenticated user as attending (or interested in) an event.
func (h *EventHandler) AttendEvent(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	eventID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		Status string `json:"status"` // going, interested, cancelled
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		req.Status = "going"
	}
	if req.Status == "" {
		req.Status = "going"
	}

	var ev models.Event
	if err := database.DB.First(&ev, eventID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Événement introuvable"})
	}

	// Check capacity
	if ev.MaxAttendees > 0 && req.Status == "going" {
		var count int64
		database.DB.Model(&models.EventAttendee{}).Where("event_id = ? AND status = 'going'", eventID).Count(&count)
		if int(count) >= ev.MaxAttendees {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Événement complet"})
		}
	}

	var existing models.EventAttendee
	err2 := database.DB.Where("event_id = ? AND user_id = ?", eventID, userID).First(&existing).Error
	if err2 == nil {
		database.DB.Model(&existing).Update("status", req.Status)
		return c.JSON(fiber.Map{"attending": req.Status != "cancelled", "status": req.Status})
	}

	attendee := models.EventAttendee{
		EventID: uint(eventID),
		UserID:  userID,
		Status:  req.Status,
	}
	database.DB.Create(&attendee)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"attending": true, "status": req.Status})
}

// GetMyEvents returns events the authenticated user is attending.
func (h *EventHandler) GetMyEvents(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var attendees []models.EventAttendee
	database.DB.Where("user_id = ? AND status != 'cancelled'", userID).
		Preload("Event.Organizer").
		Preload("Event.Place").
		Find(&attendees)

	events := make([]fiber.Map, 0, len(attendees))
	for _, a := range attendees {
		events = append(events, fiber.Map{
			"event":  a.Event,
			"status": a.Status,
		})
	}
	return c.JSON(events)
}

// AdminCreateEvent creates a new event (admin/owner only).
func (h *EventHandler) AdminCreateEvent(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		Title        string     `json:"title"`
		Description  string     `json:"description"`
		ImageURL     string     `json:"image_url"`
		City         string     `json:"city"`
		Address      string     `json:"address"`
		Latitude     float64    `json:"latitude"`
		Longitude    float64    `json:"longitude"`
		StartsAt     time.Time  `json:"starts_at"`
		EndsAt       *time.Time `json:"ends_at"`
		MaxAttendees int        `json:"max_attendees"`
		Price        float64    `json:"price"`
		Category     string     `json:"category"`
		PlaceID      *uint      `json:"place_id"`
		IsPublished  bool       `json:"is_published"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Titre requis"})
	}

	ev := models.Event{
		OrganizerID:  userID,
		Title:        req.Title,
		Description:  req.Description,
		ImageURL:     req.ImageURL,
		City:         req.City,
		Address:      req.Address,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		StartsAt:     req.StartsAt,
		EndsAt:       req.EndsAt,
		MaxAttendees: req.MaxAttendees,
		Price:        req.Price,
		Category:     req.Category,
		PlaceID:      req.PlaceID,
		IsPublished:  req.IsPublished,
	}
	database.DB.Create(&ev)
	database.DB.Preload("Organizer").Preload("Place").First(&ev, ev.ID)

	return c.Status(fiber.StatusCreated).JSON(ev)
}

// AdminUpdateEvent updates an event.
func (h *EventHandler) AdminUpdateEvent(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var ev models.Event
	if err := database.DB.First(&ev, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Événement introuvable"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	database.DB.Model(&ev).Updates(updates)
	return c.JSON(ev)
}

// AdminDeleteEvent deletes an event.
func (h *EventHandler) AdminDeleteEvent(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	database.DB.Delete(&models.Event{}, id)
	return c.JSON(fiber.Map{"message": "Événement supprimé"})
}

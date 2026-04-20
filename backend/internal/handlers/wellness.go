package handlers

import (
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type WellnessHandler struct{}

func NewWellnessHandler() *WellnessHandler {
	return &WellnessHandler{}
}

// ======================== PUBLIC ========================

// GetProviders returns wellness providers with optional filters
func (h *WellnessHandler) GetProviders(c *fiber.Ctx) error {
	category := c.Query("category")
	city := c.Query("city")
	mobile := c.Query("mobile") // "true" for mobile service only

	query := database.DB.Where("is_active = ?", true)

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if city != "" {
		query = query.Where("city LIKE ?", "%"+city+"%")
	}
	if mobile == "true" {
		query = query.Where("mobile_service = ?", true)
	}

	var providers []models.WellnessProvider
	query.Preload("Services", "is_active = true").
		Order("rating DESC").
		Find(&providers)

	return c.JSON(providers)
}

// GetProvider returns a single provider with all services & availabilities
func (h *WellnessHandler) GetProvider(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var provider models.WellnessProvider
	if err := database.DB.
		Preload("Services", "is_active = true").
		Preload("Availabilities").
		First(&provider, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Prestataire non trouvé"})
	}

	// Load reviews separately
	var reviews []models.WellnessReview
	database.DB.Preload("User").
		Where("provider_id = ?", id).
		Order("created_at DESC").
		Limit(20).
		Find(&reviews)

	return c.JSON(fiber.Map{
		"provider": provider,
		"reviews":  reviews,
	})
}

// GetService returns a single service
func (h *WellnessHandler) GetService(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var service models.WellnessService
	if err := database.DB.Preload("Provider").First(&service, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Service non trouvé"})
	}

	return c.JSON(service)
}

// ======================== BOOKING (AUTH REQUIRED) ========================

// CreateBooking creates a new wellness booking
func (h *WellnessHandler) CreateBooking(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type BookingReq struct {
		ServiceID uint   `json:"service_id"`
		Date      string `json:"date"`       // "2026-04-25"
		StartTime string `json:"start_time"` // "14:00"
		Persons   int    `json:"persons"`
		GuestID   *uint  `json:"guest_id,omitempty"`
		Notes     string `json:"notes"`
	}

	var req BookingReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if req.ServiceID == 0 || req.Date == "" || req.StartTime == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Service, date et heure requis"})
	}

	// Load service
	var service models.WellnessService
	if err := database.DB.Preload("Provider").First(&service, req.ServiceID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Service non trouvé"})
	}

	if !service.IsActive {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ce service n'est plus disponible"})
	}

	// Parse date
	bookingDate, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format de date invalide (AAAA-MM-JJ)"})
	}

	// Date must be in the future
	if bookingDate.Before(time.Now().Truncate(24 * time.Hour)) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La date doit être dans le futur"})
	}

	// Validate time format
	startTime, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format d'heure invalide (HH:MM)"})
	}

	// Calculate end time
	endTime := startTime.Add(time.Duration(service.Duration) * time.Minute)
	endTimeStr := endTime.Format("15:04")

	// Check provider availability for that day of week
	dayOfWeek := int(bookingDate.Weekday())
	var availability models.WellnessAvailability
	if err := database.DB.
		Where("provider_id = ? AND day_of_week = ?", service.ProviderID, dayOfWeek).
		First(&availability).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Le prestataire n'est pas disponible ce jour"})
	}

	if req.StartTime < availability.StartTime || endTimeStr > availability.EndTime {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Horaires disponibles : %s - %s", availability.StartTime, availability.EndTime),
		})
	}

	// Check no overlapping booking
	var conflictCount int64
	database.DB.Model(&models.WellnessBooking{}).
		Where("provider_id = ? AND date = ? AND status IN ? AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))",
			service.ProviderID, bookingDate,
			[]string{"pending", "confirmed"},
			endTimeStr, req.StartTime,
			endTimeStr, req.StartTime,
		).Count(&conflictCount)

	if conflictCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Ce créneau est déjà réservé"})
	}

	// Persons & price
	persons := 1
	if req.Persons == 2 && service.IsDuo {
		persons = 2
	}
	totalPrice := service.Price * float64(persons)

	booking := models.WellnessBooking{
		UserID:     userID,
		ServiceID:  req.ServiceID,
		ProviderID: service.ProviderID,
		Date:       bookingDate,
		StartTime:  req.StartTime,
		EndTime:    endTimeStr,
		Persons:    persons,
		GuestID:    req.GuestID,
		Status:     "pending",
		TotalPrice: totalPrice,
		Notes:      req.Notes,
	}

	if err := database.DB.Create(&booking).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer la réservation"})
	}

	database.DB.Preload("Service.Provider").Preload("User").First(&booking, booking.ID)

	return c.Status(fiber.StatusCreated).JSON(booking)
}

// GetMyBookings returns the authenticated user's bookings
func (h *WellnessHandler) GetMyBookings(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var bookings []models.WellnessBooking
	database.DB.
		Preload("Service").
		Preload("Provider").
		Preload("Guest").
		Where("user_id = ?", userID).
		Order("date DESC, start_time DESC").
		Find(&bookings)

	return c.JSON(bookings)
}

// CancelBooking cancels a booking (user can only cancel their own)
func (h *WellnessHandler) CancelBooking(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var booking models.WellnessBooking
	if err := database.DB.First(&booking, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}

	if booking.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Action non autorisée"})
	}

	if booking.Status == "completed" || booking.Status == "canceled" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Impossible d'annuler cette réservation"})
	}

	database.DB.Model(&booking).Update("status", "canceled")

	return c.JSON(fiber.Map{"message": "Réservation annulée"})
}

// CreateReview adds a review for a completed booking
func (h *WellnessHandler) CreateReview(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type ReviewReq struct {
		BookingID uint    `json:"booking_id"`
		Rating    float64 `json:"rating"`
		Comment   string  `json:"comment"`
	}

	var req ReviewReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if req.Rating < 1 || req.Rating > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La note doit être entre 1 et 5"})
	}

	// Verify booking belongs to user and is completed
	var booking models.WellnessBooking
	if err := database.DB.First(&booking, req.BookingID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}
	if booking.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Action non autorisée"})
	}
	if booking.Status != "completed" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Vous ne pouvez noter qu'une prestation terminée"})
	}

	// Check not already reviewed
	var existingCount int64
	database.DB.Model(&models.WellnessReview{}).Where("booking_id = ?", req.BookingID).Count(&existingCount)
	if existingCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Vous avez déjà noté cette prestation"})
	}

	review := models.WellnessReview{
		UserID:     userID,
		BookingID:  req.BookingID,
		ProviderID: booking.ProviderID,
		Rating:     req.Rating,
		Comment:    req.Comment,
	}

	database.DB.Create(&review)

	// Update provider rating
	var avgRating struct{ Avg float64 }
	database.DB.Model(&models.WellnessReview{}).
		Select("COALESCE(AVG(rating), 0) as avg").
		Where("provider_id = ?", booking.ProviderID).
		Scan(&avgRating)

	var reviewCount int64
	database.DB.Model(&models.WellnessReview{}).Where("provider_id = ?", booking.ProviderID).Count(&reviewCount)

	database.DB.Model(&models.WellnessProvider{}).
		Where("id = ?", booking.ProviderID).
		Updates(map[string]interface{}{
			"rating":       math.Round(avgRating.Avg*10) / 10,
			"review_count": reviewCount,
		})

	return c.Status(fiber.StatusCreated).JSON(review)
}

// ======================== ADMIN ========================

// AdminCreateProvider creates a new wellness provider
func (h *WellnessHandler) AdminCreateProvider(c *fiber.Ctx) error {
	var provider models.WellnessProvider
	if err := c.BodyParser(&provider); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if provider.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom requis"})
	}

	database.DB.Create(&provider)
	return c.Status(fiber.StatusCreated).JSON(provider)
}

// AdminUpdateProvider updates a provider
func (h *WellnessHandler) AdminUpdateProvider(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var provider models.WellnessProvider
	if err := database.DB.First(&provider, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Prestataire non trouvé"})
	}

	type Req struct {
		Name           *string  `json:"name"`
		Description    *string  `json:"description"`
		Category       *string  `json:"category"`
		ImageURL       *string  `json:"image_url"`
		Phone          *string  `json:"phone"`
		Email          *string  `json:"email"`
		Website        *string  `json:"website"`
		Address        *string  `json:"address"`
		City           *string  `json:"city"`
		Latitude       *float64 `json:"latitude"`
		Longitude      *float64 `json:"longitude"`
		Certifications *string  `json:"certifications"`
		MobileService  *bool    `json:"mobile_service"`
		IsVerified     *bool    `json:"is_verified"`
		IsActive       *bool    `json:"is_active"`
	}

	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.City != nil {
		updates["city"] = *req.City
	}
	if req.Latitude != nil {
		updates["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updates["longitude"] = *req.Longitude
	}
	if req.Certifications != nil {
		updates["certifications"] = *req.Certifications
	}
	if req.MobileService != nil {
		updates["mobile_service"] = *req.MobileService
	}
	if req.IsVerified != nil {
		updates["is_verified"] = *req.IsVerified
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		database.DB.Model(&provider).Updates(updates)
	}

	database.DB.Preload("Services").Preload("Availabilities").First(&provider, uint(id))
	return c.JSON(provider)
}

// AdminDeleteProvider deletes a provider
func (h *WellnessHandler) AdminDeleteProvider(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	if err := database.DB.Delete(&models.WellnessProvider{}, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Suppression impossible"})
	}

	return c.JSON(fiber.Map{"message": "Prestataire supprimé"})
}

// AdminCreateService creates a new service for a provider
func (h *WellnessHandler) AdminCreateService(c *fiber.Ctx) error {
	var service models.WellnessService
	if err := c.BodyParser(&service); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if service.Name == "" || service.ProviderID == 0 || service.Price <= 0 || service.Duration <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom, prestataire, prix et durée requis"})
	}

	// Verify provider exists
	var count int64
	database.DB.Model(&models.WellnessProvider{}).Where("id = ?", service.ProviderID).Count(&count)
	if count == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Prestataire non trouvé"})
	}

	database.DB.Create(&service)
	return c.Status(fiber.StatusCreated).JSON(service)
}

// AdminUpdateService updates a service
func (h *WellnessHandler) AdminUpdateService(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var service models.WellnessService
	if err := database.DB.First(&service, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Service non trouvé"})
	}

	type Req struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Duration    *int     `json:"duration"`
		Price       *float64 `json:"price"`
		Category    *string  `json:"category"`
		IsDuo       *bool    `json:"is_duo"`
		IsActive    *bool    `json:"is_active"`
	}

	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Duration != nil {
		updates["duration"] = *req.Duration
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.IsDuo != nil {
		updates["is_duo"] = *req.IsDuo
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		database.DB.Model(&service).Updates(updates)
	}

	database.DB.Preload("Provider").First(&service, uint(id))
	return c.JSON(service)
}

// AdminDeleteService deletes a service
func (h *WellnessHandler) AdminDeleteService(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	if err := database.DB.Delete(&models.WellnessService{}, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Suppression impossible"})
	}

	return c.JSON(fiber.Map{"message": "Service supprimé"})
}

// AdminSetAvailability sets availability slots for a provider (replaces all)
func (h *WellnessHandler) AdminSetAvailability(c *fiber.Ctx) error {
	providerID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type SlotReq struct {
		DayOfWeek int    `json:"day_of_week"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
	}

	var slots []SlotReq
	if err := c.BodyParser(&slots); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	// Delete old availabilities
	database.DB.Where("provider_id = ?", uint(providerID)).Delete(&models.WellnessAvailability{})

	// Create new
	for _, s := range slots {
		database.DB.Create(&models.WellnessAvailability{
			ProviderID: uint(providerID),
			DayOfWeek:  s.DayOfWeek,
			StartTime:  s.StartTime,
			EndTime:    s.EndTime,
		})
	}

	var availabilities []models.WellnessAvailability
	database.DB.Where("provider_id = ?", uint(providerID)).Find(&availabilities)

	return c.JSON(availabilities)
}

// AdminListBookings lists all bookings with filters
func (h *WellnessHandler) AdminListBookings(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.WellnessBooking{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var bookings []models.WellnessBooking
	query.
		Preload("User").
		Preload("Service").
		Preload("Provider").
		Preload("Guest").
		Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&bookings)

	return c.JSON(fiber.Map{
		"bookings": bookings,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// AdminUpdateBookingStatus updates a booking's status
func (h *WellnessHandler) AdminUpdateBookingStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var booking models.WellnessBooking
	if err := database.DB.First(&booking, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut requis"})
	}

	database.DB.Model(&booking).Update("status", req.Status)
	database.DB.Preload("User").Preload("Service").Preload("Provider").First(&booking, uint(id))

	return c.JSON(booking)
}

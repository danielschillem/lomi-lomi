package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type DeliveryHandler struct{}

func NewDeliveryHandler() *DeliveryHandler {
	return &DeliveryHandler{}
}

// ---- Delivery Addresses ----

func (h *DeliveryHandler) GetAddresses(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	var addresses []models.DeliveryAddress
	database.DB.Where("user_id = ?", userID).Order("is_default DESC, created_at DESC").Find(&addresses)
	return c.JSON(fiber.Map{"addresses": addresses})
}

func (h *DeliveryHandler) CreateAddress(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var addr models.DeliveryAddress
	if err := c.BodyParser(&addr); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if addr.FullName == "" || addr.Address == "" || addr.City == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom, adresse et ville requis"})
	}

	addr.UserID = userID
	addr.ID = 0

	// If this is the first address or marked default, clear others
	if addr.IsDefault {
		database.DB.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Update("is_default", false)
	} else {
		var count int64
		database.DB.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Count(&count)
		if count == 0 {
			addr.IsDefault = true
		}
	}

	database.DB.Create(&addr)
	return c.Status(fiber.StatusCreated).JSON(addr)
}

func (h *DeliveryHandler) UpdateAddress(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var addr models.DeliveryAddress
	if err := database.DB.Where("id = ? AND user_id = ?", uint(id), userID).First(&addr).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Adresse non trouvée"})
	}

	type Req struct {
		Label      *string `json:"label"`
		FullName   *string `json:"full_name"`
		Phone      *string `json:"phone"`
		Address    *string `json:"address"`
		City       *string `json:"city"`
		PostalCode *string `json:"postal_code"`
		Country    *string `json:"country"`
		IsDefault  *bool   `json:"is_default"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	updates := map[string]interface{}{}
	if req.Label != nil {
		updates["label"] = *req.Label
	}
	if req.FullName != nil {
		updates["full_name"] = *req.FullName
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.City != nil {
		updates["city"] = *req.City
	}
	if req.PostalCode != nil {
		updates["postal_code"] = *req.PostalCode
	}
	if req.Country != nil {
		updates["country"] = *req.Country
	}
	if req.IsDefault != nil && *req.IsDefault {
		database.DB.Model(&models.DeliveryAddress{}).Where("user_id = ?", userID).Update("is_default", false)
		updates["is_default"] = true
	}

	if len(updates) > 0 {
		database.DB.Model(&addr).Updates(updates)
	}

	database.DB.First(&addr, uint(id))
	return c.JSON(addr)
}

func (h *DeliveryHandler) DeleteAddress(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	result := database.DB.Where("id = ? AND user_id = ?", uint(id), userID).Delete(&models.DeliveryAddress{})
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Adresse non trouvée"})
	}
	return c.JSON(fiber.Map{"message": "Adresse supprimée"})
}

// ---- Place Reservations (user side) ----

func (h *DeliveryHandler) CreatePlaceReservation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		PlaceID uint   `json:"place_id"`
		Date    string `json:"date"`
		EndDate string `json:"end_date"`
		Persons int    `json:"persons"`
		Notes   string `json:"notes"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.PlaceID == 0 || req.Date == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lieu et date requis"})
	}

	// Verify place exists
	var place models.Place
	if err := database.DB.First(&place, req.PlaceID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lieu non trouvé"})
	}

	reservation := models.PlaceReservation{
		PlaceID: req.PlaceID,
		UserID:  userID,
		Persons: req.Persons,
		Notes:   req.Notes,
		Status:  "pending",
	}

	if reservation.Persons <= 0 {
		reservation.Persons = 1
	}

	// Parse dates
	var err error
	reservation.Date, err = parseDate(req.Date)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format de date invalide (YYYY-MM-DD)"})
	}
	if req.EndDate != "" {
		reservation.EndDate, err = parseDate(req.EndDate)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format de date de fin invalide"})
		}
	} else {
		reservation.EndDate = reservation.Date
	}

	database.DB.Create(&reservation)
	database.DB.Preload("Place").Preload("User").First(&reservation, reservation.ID)
	return c.Status(fiber.StatusCreated).JSON(reservation)
}

func (h *DeliveryHandler) GetMyReservations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	var reservations []models.PlaceReservation
	database.DB.
		Preload("Place").
		Where("user_id = ?", userID).
		Order("date DESC").
		Find(&reservations)
	return c.JSON(fiber.Map{"reservations": reservations})
}

func (h *DeliveryHandler) CancelReservation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var reservation models.PlaceReservation
	if err := database.DB.Where("id = ? AND user_id = ?", uint(id), userID).First(&reservation).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}

	if reservation.Status != "pending" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seules les réservations en attente peuvent être annulées"})
	}

	database.DB.Model(&reservation).Update("status", "canceled")
	return c.JSON(fiber.Map{"message": "Réservation annulée"})
}

// ---- Order Tracking (user side) ----

func (h *DeliveryHandler) GetOrderTracking(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var order models.Order
	if err := database.DB.
		Preload("Items.Product").
		Preload("DeliveryAddress").
		Where("id = ? AND user_id = ?", uint(id), userID).
		First(&order).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	// Build tracking steps
	steps := []fiber.Map{
		{"step": "pending", "label": "Commande passée", "done": true},
		{"step": "confirmed", "label": "Confirmée", "done": order.Status != "pending" && order.Status != "canceled"},
		{"step": "preparing", "label": "En préparation", "done": order.Status == "preparing" || order.Status == "shipped" || order.Status == "delivered"},
		{"step": "shipped", "label": "Expédiée", "done": order.Status == "shipped" || order.Status == "delivered"},
		{"step": "delivered", "label": "Livrée", "done": order.Status == "delivered"},
	}

	return c.JSON(fiber.Map{
		"order":    order,
		"tracking": steps,
	})
}

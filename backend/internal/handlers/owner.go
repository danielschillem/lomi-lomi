package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type OwnerHandler struct{}

func NewOwnerHandler() *OwnerHandler {
	return &OwnerHandler{}
}

// ---- Dashboard Stats ----

func (h *OwnerHandler) GetStats(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)

	var placeCount, productCount, wellnessCount int64
	database.DB.Model(&models.Place{}).Where("owner_id = ?", ownerID).Count(&placeCount)
	database.DB.Model(&models.Product{}).Where("owner_id = ?", ownerID).Count(&productCount)
	database.DB.Model(&models.WellnessProvider{}).Where("owner_id = ?", ownerID).Count(&wellnessCount)

	// Orders for my products
	var orderCount int64
	database.DB.Model(&models.OrderItem{}).
		Joins("JOIN products ON products.id = order_items.product_id").
		Where("products.owner_id = ?", ownerID).
		Distinct("order_items.order_id").
		Count(&orderCount)

	// Revenue from my products
	var revenue struct{ Total float64 }
	database.DB.Model(&models.OrderItem{}).
		Select("COALESCE(SUM(order_items.price * order_items.quantity), 0) as total").
		Joins("JOIN products ON products.id = order_items.product_id").
		Where("products.owner_id = ?", ownerID).
		Scan(&revenue)

	// Wellness bookings for my providers
	var bookingCount int64
	database.DB.Model(&models.WellnessBooking{}).
		Joins("JOIN wellness_providers ON wellness_providers.id = wellness_bookings.provider_id").
		Where("wellness_providers.owner_id = ?", ownerID).
		Count(&bookingCount)

	// Place reservations
	var reservationCount int64
	database.DB.Model(&models.PlaceReservation{}).
		Joins("JOIN places ON places.id = place_reservations.place_id").
		Where("places.owner_id = ?", ownerID).
		Count(&reservationCount)

	return c.JSON(fiber.Map{
		"places":       placeCount,
		"products":     productCount,
		"wellness":     wellnessCount,
		"orders":       orderCount,
		"revenue":      revenue.Total,
		"bookings":     bookingCount,
		"reservations": reservationCount,
	})
}

// ---- My Places ----

func (h *OwnerHandler) GetMyPlaces(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	var places []models.Place
	database.DB.Where("owner_id = ?", ownerID).Order("created_at DESC").Find(&places)
	return c.JSON(fiber.Map{"places": places})
}

func (h *OwnerHandler) UpdateMyPlace(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var place models.Place
	if err := database.DB.Where("id = ? AND owner_id = ?", uint(id), ownerID).First(&place).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lieu non trouvé"})
	}

	type Req struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Address     *string  `json:"address"`
		City        *string  `json:"city"`
		Phone       *string  `json:"phone"`
		Website     *string  `json:"website"`
		ImageURL    *string  `json:"image_url"`
		Latitude    *float64 `json:"latitude"`
		Longitude   *float64 `json:"longitude"`
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
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.City != nil {
		updates["city"] = *req.City
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.Latitude != nil {
		updates["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updates["longitude"] = *req.Longitude
	}
	if len(updates) > 0 {
		database.DB.Model(&place).Updates(updates)
	}

	database.DB.First(&place, uint(id))
	return c.JSON(place)
}

// ---- My Products ----

func (h *OwnerHandler) GetMyProducts(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	var products []models.Product
	database.DB.Where("owner_id = ?", ownerID).Order("created_at DESC").Find(&products)
	return c.JSON(fiber.Map{"products": products})
}

func (h *OwnerHandler) CreateMyProduct(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)

	var product models.Product
	if err := c.BodyParser(&product); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if product.Name == "" || product.Price <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom et prix requis"})
	}

	product.OwnerID = ownerID
	product.ID = 0
	database.DB.Create(&product)
	return c.Status(fiber.StatusCreated).JSON(product)
}

func (h *OwnerHandler) UpdateMyProduct(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var product models.Product
	if err := database.DB.Where("id = ? AND owner_id = ?", uint(id), ownerID).First(&product).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Produit non trouvé"})
	}

	type Req struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Price       *float64 `json:"price"`
		ImageURL    *string  `json:"image_url"`
		Category    *string  `json:"category"`
		Stock       *int     `json:"stock"`
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
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.Stock != nil {
		updates["stock"] = *req.Stock
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if len(updates) > 0 {
		database.DB.Model(&product).Updates(updates)
	}

	database.DB.First(&product, uint(id))
	return c.JSON(product)
}

func (h *OwnerHandler) DeleteMyProduct(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	result := database.DB.Where("id = ? AND owner_id = ?", uint(id), ownerID).Delete(&models.Product{})
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Produit non trouvé"})
	}
	return c.JSON(fiber.Map{"message": "Produit supprimé"})
}

// ---- My Orders (orders containing my products) ----

func (h *OwnerHandler) GetMyOrders(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	// Find order IDs that contain my products
	var orderIDs []uint
	database.DB.Model(&models.OrderItem{}).
		Select("DISTINCT order_items.order_id").
		Joins("JOIN products ON products.id = order_items.product_id").
		Where("products.owner_id = ?", ownerID).
		Pluck("order_items.order_id", &orderIDs)

	if len(orderIDs) == 0 {
		return c.JSON(fiber.Map{"orders": []interface{}{}, "total": 0, "page": page, "limit": limit})
	}

	var total int64
	database.DB.Model(&models.Order{}).Where("id IN ?", orderIDs).Count(&total)

	var orders []models.Order
	database.DB.
		Preload("User").
		Preload("Items.Product").
		Preload("DeliveryAddress").
		Where("id IN ?", orderIDs).
		Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&orders)

	return c.JSON(fiber.Map{
		"orders": orders,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

func (h *OwnerHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	// Verify this order contains owner's products
	var count int64
	database.DB.Model(&models.OrderItem{}).
		Joins("JOIN products ON products.id = order_items.product_id").
		Where("order_items.order_id = ? AND products.owner_id = ?", uint(id), ownerID).
		Count(&count)
	if count == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut requis"})
	}

	validStatuses := map[string]bool{
		"confirmed": true, "preparing": true, "shipped": true, "delivered": true, "canceled": true,
	}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut invalide"})
	}

	var order models.Order
	database.DB.First(&order, uint(id))
	database.DB.Model(&order).Update("status", req.Status)
	database.DB.Preload("User").Preload("Items.Product").Preload("DeliveryAddress").First(&order, uint(id))

	return c.JSON(order)
}

// ---- My Wellness Bookings ----

func (h *OwnerHandler) GetMyWellnessBookings(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	var providerIDs []uint
	database.DB.Model(&models.WellnessProvider{}).Where("owner_id = ?", ownerID).Pluck("id", &providerIDs)

	if len(providerIDs) == 0 {
		return c.JSON(fiber.Map{"bookings": []interface{}{}, "total": 0, "page": page, "limit": limit})
	}

	var total int64
	database.DB.Model(&models.WellnessBooking{}).Where("provider_id IN ?", providerIDs).Count(&total)

	var bookings []models.WellnessBooking
	database.DB.
		Preload("User").
		Preload("Service").
		Preload("Provider").
		Where("provider_id IN ?", providerIDs).
		Offset(offset).Limit(limit).
		Order("date DESC, start_time DESC").
		Find(&bookings)

	return c.JSON(fiber.Map{
		"bookings": bookings,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func (h *OwnerHandler) UpdateBookingStatus(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var booking models.WellnessBooking
	if err := database.DB.First(&booking, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}

	// Check provider belongs to owner
	var provider models.WellnessProvider
	if err := database.DB.Where("id = ? AND owner_id = ?", booking.ProviderID, ownerID).First(&provider).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès refusé"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut requis"})
	}

	validStatuses := map[string]bool{
		"confirmed": true, "completed": true, "canceled": true,
	}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut invalide"})
	}

	database.DB.Model(&booking).Update("status", req.Status)
	database.DB.Preload("User").Preload("Service").Preload("Provider").First(&booking, uint(id))
	return c.JSON(booking)
}

// ---- My Place Reservations ----

func (h *OwnerHandler) GetMyPlaceReservations(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	var placeIDs []uint
	database.DB.Model(&models.Place{}).Where("owner_id = ?", ownerID).Pluck("id", &placeIDs)

	if len(placeIDs) == 0 {
		return c.JSON(fiber.Map{"reservations": []interface{}{}, "total": 0, "page": page, "limit": limit})
	}

	var total int64
	database.DB.Model(&models.PlaceReservation{}).Where("place_id IN ?", placeIDs).Count(&total)

	var reservations []models.PlaceReservation
	database.DB.
		Preload("Place").
		Preload("User").
		Where("place_id IN ?", placeIDs).
		Offset(offset).Limit(limit).
		Order("date DESC").
		Find(&reservations)

	return c.JSON(fiber.Map{
		"reservations": reservations,
		"total":        total,
		"page":         page,
		"limit":        limit,
	})
}

func (h *OwnerHandler) UpdateReservationStatus(c *fiber.Ctx) error {
	ownerID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var reservation models.PlaceReservation
	if err := database.DB.First(&reservation, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}

	// Check place belongs to owner
	var place models.Place
	if err := database.DB.Where("id = ? AND owner_id = ?", reservation.PlaceID, ownerID).First(&place).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès refusé"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut requis"})
	}

	validStatuses := map[string]bool{
		"confirmed": true, "completed": true, "canceled": true,
	}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut invalide"})
	}

	database.DB.Model(&reservation).Update("status", req.Status)
	database.DB.Preload("Place").Preload("User").First(&reservation, uint(id))
	return c.JSON(reservation)
}

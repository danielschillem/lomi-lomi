package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

// ---- Stats ----

func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	var userCount, productCount, placeCount, orderCount, messageCount, wellnessProviderCount, wellnessBookingCount int64
	database.DB.Model(&models.User{}).Count(&userCount)
	database.DB.Model(&models.Product{}).Count(&productCount)
	database.DB.Model(&models.Place{}).Count(&placeCount)
	database.DB.Model(&models.Order{}).Count(&orderCount)
	database.DB.Model(&models.Message{}).Count(&messageCount)
	database.DB.Model(&models.WellnessProvider{}).Count(&wellnessProviderCount)
	database.DB.Model(&models.WellnessBooking{}).Count(&wellnessBookingCount)

	var revenue struct{ Total float64 }
	database.DB.Model(&models.Order{}).Select("COALESCE(SUM(total_amount),0) as total").Scan(&revenue)

	return c.JSON(fiber.Map{
		"users":              userCount,
		"products":           productCount,
		"places":             placeCount,
		"orders":             orderCount,
		"messages":           messageCount,
		"revenue":            revenue.Total,
		"wellness_providers": wellnessProviderCount,
		"wellness_bookings":  wellnessBookingCount,
	})
}

func (h *AdminHandler) GetStatsTimeline(c *fiber.Ctx) error {
	days := 30
	if d, err := strconv.Atoi(c.Query("days", "30")); err == nil && d > 0 && d <= 90 {
		days = d
	}

	type DayStat struct {
		Day   string  `json:"day"`
		Count int64   `json:"count"`
		Total float64 `json:"total,omitempty"`
	}

	since := time.Now().AddDate(0, 0, -days)

	var signups []DayStat
	database.DB.Model(&models.User{}).
		Select("DATE(created_at) as day, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").Order("day ASC").Find(&signups)

	var matches []DayStat
	database.DB.Model(&models.Match{}).
		Select("DATE(created_at) as day, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").Order("day ASC").Find(&matches)

	var messages []DayStat
	database.DB.Model(&models.Message{}).
		Select("DATE(created_at) as day, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").Order("day ASC").Find(&messages)

	var orders []DayStat
	database.DB.Model(&models.Order{}).
		Select("DATE(created_at) as day, COUNT(*) as count, COALESCE(SUM(total_amount),0) as total").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").Order("day ASC").Find(&orders)

	return c.JSON(fiber.Map{
		"signups":  signups,
		"matches":  matches,
		"messages": messages,
		"orders":   orders,
	})
}

// ---- Users CRUD ----

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.User{})
	if search != "" {
		query = query.Where("username LIKE ? OR email LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var users []models.User
	query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users)

	return c.JSON(fiber.Map{
		"users": users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var user models.User
	if err := database.DB.First(&user, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	type Req struct {
		Role       *string `json:"role"`
		IsVerified *bool   `json:"is_verified"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	updates := map[string]interface{}{}
	if req.Role != nil && (*req.Role == "user" || *req.Role == "admin" || *req.Role == "owner") {
		updates["role"] = *req.Role
	}
	if req.IsVerified != nil {
		updates["is_verified"] = *req.IsVerified
	}
	if len(updates) > 0 {
		database.DB.Model(&user).Updates(updates)
	}

	database.DB.First(&user, uint(id))
	return c.JSON(user)
}

func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	if err := database.DB.Delete(&models.User{}, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Suppression impossible"})
	}

	return c.JSON(fiber.Map{"message": "Utilisateur supprimé"})
}

// ---- Products CRUD ----

func (h *AdminHandler) CreateProduct(c *fiber.Ctx) error {
	var product models.Product
	if err := c.BodyParser(&product); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if product.Name == "" || product.Price <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom et prix requis"})
	}

	// Validate owner exists if specified
	if product.OwnerID != 0 {
		var owner models.User
		if err := database.DB.First(&owner, product.OwnerID).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Propriétaire non trouvé"})
		}
	}

	database.DB.Create(&product)
	return c.Status(fiber.StatusCreated).JSON(product)
}

func (h *AdminHandler) UpdateProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var product models.Product
	if err := database.DB.First(&product, uint(id)).Error; err != nil {
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
		OwnerID     *uint    `json:"owner_id"`
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
	if req.OwnerID != nil {
		updates["owner_id"] = *req.OwnerID
	}

	if len(updates) > 0 {
		database.DB.Model(&product).Updates(updates)
	}

	database.DB.First(&product, uint(id))
	return c.JSON(product)
}

func (h *AdminHandler) DeleteProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	if err := database.DB.Delete(&models.Product{}, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Suppression impossible"})
	}

	return c.JSON(fiber.Map{"message": "Produit supprimé"})
}

// ---- Places CRUD ----

func (h *AdminHandler) CreatePlace(c *fiber.Ctx) error {
	var place models.Place
	if err := c.BodyParser(&place); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if place.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom requis"})
	}

	// Validate owner exists if specified
	if place.OwnerID != 0 {
		var owner models.User
		if err := database.DB.First(&owner, place.OwnerID).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Propriétaire non trouvé"})
		}
	}

	database.DB.Create(&place)
	return c.Status(fiber.StatusCreated).JSON(place)
}

func (h *AdminHandler) UpdatePlace(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var place models.Place
	if err := database.DB.First(&place, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Lieu non trouvé"})
	}

	type Req struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Category    *string  `json:"category"`
		Address     *string  `json:"address"`
		City        *string  `json:"city"`
		Latitude    *float64 `json:"latitude"`
		Longitude   *float64 `json:"longitude"`
		ImageURL    *string  `json:"image_url"`
		Phone       *string  `json:"phone"`
		Website     *string  `json:"website"`
		Rating      *float64 `json:"rating"`
		IsPartner   *bool    `json:"is_partner"`
		OwnerID     *uint    `json:"owner_id"`
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
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}
	if req.Rating != nil {
		updates["rating"] = *req.Rating
	}
	if req.IsPartner != nil {
		updates["is_partner"] = *req.IsPartner
	}
	if req.OwnerID != nil {
		updates["owner_id"] = *req.OwnerID
	}

	if len(updates) > 0 {
		database.DB.Model(&place).Updates(updates)
	}

	database.DB.First(&place, uint(id))
	return c.JSON(place)
}

func (h *AdminHandler) DeletePlace(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	if err := database.DB.Delete(&models.Place{}, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Suppression impossible"})
	}

	return c.JSON(fiber.Map{"message": "Lieu supprimé"})
}

// ---- Orders ----

func (h *AdminHandler) ListOrders(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	var total int64
	database.DB.Model(&models.Order{}).Count(&total)

	var orders []models.Order
	database.DB.
		Preload("User").
		Preload("Items.Product").
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

func (h *AdminHandler) UpdateOrderStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var order models.Order
	if err := database.DB.First(&order, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut requis"})
	}

	database.DB.Model(&order).Update("status", req.Status)
	database.DB.Preload("User").Preload("Items.Product").First(&order, uint(id))

	return c.JSON(order)
}

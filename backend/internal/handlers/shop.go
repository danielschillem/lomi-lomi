package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
	"gorm.io/gorm"
)

type ShopHandler struct{}

func NewShopHandler() *ShopHandler {
	return &ShopHandler{}
}

func (h *ShopHandler) GetProducts(c *fiber.Ctx) error {
	category := c.Query("category")

	query := database.DB.Where("is_active = ?", true)
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var products []models.Product
	query.Order("created_at DESC").Find(&products)

	return c.JSON(products)
}

func (h *ShopHandler) GetProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID invalide",
		})
	}

	var product models.Product
	if err := database.DB.First(&product, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Produit non trouvé",
		})
	}

	return c.JSON(product)
}

func (h *ShopHandler) CreateOrder(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type OrderItemReq struct {
		ProductID uint `json:"product_id"`
		Quantity  int  `json:"quantity"`
	}

	type CreateOrderReq struct {
		Items []OrderItemReq `json:"items"`
	}

	var req CreateOrderReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	if len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Le panier est vide",
		})
	}

	var totalAmount float64
	var orderItems []models.OrderItem

	for _, item := range req.Items {
		if item.Quantity <= 0 {
			continue
		}
		var product models.Product
		if err := database.DB.First(&product, item.ProductID).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Produit #" + strconv.FormatUint(uint64(item.ProductID), 10) + " non trouvé",
			})
		}
		if product.Stock < item.Quantity {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": product.Name + " : stock insuffisant",
			})
		}

		lineTotal := product.Price * float64(item.Quantity)
		totalAmount += lineTotal
		orderItems = append(orderItems, models.OrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Price:     product.Price,
		})
	}

	order := models.Order{
		UserID:      userID,
		TotalAmount: totalAmount,
		Status:      "pending",
		Items:       orderItems,
	}

	if err := database.DB.Create(&order).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible de créer la commande",
		})
	}

	// Decrease stock
	for _, item := range req.Items {
		database.DB.Model(&models.Product{}).
			Where("id = ?", item.ProductID).
			UpdateColumn("stock", gorm.Expr("stock - ?", item.Quantity))
	}

	database.DB.Preload("Items.Product").First(&order, order.ID)

	return c.Status(fiber.StatusCreated).JSON(order)
}

func (h *ShopHandler) GetOrders(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var orders []models.Order
	database.DB.
		Preload("Items.Product").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&orders)

	return c.JSON(orders)
}

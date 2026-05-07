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

	products := make([]models.Product, 0)
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
		Items             []OrderItemReq `json:"items"`
		DeliveryAddressID *uint          `json:"delivery_address_id"`
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
		UserID:            userID,
		TotalAmount:       totalAmount,
		Status:            "pending",
		Items:             orderItems,
		DeliveryAddressID: req.DeliveryAddressID,
	}

	// Transaction : création commande uniquement — décrémentation stock à la confirmation de paiement
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Create(&order).Error
	})
	if err != nil {
		if fe, ok := err.(*fiber.Error); ok {
			return c.Status(fe.Code).JSON(fiber.Map{"error": fe.Message})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible de créer la commande",
		})
	}

	database.DB.Preload("Items.Product").First(&order, order.ID)

	return c.Status(fiber.StatusCreated).JSON(order)
}

func (h *ShopHandler) GetOrders(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	orders := make([]models.Order, 0)
	database.DB.
		Preload("Items.Product").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&orders)

	return c.JSON(orders)
}

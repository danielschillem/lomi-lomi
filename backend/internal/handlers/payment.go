package handlers

import (
	"encoding/json"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
	"github.com/stripe/stripe-go/v78/webhook"
)

type PaymentHandler struct {
	Config *config.Config
}

func NewPaymentHandler(cfg *config.Config) *PaymentHandler {
	stripe.Key = cfg.StripeSecretKey
	return &PaymentHandler{Config: cfg}
}

func (h *PaymentHandler) CreateCheckout(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		OrderID uint `json:"order_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.OrderID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_id requis"})
	}

	var order models.Order
	if err := database.DB.Preload("Items.Product").Where("id = ? AND user_id = ?", req.OrderID, userID).First(&order).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	if order.Status != "pending" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Commande déjà traitée"})
	}

	var lineItems []*stripe.CheckoutSessionLineItemParams
	for _, item := range order.Items {
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String("xaf"),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(item.Product.Name),
				},
				UnitAmount: stripe.Int64(int64(item.Price)),
			},
			Quantity: stripe.Int64(int64(item.Quantity)),
		})
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems:          lineItems,
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(h.Config.CORSOrigin + "/boutique?success=true"),
		CancelURL:          stripe.String(h.Config.CORSOrigin + "/boutique?canceled=true"),
		Metadata: map[string]string{
			"order_id": strconv.FormatUint(uint64(order.ID), 10),
		},
	}

	s, err := session.New(params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur Stripe: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"checkout_url": s.URL,
		"session_id":   s.ID,
	})
}

func (h *PaymentHandler) HandleWebhook(c *fiber.Ctx) error {
	body := c.Body()
	sigHeader := c.Get("Stripe-Signature")

	event, err := webhook.ConstructEvent(body, sigHeader, h.Config.StripeWebhookSec)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Signature invalide"})
	}

	if event.Type == "checkout.session.completed" {
		var cs stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &cs); err == nil {
			if orderIDStr, ok := cs.Metadata["order_id"]; ok {
				orderID, _ := strconv.ParseUint(orderIDStr, 10, 32)
				database.DB.Model(&models.Order{}).Where("id = ?", uint(orderID)).Updates(map[string]interface{}{
					"status":     "paid",
					"payment_id": cs.PaymentIntent.ID,
				})
			}
		}
	}

	return c.SendStatus(fiber.StatusOK)
}

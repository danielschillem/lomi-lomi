package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type OrangeMoneyHandler struct {
	Config *config.Config
}

func NewOrangeMoneyHandler(cfg *config.Config) *OrangeMoneyHandler {
	return &OrangeMoneyHandler{Config: cfg}
}

// generateTxnID creates a unique transaction reference
func generateTxnID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return "LOM-" + hex.EncodeToString(b)
}

// InitiatePayment creates an Orange Money web payment session
func (h *OrangeMoneyHandler) InitiatePayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		OrderID uint   `json:"order_id"`
		Phone   string `json:"phone"`
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

	txnID := generateTxnID()
	amount := int64(order.TotalAmount)

	// If Orange Money API key is configured, call the real API
	if h.Config.OrangeMoneyAPIKey != "" {
		payURL, err := h.callOrangeMoneyAPI(txnID, amount, req.Phone)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur Orange Money: " + err.Error()})
		}

		// Save payment reference on order
		database.DB.Model(&order).Updates(map[string]interface{}{
			"payment_id": txnID,
		})

		return c.JSON(fiber.Map{
			"payment_url":    payURL,
			"transaction_id": txnID,
			"amount":         amount,
			"currency":       "XOF",
			"status":         "pending",
		})
	}

	// Dev mode: no OM API key configured, simulate payment
	database.DB.Model(&order).Updates(map[string]interface{}{
		"status":     "paid",
		"payment_id": txnID,
	})

	return c.JSON(fiber.Map{
		"payment_url":    "",
		"transaction_id": txnID,
		"amount":         amount,
		"currency":       "XOF",
		"status":         "paid",
		"message":        "Paiement simulé (mode dev - OM_API_KEY non configuré)",
	})
}

// callOrangeMoneyAPI initiates a real Orange Money web payment
func (h *OrangeMoneyHandler) callOrangeMoneyAPI(txnID string, amount int64, phone string) (string, error) {
	baseURL := h.Config.OrangeMoneyBaseURL

	// Build the items description
	payload := map[string]interface{}{
		"merchant_key":   h.Config.OrangeMoneyAPIKey,
		"currency":       "OUV", // Orange Money currency code for XOF
		"order_id":       txnID,
		"amount":         amount,
		"return_url":     h.Config.CORSOrigin + "/boutique?success=true",
		"cancel_url":     h.Config.CORSOrigin + "/boutique?canceled=true",
		"notif_url":      h.Config.BaseURL + "/api/v1/om/webhook",
		"lang":           "fr",
		"reference":      txnID,
		"customer_phone": phone,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("json marshal: %w", err)
	}

	req, err := http.NewRequest("POST", baseURL+"/webpayment", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.Config.OrangeMoneyAPIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Status     int    `json:"status"`
		Message    string `json:"message"`
		PayToken   string `json:"pay_token"`
		PaymentURL string `json:"payment_url"`
		NotifToken string `json:"notif_token"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	if result.PaymentURL != "" {
		return result.PaymentURL, nil
	}

	return "", fmt.Errorf("no payment URL in response: %s", string(respBody))
}

// HandleWebhook handles Orange Money payment notifications
func (h *OrangeMoneyHandler) HandleWebhook(c *fiber.Ctx) error {
	type Notification struct {
		Status     string `json:"status"`
		OrderID    string `json:"order_id"`
		TxnID      string `json:"txnid"`
		PayToken   string `json:"pay_token"`
		NotifToken string `json:"notif_token"`
	}

	var notif Notification
	if err := c.BodyParser(&notif); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if notif.Status == "SUCCESS" || notif.Status == "SUCCESSFULL" {
		// Find order by payment_id (txnID)
		ref := notif.OrderID
		if ref == "" {
			ref = notif.TxnID
		}
		database.DB.Model(&models.Order{}).
			Where("payment_id = ?", ref).
			Updates(map[string]interface{}{
				"status": "paid",
			})
	}

	return c.SendStatus(fiber.StatusOK)
}

// CheckPaymentStatus allows frontend to poll payment status
func (h *OrangeMoneyHandler) CheckPaymentStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	orderID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var order models.Order
	if err := database.DB.Where("id = ? AND user_id = ?", uint(orderID), userID).First(&order).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	return c.JSON(fiber.Map{
		"order_id":       order.ID,
		"status":         order.Status,
		"transaction_id": order.PaymentID,
	})
}

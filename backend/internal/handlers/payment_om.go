package handlers

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
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
	return "LOM" + hex.EncodeToString(b)
}

// --- XML-RPC structures for Orange Money BF API ---

type omRequest struct {
	XMLName        xml.Name `xml:"COMMAND"`
	Type           string   `xml:"TYPE"`
	CustomerMSISDN string   `xml:"customer_msisdn"`
	MerchantMSISDN string   `xml:"merchant_msisdn"`
	APIUsername    string   `xml:"api_username"`
	APIPassword    string   `xml:"api_password"`
	Amount         int64    `xml:"amount"`
	Provider       string   `xml:"PROVIDER"`
	Provider2      string   `xml:"PROVIDER2"`
	PayID          string   `xml:"PAYID"`
	PayID2         string   `xml:"PAYID2"`
	OTP            string   `xml:"otp"`
	ReferenceNum   string   `xml:"reference_number"`
	ExtTxnID       string   `xml:"ext_txn_id"`
}

type omResponse struct {
	Status  string `xml:"status"`
	Message string `xml:"message"`
	TransID string `xml:"transID"`
}

// GetUSSDCode returns the USSD code the customer must dial to generate OTP.
func (h *OrangeMoneyHandler) GetUSSDCode(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		OrderID uint `json:"order_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.OrderID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_id requis"})
	}

	var order models.Order
	if err := database.DB.Where("id = ? AND user_id = ?", req.OrderID, userID).First(&order).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	amount := int64(order.TotalAmount)

	// USSD code depends on environment
	var ussdCode string
	if h.Config.OMEnv == "production" {
		ussdCode = fmt.Sprintf("*144*4*6*%d#", amount)
	} else {
		ussdCode = fmt.Sprintf("*865*4*6*%d#", amount)
	}

	return c.JSON(fiber.Map{
		"order_id":  order.ID,
		"amount":    amount,
		"currency":  "XOF",
		"ussd_code": ussdCode,
		"message":   fmt.Sprintf("Composez %s sur votre téléphone Orange pour générer le code OTP, puis saisissez-le pour confirmer le paiement.", ussdCode),
	})
}

// ConfirmPayment processes the payment with the OTP provided by the customer.
// Flow: Customer dials USSD -> gets OTP -> enters OTP in app -> backend calls OM API.
func (h *OrangeMoneyHandler) ConfirmPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		OrderID uint   `json:"order_id"`
		Phone   string `json:"phone"`
		OTP     string `json:"otp"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	if req.OrderID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "order_id requis"})
	}
	if req.OTP == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Code OTP requis"})
	}

	// Validate phone: strip country code, keep 8 digits
	phone := strings.TrimSpace(req.Phone)
	phone = strings.TrimPrefix(phone, "+226")
	phone = strings.TrimPrefix(phone, "226")
	phone = strings.ReplaceAll(phone, " ", "")
	if len(phone) < 8 || len(phone) > 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Numéro de téléphone invalide"})
	}
	for _, r := range phone {
		if r < '0' || r > '9' {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Numéro de téléphone invalide"})
		}
	}

	// Validate OTP format (4-8 digits)
	otp := strings.TrimSpace(req.OTP)
	if len(otp) < 4 || len(otp) > 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Code OTP invalide"})
	}
	for _, r := range otp {
		if r < '0' || r > '9' {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Code OTP invalide"})
		}
	}

	// Load order
	var order models.Order
	if err := database.DB.Preload("Items.Product").Where("id = ? AND user_id = ?", req.OrderID, userID).First(&order).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande non trouvée"})
	}

	if order.Status != "pending" && order.Status != "payment_failed" && order.Status != "payment_expired" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Commande déjà traitée"})
	}

	amount := int64(order.TotalAmount)
	txnID := generateTxnID()

	// Dev mode: simulate if no credentials configured
	if h.Config.OMMerchantMSISDN == "" || h.Config.OMAPIUsername == "" {
		database.DB.Model(&order).Updates(map[string]interface{}{
			"status":     "paid",
			"payment_id": txnID,
		})
		return c.JSON(fiber.Map{
			"status":         "paid",
			"transaction_id": txnID,
			"amount":         amount,
			"currency":       "XOF",
			"message":        "Paiement simulé (mode dev - credentials OM non configurés)",
		})
	}

	// Call Orange Money XML-RPC API
	omResp, err := h.callOrangeMoneyXMLRPC(phone, otp, amount, txnID)
	if err != nil {
		log.Printf("[OM Payment] API error for order %d: %v", order.ID, err)
		database.DB.Model(&order).Updates(map[string]interface{}{
			"status":     "payment_failed",
			"payment_id": txnID,
		})
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":  "Échec du paiement Orange Money",
			"detail": err.Error(),
			"status": "payment_failed",
		})
	}

	// Check response status
	if omResp.Status == "200" {
		database.DB.Model(&order).Updates(map[string]interface{}{
			"status":     "paid",
			"payment_id": omResp.TransID,
		})

		// Notify user
		database.DB.Create(&models.Notification{
			UserID: order.UserID,
			Type:   "payment",
			Title:  "Paiement confirmé",
			Body:   fmt.Sprintf("Votre commande #%d a été payée avec succès. ID: %s", order.ID, omResp.TransID),
			Data:   fmt.Sprintf(`{"order_id":%d,"status":"paid","trans_id":"%s"}`, order.ID, omResp.TransID),
		})
		SendPushToUser(order.UserID, "Paiement confirmé ✓", fmt.Sprintf("Commande #%d payée", order.ID), map[string]interface{}{"type": "payment", "order_id": order.ID})

		return c.JSON(fiber.Map{
			"status":         "paid",
			"transaction_id": omResp.TransID,
			"amount":         amount,
			"currency":       "XOF",
			"message":        omResp.Message,
		})
	}

	// Payment failed
	database.DB.Model(&order).Updates(map[string]interface{}{
		"status":     "payment_failed",
		"payment_id": txnID,
	})

	errMsg := mapOMErrorMessage(omResp.Status, omResp.Message)

	database.DB.Create(&models.Notification{
		UserID: order.UserID,
		Type:   "payment",
		Title:  "Échec du paiement",
		Body:   fmt.Sprintf("Commande #%d : %s", order.ID, errMsg),
		Data:   fmt.Sprintf(`{"order_id":%d,"status":"payment_failed"}`, order.ID),
	})

	return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
		"status":     "payment_failed",
		"error_code": omResp.Status,
		"error":      errMsg,
		"message":    omResp.Message,
	})
}

// callOrangeMoneyXMLRPC sends the XML-RPC payment request to Orange Money BF
func (h *OrangeMoneyHandler) callOrangeMoneyXMLRPC(customerPhone, otp string, amount int64, extTxnID string) (*omResponse, error) {
	xmlReq := omRequest{
		Type:           "OMPREQ",
		CustomerMSISDN: customerPhone,
		MerchantMSISDN: h.Config.OMMerchantMSISDN,
		APIUsername:    h.Config.OMAPIUsername,
		APIPassword:    h.Config.OMAPIPassword,
		Amount:         amount,
		Provider:       h.Config.OMProvider,
		Provider2:      h.Config.OMProvider,
		PayID:          h.Config.OMPayID,
		PayID2:         h.Config.OMPayID,
		OTP:            otp,
		ReferenceNum:   extTxnID,
		ExtTxnID:       extTxnID,
	}

	body, err := xml.Marshal(xmlReq)
	if err != nil {
		return nil, fmt.Errorf("xml marshal: %w", err)
	}

	// Prepend XML declaration
	xmlBody := append([]byte(`<?xml version="1.0" encoding="UTF-8"?>`+"\n"), body...)

	apiURL := h.Config.OMBaseURL()
	req, err := http.NewRequest("POST", apiURL, bytes.NewReader(xmlBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/xml")

	client := &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				MinVersion: tls.VersionTLS12,
			},
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	log.Printf("[OM Payment] Response for %s: %s", extTxnID, string(respBody))

	// Parse XML response
	var omResp omResponse
	if err := xml.Unmarshal(respBody, &omResp); err != nil {
		// Try manual extraction as fallback
		respStr := string(respBody)
		if strings.Contains(respStr, "<status>") {
			omResp.Status = extractXMLTag(respStr, "status")
			omResp.Message = extractXMLTag(respStr, "message")
			omResp.TransID = extractXMLTag(respStr, "transID")
		} else {
			return nil, fmt.Errorf("parse response: %w (body: %s)", err, respStr)
		}
	}

	return &omResp, nil
}

// extractXMLTag extracts content between <tag> and </tag>
func extractXMLTag(xmlStr, tag string) string {
	start := strings.Index(xmlStr, "<"+tag+">")
	if start == -1 {
		return ""
	}
	start += len("<" + tag + ">")
	end := strings.Index(xmlStr[start:], "</"+tag+">")
	if end == -1 {
		return ""
	}
	return xmlStr[start : start+end]
}

// mapOMErrorMessage maps OM error codes to user-friendly French messages
func mapOMErrorMessage(code, originalMsg string) string {
	switch code {
	case "60019":
		return "Solde insuffisant sur votre compte Orange Money."
	case "990413", "990416":
		return "Code OTP incorrect. Veuillez réessayer."
	case "990417":
		return "Code OTP inexistant. Veuillez générer un nouveau code."
	case "990418":
		return "Code OTP déjà utilisé. Veuillez en générer un nouveau."
	case "990422":
		return "Numéro de téléphone invalide."
	case "60011", "0100012":
		return "Nombre maximum de transactions atteint pour aujourd'hui."
	case "60014", "0100024":
		return "Montant maximum de transactions atteint pour aujourd'hui."
	case "410", "00410", "99993", "100004":
		return "Le montant dépasse la limite autorisée."
	case "409", "00409", "99992", "99046":
		return "Le montant est inférieur au minimum autorisé."
	case "02117":
		return "Votre compte Orange Money est verrouillé. Contactez le service client."
	case "99996":
		return "Votre compte Orange Money est suspendu."
	case "00075", "99987":
		return "Service temporairement indisponible."
	default:
		if originalMsg != "" {
			return originalMsg
		}
		return "Erreur lors du paiement. Veuillez réessayer."
	}
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

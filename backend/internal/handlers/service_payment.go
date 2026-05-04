package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

// ServicePaymentHandler manages payment gates for messaging, reservations, bookings
type ServicePaymentHandler struct {
	Config *config.Config
}

func NewServicePaymentHandler(cfg *config.Config) *ServicePaymentHandler {
	return &ServicePaymentHandler{Config: cfg}
}

// CheckConnectionPaid checks if userA has already paid to message userB
func (h *ServicePaymentHandler) CheckConnectionPaid(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	targetID, err := c.ParamsInt("userId")
	if err != nil || targetID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID utilisateur invalide"})
	}

	var count int64
	database.DB.Model(&models.ServicePayment{}).Where(
		"user_id = ? AND target_user_id = ? AND type = ? AND status = ?",
		userID, targetID, "connection", "paid",
	).Count(&count)

	// Also check reverse direction (if the other person paid, both can chat)
	if count == 0 {
		database.DB.Model(&models.ServicePayment{}).Where(
			"user_id = ? AND target_user_id = ? AND type = ? AND status = ?",
			targetID, userID, "connection", "paid",
		).Count(&count)
	}

	return c.JSON(fiber.Map{
		"paid":   count > 0,
		"amount": models.ConnectionFee,
	})
}

// InitiateConnectionPayment creates a pending payment and returns USSD code
func (h *ServicePaymentHandler) InitiateConnectionPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		TargetUserID uint `json:"target_user_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.TargetUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID utilisateur cible requis"})
	}

	if req.TargetUserID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Impossible de se connecter à soi-même"})
	}

	// Check if already paid
	var count int64
	database.DB.Model(&models.ServicePayment{}).Where(
		"((user_id = ? AND target_user_id = ?) OR (user_id = ? AND target_user_id = ?)) AND type = ? AND status = ?",
		userID, req.TargetUserID, req.TargetUserID, userID, "connection", "paid",
	).Count(&count)
	if count > 0 {
		return c.JSON(fiber.Map{"already_paid": true, "message": "Connexion déjà payée"})
	}

	// Create pending payment
	payment := models.ServicePayment{
		UserID:       userID,
		TargetUserID: &req.TargetUserID,
		Type:         "connection",
		Amount:       models.ConnectionFee,
		Status:       "pending",
	}
	database.DB.Create(&payment)

	// Return USSD code
	ussdCode := ussdCodeForAmount(h.Config, models.ConnectionFee)

	return c.JSON(fiber.Map{
		"payment_id": payment.ID,
		"amount":     models.ConnectionFee,
		"currency":   "FCFA",
		"ussd_code":  ussdCode,
		"message":    "Composez le code USSD puis entrez le code OTP reçu",
	})
}

// ConfirmConnectionPayment confirms the OTP and marks payment as paid
func (h *ServicePaymentHandler) ConfirmConnectionPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		PaymentID uint   `json:"payment_id"`
		Phone     string `json:"phone"`
		OTP       string `json:"otp"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.PaymentID == 0 || req.Phone == "" || req.OTP == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_id, phone et otp requis"})
	}

	// Find pending payment
	var payment models.ServicePayment
	if err := database.DB.Where("id = ? AND user_id = ? AND status = ?", req.PaymentID, userID, "pending").First(&payment).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paiement non trouvé"})
	}

	// Call Orange Money XML-RPC
	omHandler := NewOrangeMoneyHandler(h.Config)
	extTxn := generateTxnID()
	resp, omErr := omHandler.callOrangeMoneyXMLRPC(req.Phone, req.OTP, int64(payment.Amount), extTxn)
	if omErr != nil {
		payment.Status = "failed"
		database.DB.Save(&payment)
		return c.JSON(fiber.Map{
			"status":  "failed",
			"message": omErr.Error(),
		})
	}
	if resp.Status != "200" {
		payment.Status = "failed"
		database.DB.Save(&payment)
		return c.JSON(fiber.Map{
			"status":  "failed",
			"message": mapOMErrorMessage(resp.Status, resp.Message),
		})
	}

	payment.Status = "paid"
	payment.TransactionID = resp.TransID
	database.DB.Save(&payment)

	return c.JSON(fiber.Map{
		"status":         "paid",
		"transaction_id": resp.TransID,
		"message":        "Connexion établie ! Vous pouvez maintenant discuter.",
	})
}

// InitiateReservationPayment creates payment for a place reservation
func (h *ServicePaymentHandler) InitiateReservationPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		ReservationID uint `json:"reservation_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.ReservationID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reservation_id requis"})
	}

	// Verify the reservation exists and belongs to user
	var reservation models.PlaceReservation
	if err := database.DB.Where("id = ? AND user_id = ?", req.ReservationID, userID).First(&reservation).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Réservation non trouvée"})
	}

	// Check if already paid
	var count int64
	database.DB.Model(&models.ServicePayment{}).Where(
		"user_id = ? AND reference_id = ? AND type = ? AND status = ?",
		userID, req.ReservationID, "reservation", "paid",
	).Count(&count)
	if count > 0 {
		return c.JSON(fiber.Map{"already_paid": true, "message": "Réservation déjà payée"})
	}

	payment := models.ServicePayment{
		UserID:      userID,
		Type:        "reservation",
		Amount:      models.ReservationFee,
		Status:      "pending",
		ReferenceID: &req.ReservationID,
	}
	database.DB.Create(&payment)

	ussdCode := ussdCodeForAmount(h.Config, models.ReservationFee)

	return c.JSON(fiber.Map{
		"payment_id": payment.ID,
		"amount":     models.ReservationFee,
		"currency":   "FCFA",
		"ussd_code":  ussdCode,
		"message":    "Composez le code USSD puis entrez le code OTP reçu",
	})
}

// ConfirmReservationPayment confirms payment for a place reservation
func (h *ServicePaymentHandler) ConfirmReservationPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		PaymentID uint   `json:"payment_id"`
		Phone     string `json:"phone"`
		OTP       string `json:"otp"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.PaymentID == 0 || req.Phone == "" || req.OTP == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_id, phone et otp requis"})
	}

	var payment models.ServicePayment
	if err := database.DB.Where("id = ? AND user_id = ? AND type = ? AND status = ?", req.PaymentID, userID, "reservation", "pending").First(&payment).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paiement non trouvé"})
	}

	omHandler := NewOrangeMoneyHandler(h.Config)
	extTxn := generateTxnID()
	resp, omErr := omHandler.callOrangeMoneyXMLRPC(req.Phone, req.OTP, int64(payment.Amount), extTxn)
	if omErr != nil {
		payment.Status = "failed"
		database.DB.Save(&payment)
		return c.JSON(fiber.Map{"status": "failed", "message": omErr.Error()})
	}
	if resp.Status != "200" {
		payment.Status = "failed"
		database.DB.Save(&payment)
		return c.JSON(fiber.Map{"status": "failed", "message": mapOMErrorMessage(resp.Status, resp.Message)})
	}

	payment.Status = "paid"
	payment.TransactionID = resp.TransID
	database.DB.Save(&payment)

	// Update reservation status to confirmed
	if payment.ReferenceID != nil {
		database.DB.Model(&models.PlaceReservation{}).Where("id = ?", *payment.ReferenceID).Update("status", "confirmed")
	}

	return c.JSON(fiber.Map{
		"status":         "paid",
		"transaction_id": resp.TransID,
		"message":        "Réservation confirmée !",
	})
}

// InitiateBookingPayment creates payment for a wellness booking
func (h *ServicePaymentHandler) InitiateBookingPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		BookingID uint `json:"booking_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.BookingID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "booking_id requis"})
	}

	var booking models.WellnessBooking
	if err := database.DB.Where("id = ? AND user_id = ?", req.BookingID, userID).First(&booking).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Rendez-vous non trouvé"})
	}

	// Check if already paid
	var count int64
	database.DB.Model(&models.ServicePayment{}).Where(
		"user_id = ? AND reference_id = ? AND type = ? AND status = ?",
		userID, req.BookingID, "booking", "paid",
	).Count(&count)
	if count > 0 {
		return c.JSON(fiber.Map{"already_paid": true, "message": "Rendez-vous déjà payé"})
	}

	payment := models.ServicePayment{
		UserID:      userID,
		Type:        "booking",
		Amount:      models.BookingFee,
		Status:      "pending",
		ReferenceID: &req.BookingID,
	}
	database.DB.Create(&payment)

	ussdCode := ussdCodeForAmount(h.Config, models.BookingFee)

	return c.JSON(fiber.Map{
		"payment_id": payment.ID,
		"amount":     models.BookingFee,
		"currency":   "FCFA",
		"ussd_code":  ussdCode,
		"message":    "Composez le code USSD puis entrez le code OTP reçu",
	})
}

// ConfirmBookingPayment confirms payment for a wellness booking
func (h *ServicePaymentHandler) ConfirmBookingPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		PaymentID uint   `json:"payment_id"`
		Phone     string `json:"phone"`
		OTP       string `json:"otp"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.PaymentID == 0 || req.Phone == "" || req.OTP == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "payment_id, phone et otp requis"})
	}

	var payment models.ServicePayment
	if err := database.DB.Where("id = ? AND user_id = ? AND type = ? AND status = ?", req.PaymentID, userID, "booking", "pending").First(&payment).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Paiement non trouvé"})
	}

	omHandler := NewOrangeMoneyHandler(h.Config)
	extTxn := generateTxnID()
	resp, omErr := omHandler.callOrangeMoneyXMLRPC(req.Phone, req.OTP, int64(payment.Amount), extTxn)
	if omErr != nil {
		payment.Status = "failed"
		database.DB.Save(&payment)
		return c.JSON(fiber.Map{"status": "failed", "message": omErr.Error()})
	}
	if resp.Status != "200" {
		payment.Status = "failed"
		database.DB.Save(&payment)
		return c.JSON(fiber.Map{"status": "failed", "message": mapOMErrorMessage(resp.Status, resp.Message)})
	}

	payment.Status = "paid"
	payment.TransactionID = resp.TransID
	database.DB.Save(&payment)

	// Update booking status to confirmed
	if payment.ReferenceID != nil {
		database.DB.Model(&models.WellnessBooking{}).Where("id = ?", *payment.ReferenceID).Update("status", "confirmed")
	}

	return c.JSON(fiber.Map{
		"status":         "paid",
		"transaction_id": resp.TransID,
		"message":        "Rendez-vous confirmé !",
	})
}

// ussdCodeForAmount returns the USSD code for a given amount
func ussdCodeForAmount(cfg *config.Config, amount int) string {
	if cfg.OMEnv == "prod" {
		return fmt.Sprintf("*144*4*6*%d#", amount)
	}
	return fmt.Sprintf("*865*4*6*%d#", amount)
}

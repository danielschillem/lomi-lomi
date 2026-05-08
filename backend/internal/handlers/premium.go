package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type PremiumHandler struct{}

func NewPremiumHandler() *PremiumHandler { return &PremiumHandler{} }

var premiumPlans = map[string]struct {
	Label    string
	Duration time.Duration
	Price    float64
}{
	"monthly": {"Mensuel", 30 * 24 * time.Hour, 2000},
	"yearly":  {"Annuel", 365 * 24 * time.Hour, 15000},
}

// GetPlans returns available premium plans.
func (h *PremiumHandler) GetPlans(c *fiber.Ctx) error {
	plans := []fiber.Map{
		{"id": "monthly", "name": "Lomi Pass Mensuel", "price": 2000, "currency": "XOF", "duration_days": 30, "features": []string{"Swipes illimités", "Voir qui m'a liké", "Super Likes (×5/jour)", "Rewind (annuler)", "Profil boosté 1×/mois"}},
		{"id": "yearly", "name": "Lomi Pass Annuel", "price": 15000, "currency": "XOF", "duration_days": 365, "features": []string{"Tout le mensuel", "Économisez 37%", "Boosts ×3/mois", "Super Likes illimités", "Badge Premium exclusif"}},
	}
	return c.JSON(fiber.Map{"plans": plans})
}

// GetMySubscription returns the current user's active subscription.
func (h *PremiumHandler) GetMySubscription(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var sub models.Subscription
	err := database.DB.Where("user_id = ? AND status = 'active' AND ends_at > ?", userID, time.Now()).
		Order("ends_at DESC").First(&sub).Error

	if err != nil {
		return c.JSON(fiber.Map{"is_premium": false})
	}

	return c.JSON(fiber.Map{
		"is_premium": true,
		"plan":       sub.Plan,
		"ends_at":    sub.EndsAt,
		"status":     sub.Status,
	})
}

// Subscribe activates premium for a user (called after successful OM payment).
func (h *PremiumHandler) Subscribe(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		Plan  string `json:"plan"`  // monthly or yearly
		Phone string `json:"phone"` // Orange Money number
		TxID  string `json:"tx_id"` // payment transaction ID (optional)
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Plan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Plan requis (monthly ou yearly)"})
	}

	plan, ok := premiumPlans[req.Plan]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Plan invalide"})
	}

	now := time.Now()
	endsAt := now.Add(plan.Duration)

	sub := models.Subscription{
		UserID:    userID,
		Plan:      req.Plan,
		Amount:    plan.Price,
		StartedAt: now,
		EndsAt:    endsAt,
		Status:    "active",
		TxID:      req.TxID,
		Phone:     req.Phone,
	}
	database.DB.Create(&sub)

	database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"is_premium":    true,
		"premium_until": endsAt,
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":    "Abonnement Premium activé",
		"plan":       req.Plan,
		"ends_at":    endsAt,
		"is_premium": true,
	})
}

// CancelSubscription cancels the active subscription.
func (h *PremiumHandler) CancelSubscription(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	database.DB.Model(&models.Subscription{}).
		Where("user_id = ? AND status = 'active'", userID).
		Update("status", "cancelled")

	database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"is_premium":    false,
		"premium_until": nil,
	})

	return c.JSON(fiber.Map{"message": "Abonnement annulé"})
}

// AdminGrantPremium (admin only) grants premium to a user manually.
func (h *PremiumHandler) AdminGrantPremium(c *fiber.Ctx) error {
	type Req struct {
		UserID uint   `json:"user_id"`
		Plan   string `json:"plan"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.UserID == 0 || req.Plan == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id et plan requis"})
	}

	plan, ok := premiumPlans[req.Plan]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Plan invalide"})
	}

	now := time.Now()
	endsAt := now.Add(plan.Duration)

	sub := models.Subscription{
		UserID:    req.UserID,
		Plan:      req.Plan,
		Amount:    0,
		StartedAt: now,
		EndsAt:    endsAt,
		Status:    "active",
		TxID:      "admin-grant",
	}
	database.DB.Create(&sub)
	database.DB.Model(&models.User{}).Where("id = ?", req.UserID).Updates(map[string]interface{}{
		"is_premium":    true,
		"premium_until": endsAt,
	})

	return c.JSON(fiber.Map{"message": "Premium accordé", "ends_at": endsAt})
}

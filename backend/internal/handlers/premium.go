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
	Boosts   int
	Badge    bool
}{
	"monthly": {"Mensuel", 30 * 24 * time.Hour, 2000, 1, false},
	"yearly":  {"Annuel", 365 * 24 * time.Hour, 15000, 3, true},
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
		"is_premium":        true,
		"premium_until":     endsAt,
		"has_badge":         plan.Badge,
		"boosts_remaining":  plan.Boosts,
		"boost_period_start": now,
	})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":          "Abonnement Premium activé",
		"plan":             req.Plan,
		"ends_at":          endsAt,
		"is_premium":       true,
		"boosts_remaining": plan.Boosts,
		"has_badge":        plan.Badge,
	})
}

// CancelSubscription cancels the active subscription.
func (h *PremiumHandler) CancelSubscription(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	database.DB.Model(&models.Subscription{}).
		Where("user_id = ? AND status = 'active'", userID).
		Update("status", "cancelled")

	database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"is_premium":       false,
		"premium_until":    nil,
		"has_badge":        false,
		"boosts_remaining": 0,
	})

	return c.JSON(fiber.Map{"message": "Abonnement annulé"})
}

// GetBoostStatus returns remaining boosts and whether the profile is currently boosted.
func (h *PremiumHandler) GetBoostStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	if err := database.DB.Select("id, is_premium, boosts_remaining, boost_period_start, last_boosted_at").
		First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if !user.IsPremium {
		return c.JSON(fiber.Map{"boosts_remaining": 0, "is_active": false})
	}

	now := time.Now()

	// Reset boosts if 30-day period has elapsed
	if !user.BoostPeriodStart.IsZero() && now.After(user.BoostPeriodStart.Add(30*24*time.Hour)) {
		var sub models.Subscription
		allotment := 1
		if err := database.DB.Where("user_id = ? AND status = 'active'", userID).First(&sub).Error; err == nil {
			if sub.Plan == "yearly" {
				allotment = 3
			}
		}
		database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"boosts_remaining":  allotment,
			"boost_period_start": now,
		})
		user.BoostsRemaining = allotment
	}

	isActive := user.LastBoostedAt != nil && now.Before(user.LastBoostedAt.Add(24*time.Hour))

	return c.JSON(fiber.Map{
		"boosts_remaining": user.BoostsRemaining,
		"is_active":        isActive,
		"boosted_until":    user.LastBoostedAt,
	})
}

// Boost boosts the user's profile for 24 hours.
func (h *PremiumHandler) Boost(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if !user.IsPremium {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "TextMe+ requis pour booster"})
	}

	now := time.Now()

	// Reset boosts if 30-day period has elapsed
	if !user.BoostPeriodStart.IsZero() && now.After(user.BoostPeriodStart.Add(30*24*time.Hour)) {
		allotment := 1
		var sub models.Subscription
		if err := database.DB.Where("user_id = ? AND status = 'active'", userID).First(&sub).Error; err == nil {
			if sub.Plan == "yearly" {
				allotment = 3
			}
		}
		user.BoostsRemaining = allotment
		user.BoostPeriodStart = now
	}

	if user.BoostsRemaining <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":            "Plus de boosts disponibles ce mois-ci",
			"boosts_remaining": 0,
		})
	}

	user.BoostsRemaining--
	user.LastBoostedAt = &now
	database.DB.Save(&user)

	return c.JSON(fiber.Map{
		"message":          "Profil boosté pour 24h !",
		"boosts_remaining": user.BoostsRemaining,
		"boosted_until":    now.Add(24 * time.Hour),
	})
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
		"is_premium":        true,
		"premium_until":     endsAt,
		"has_badge":         plan.Badge,
		"boosts_remaining":  plan.Boosts,
		"boost_period_start": now,
	})

	return c.JSON(fiber.Map{"message": "Premium accordé", "ends_at": endsAt})
}

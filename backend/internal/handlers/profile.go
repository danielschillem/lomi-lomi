package handlers

import (
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

func (h *ProfileHandler) GetProfile(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID invalide",
		})
	}

	var user models.User
	if err := database.DB.Preload("Photos").First(&user, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Profil non trouvé",
		})
	}

	return c.JSON(user)
}

func (h *ProfileHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Utilisateur non trouvé",
		})
	}

	type UpdateRequest struct {
		Bio       *string  `json:"bio"`
		AvatarURL *string  `json:"avatar_url"`
		Gender    *string  `json:"gender"`
		City      *string  `json:"city"`
		Latitude  *float64 `json:"latitude"`
		Longitude *float64 `json:"longitude"`
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	updates := map[string]interface{}{}
	if req.Bio != nil {
		updates["bio"] = *req.Bio
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.Gender != nil {
		updates["gender"] = *req.Gender
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

	if len(updates) > 0 {
		database.DB.Model(&user).Updates(updates)
	}

	database.DB.First(&user, userID)
	return c.JSON(user)
}

func (h *ProfileHandler) Discover(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var currentUser models.User
	if err := database.DB.First(&currentUser, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Utilisateur non trouvé",
		})
	}

	var prefs models.UserPreference
	database.DB.Where("user_id = ?", userID).First(&prefs)

	// Get blocked user IDs (in both directions)
	var blockedIDs []uint
	database.DB.Model(&models.Block{}).Where("blocker_id = ?", userID).Pluck("blocked_id", &blockedIDs)
	var blockerIDs []uint
	database.DB.Model(&models.Block{}).Where("blocked_id = ?", userID).Pluck("blocker_id", &blockerIDs)
	excludeIDs := append(blockedIDs, blockerIDs...)
	excludeIDs = append(excludeIDs, userID)

	// Exclude already liked users
	var likedIDs []uint
	database.DB.Model(&models.Like{}).Where("liker_id = ?", userID).Pluck("liked_id", &likedIDs)
	excludeIDs = append(excludeIDs, likedIDs...)

	// Exclude already passed users
	var passedIDs []uint
	database.DB.Model(&models.Pass{}).Where("user_id = ?", userID).Pluck("passed_id", &passedIDs)
	excludeIDs = append(excludeIDs, passedIDs...)

	query := database.DB.Preload("Photos").Where("id NOT IN ?", excludeIDs)

	if prefs.Gender != "" {
		query = query.Where("gender = ?", prefs.Gender)
	}

	// Age filter
	if prefs.MinAge > 0 || prefs.MaxAge > 0 {
		now := time.Now()
		if prefs.MaxAge > 0 {
			minBirth := now.AddDate(-prefs.MaxAge-1, 0, 0)
			query = query.Where("birth_date >= ?", minBirth)
		}
		if prefs.MinAge > 0 {
			maxBirth := now.AddDate(-prefs.MinAge, 0, 0)
			query = query.Where("birth_date <= ?", maxBirth)
		}
	}

	var users []models.User
	query.Limit(20).Find(&users)

	// Filter by distance if user has location
	if currentUser.Latitude != 0 && currentUser.Longitude != 0 {
		var filtered []models.User
		for _, u := range users {
			if u.Latitude == 0 && u.Longitude == 0 {
				continue
			}
			dist := haversine(currentUser.Latitude, currentUser.Longitude, u.Latitude, u.Longitude)
			if dist <= float64(prefs.MaxDistance) {
				filtered = append(filtered, u)
			}
		}
		users = filtered
	}

	return c.JSON(users)
}

// haversine calculates distance in km between two coordinates
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth radius in km
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// GetPreferences returns the authenticated user's discovery preferences.
func (h *ProfileHandler) GetPreferences(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var prefs models.UserPreference
	if err := database.DB.Where("user_id = ?", userID).First(&prefs).Error; err != nil {
		// Return defaults if not created yet
		prefs = models.UserPreference{UserID: userID, MinAge: 18, MaxAge: 99, MaxDistance: 50}
	}

	return c.JSON(prefs)
}

// UpdatePreferences updates the authenticated user's discovery preferences.
func (h *ProfileHandler) UpdatePreferences(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		MinAge      *int    `json:"min_age"`
		MaxAge      *int    `json:"max_age"`
		MaxDistance *int    `json:"max_distance"`
		Gender      *string `json:"gender"`
		Interests   *string `json:"interests"`
	}

	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	var prefs models.UserPreference
	if err := database.DB.Where("user_id = ?", userID).First(&prefs).Error; err != nil {
		prefs = models.UserPreference{UserID: userID, MinAge: 18, MaxAge: 99, MaxDistance: 50}
		database.DB.Create(&prefs)
	}

	updates := map[string]interface{}{}
	if req.MinAge != nil {
		updates["min_age"] = *req.MinAge
	}
	if req.MaxAge != nil {
		updates["max_age"] = *req.MaxAge
	}
	if req.MaxDistance != nil {
		updates["max_distance"] = *req.MaxDistance
	}
	if req.Gender != nil {
		updates["gender"] = *req.Gender
	}
	if req.Interests != nil {
		updates["interests"] = *req.Interests
	}

	if len(updates) > 0 {
		database.DB.Model(&prefs).Updates(updates)
	}

	database.DB.Where("user_id = ?", userID).First(&prefs)
	return c.JSON(prefs)
}

// SearchProfiles searches for profiles by username or city.
func (h *ProfileHandler) SearchProfiles(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		return c.JSON([]interface{}{})
	}

	// Exclude blocked users
	var excludeIDs []uint
	database.DB.Model(&models.Block{}).Where("blocker_id = ?", userID).Pluck("blocked_id", &excludeIDs)
	var blockerIDs []uint
	database.DB.Model(&models.Block{}).Where("blocked_id = ?", userID).Pluck("blocker_id", &blockerIDs)
	excludeIDs = append(excludeIDs, blockerIDs...)
	excludeIDs = append(excludeIDs, userID)

	search := "%" + q + "%"
	var users []models.User
	database.DB.
		Where("id NOT IN ?", excludeIDs).
		Where("username LIKE ? OR city LIKE ?", search, search).
		Limit(20).
		Find(&users)

	return c.JSON(users)
}

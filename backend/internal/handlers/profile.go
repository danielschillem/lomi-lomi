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

	// Build enriched response with age, distance, interests
	type DiscoverProfile struct {
		models.User
		Age       int     `json:"age"`
		Distance  float64 `json:"distance"` // km, -1 if unknown
		Interests string  `json:"interests"`
	}

	var results []DiscoverProfile
	for _, u := range users {
		dp := DiscoverProfile{User: u, Distance: -1}

		// Calculate age
		if u.BirthDate != nil {
			now := time.Now()
			age := now.Year() - u.BirthDate.Year()
			if now.YearDay() < u.BirthDate.YearDay() {
				age--
			}
			dp.Age = age
		}

		// Calculate distance
		if currentUser.Latitude != 0 && currentUser.Longitude != 0 && u.Latitude != 0 && u.Longitude != 0 {
			dp.Distance = math.Round(haversine(currentUser.Latitude, currentUser.Longitude, u.Latitude, u.Longitude)*10) / 10
			if prefs.MaxDistance > 0 && dp.Distance > float64(prefs.MaxDistance) {
				continue
			}
		} else if currentUser.Latitude != 0 && currentUser.Longitude != 0 {
			// User has no location, skip if distance filter is active
			continue
		}

		// Attach interests from target user's preferences
		var targetPrefs models.UserPreference
		if database.DB.Where("user_id = ?", u.ID).First(&targetPrefs).Error == nil {
			dp.Interests = targetPrefs.Interests
		}

		results = append(results, dp)
	}

	if results == nil {
		results = []DiscoverProfile{}
	}

	return c.JSON(results)
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

// NearbyUsers returns online users within a radius (km) of the current user.
func (h *ProfileHandler) NearbyUsers(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	radius, _ := strconv.ParseFloat(c.Query("radius", "10"), 64)
	if radius <= 0 {
		radius = 10
	}
	if radius > 200 {
		radius = 200
	}

	var currentUser models.User
	if err := database.DB.First(&currentUser, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if currentUser.Latitude == 0 && currentUser.Longitude == 0 {
		return c.JSON(fiber.Map{"users": []fiber.Map{}, "radius": radius})
	}

	// Get blocked IDs (both directions)
	var blockedIDs []uint
	database.DB.Model(&models.Block{}).Where("blocker_id = ?", userID).Pluck("blocked_id", &blockedIDs)
	var blockerIDs []uint
	database.DB.Model(&models.Block{}).Where("blocked_id = ?", userID).Pluck("blocker_id", &blockerIDs)
	excludeIDs := append(blockedIDs, blockerIDs...)
	excludeIDs = append(excludeIDs, userID)

	var users []models.User
	database.DB.
		Where("id NOT IN ? AND latitude != 0 AND longitude != 0", excludeIDs).
		Find(&users)

	type NearbyUser struct {
		ID        uint    `json:"id"`
		Username  string  `json:"username"`
		AvatarURL string  `json:"avatar_url"`
		IsOnline  bool    `json:"is_online"`
		Distance  float64 `json:"distance"`
		Angle     float64 `json:"angle"` // bearing in degrees from current user
	}

	var nearby []NearbyUser
	for _, u := range users {
		dist := haversine(currentUser.Latitude, currentUser.Longitude, u.Latitude, u.Longitude)
		if dist > radius {
			continue
		}
		// Calculate bearing angle
		angle := bearing(currentUser.Latitude, currentUser.Longitude, u.Latitude, u.Longitude)
		nearby = append(nearby, NearbyUser{
			ID:        u.ID,
			Username:  u.Username,
			AvatarURL: u.AvatarURL,
			IsOnline:  u.IsOnline,
			Distance:  math.Round(dist*10) / 10,
			Angle:     math.Round(angle*10) / 10,
		})
	}

	if nearby == nil {
		nearby = []NearbyUser{}
	}

	return c.JSON(fiber.Map{
		"users":  nearby,
		"radius": radius,
		"center": fiber.Map{
			"latitude":  currentUser.Latitude,
			"longitude": currentUser.Longitude,
		},
	})
}

// bearing calculates the initial bearing from point 1 to point 2 in degrees.
func bearing(lat1, lon1, lat2, lon2 float64) float64 {
	dLon := (lon2 - lon1) * math.Pi / 180
	lat1R := lat1 * math.Pi / 180
	lat2R := lat2 * math.Pi / 180
	x := math.Sin(dLon) * math.Cos(lat2R)
	y := math.Cos(lat1R)*math.Sin(lat2R) - math.Sin(lat1R)*math.Cos(lat2R)*math.Cos(dLon)
	brng := math.Atan2(x, y) * 180 / math.Pi
	return math.Mod(brng+360, 360)
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

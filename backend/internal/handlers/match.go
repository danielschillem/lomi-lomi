package handlers

import (
	"encoding/json"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type MatchHandler struct{}

func NewMatchHandler() *MatchHandler {
	return &MatchHandler{}
}

func (h *MatchHandler) LikeUser(c *fiber.Ctx) error {
	likerID := c.Locals("userID").(uint)

	type Req struct {
		LikedID uint `json:"liked_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.LikedID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "liked_id requis"})
	}

	if likerID == req.LikedID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Impossible de se liker soi-même"})
	}

	// Check if already liked
	var existing models.Like
	if err := database.DB.Where("liker_id = ? AND liked_id = ?", likerID, req.LikedID).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Déjà liké"})
	}

	like := models.Like{LikerID: likerID, LikedID: req.LikedID}
	database.DB.Create(&like)

	// Check for mutual like (match)
	var reverse models.Like
	isMatch := database.DB.Where("liker_id = ? AND liked_id = ?", req.LikedID, likerID).First(&reverse).Error == nil

	if isMatch {
		// Ensure consistent ordering (lower ID first)
		u1, u2 := likerID, req.LikedID
		if u2 < u1 {
			u1, u2 = u2, u1
		}

		// Avoid duplicate match
		var existingMatch models.Match
		if database.DB.Where("user1_id = ? AND user2_id = ?", u1, u2).First(&existingMatch).Error != nil {
			match := models.Match{User1ID: u1, User2ID: u2}
			database.DB.Create(&match)

			// Get usernames for notifications
			var liker, liked models.User
			database.DB.First(&liker, likerID)
			database.DB.First(&liked, req.LikedID)

			// Notify both users
			matchData, _ := json.Marshal(fiber.Map{"match_user_id": req.LikedID})
			database.DB.Create(&models.Notification{
				UserID: likerID,
				Type:   "match",
				Title:  "Nouveau match !",
				Body:   "Vous avez matché avec " + liked.Username,
				Data:   string(matchData),
			})
			matchData2, _ := json.Marshal(fiber.Map{"match_user_id": likerID})
			database.DB.Create(&models.Notification{
				UserID: req.LikedID,
				Type:   "match",
				Title:  "Nouveau match !",
				Body:   "Vous avez matché avec " + liker.Username,
				Data:   string(matchData2),
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"liked":    true,
		"is_match": isMatch,
	})
}

func (h *MatchHandler) PassUser(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		PassedID uint `json:"passed_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.PassedID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "passed_id requis"})
	}

	pass := models.Pass{UserID: userID, PassedID: req.PassedID}
	database.DB.Create(&pass)

	return c.JSON(fiber.Map{"passed": true})
}

func (h *MatchHandler) GetMatches(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var matches []models.Match
	database.DB.
		Preload("User1").
		Preload("User2").
		Where("user1_id = ? OR user2_id = ?", userID, userID).
		Order("created_at DESC").
		Find(&matches)

	return c.JSON(matches)
}

// Unmatch removes a match and deletes associated likes.
func (h *MatchHandler) Unmatch(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	matchID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var match models.Match
	if err := database.DB.First(&match, uint(matchID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Match non trouvé"})
	}

	if match.User1ID != userID && match.User2ID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	// Delete mutual likes
	database.DB.Where("(liker_id = ? AND liked_id = ?) OR (liker_id = ? AND liked_id = ?)",
		match.User1ID, match.User2ID, match.User2ID, match.User1ID).Delete(&models.Like{})

	// Delete the match
	database.DB.Delete(&match)

	return c.JSON(fiber.Map{"message": "Match supprimé"})
}

// ---- Notifications ----

func (h *MatchHandler) GetNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var notifs []models.Notification
	database.DB.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(50).
		Find(&notifs)

	return c.JSON(notifs)
}

func (h *MatchHandler) MarkNotificationsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	database.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true)

	return c.JSON(fiber.Map{"message": "Notifications marquées comme lues"})
}

func (h *MatchHandler) UnreadCount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var count int64
	database.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count)

	return c.JSON(fiber.Map{"count": count})
}

func (h *MatchHandler) DeleteNotification(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	database.DB.Where("id = ? AND user_id = ?", uint(id), userID).Delete(&models.Notification{})

	return c.JSON(fiber.Map{"message": "Notification supprimée"})
}

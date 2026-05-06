package handlers

import (
	"encoding/json"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type MatchHandler struct {
	WSHub *WSHub
}

func NewMatchHandler(wsHub ...*WSHub) *MatchHandler {
	h := &MatchHandler{}
	if len(wsHub) > 0 {
		h.WSHub = wsHub[0]
	}
	return h
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

		// Avoid duplicate match (use FirstOrCreate for atomicity)
		var existingMatch models.Match
		result := database.DB.Where("user1_id = ? AND user2_id = ?", u1, u2).FirstOrCreate(&existingMatch, models.Match{User1ID: u1, User2ID: u2})
		if result.RowsAffected > 0 {

			// Get usernames for notifications
			var liker, liked models.User
			database.DB.First(&liker, likerID)
			database.DB.First(&liked, req.LikedID)

			// Notify both users
			matchData, _ := json.Marshal(fiber.Map{"match_user_id": req.LikedID})
			likerNotif := models.Notification{
				UserID: likerID,
				Type:   "match",
				Title:  "Nouveau match !",
				Body:   "Vous avez matché avec " + liked.Username,
				Data:   string(matchData),
			}
			if err := database.DB.Create(&likerNotif).Error; err == nil {
				h.emitNotification(likerNotif)
			}
			matchData2, _ := json.Marshal(fiber.Map{"match_user_id": likerID})
			likedNotif := models.Notification{
				UserID: req.LikedID,
				Type:   "match",
				Title:  "Nouveau match !",
				Body:   "Vous avez matché avec " + liker.Username,
				Data:   string(matchData2),
			}
			if err := database.DB.Create(&likedNotif).Error; err == nil {
				h.emitNotification(likedNotif)
			}

			// Send push notifications
			SendPushToUser(likerID, "Nouveau match ! ", "Vous avez matché avec "+liked.Username, map[string]interface{}{"type": "match", "match_user_id": req.LikedID})
			SendPushToUser(req.LikedID, "Nouveau match ! ", "Vous avez matché avec "+liker.Username, map[string]interface{}{"type": "match", "match_user_id": likerID})
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

	matches := make([]models.Match, 0)
	database.DB.
		Preload("User1").
		Preload("User2").
		Where("user1_id = ? OR user2_id = ?", userID, userID).
		Order("created_at DESC").
		Find(&matches)

	return c.JSON(matches)
}

func (h *MatchHandler) emitNotification(notification models.Notification) {
	if h.WSHub == nil {
		return
	}

	h.WSHub.SendToUser(notification.UserID, WSMessage{
		Type: "notification",
		Data: map[string]interface{}{
			"id":         notification.ID,
			"type":       notification.Type,
			"title":      notification.Title,
			"body":       notification.Body,
			"data":       notification.Data,
			"is_read":    notification.IsRead,
			"created_at": notification.CreatedAt,
		},
	})
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

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	notifs := make([]models.Notification, 0)
	database.DB.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset((page - 1) * limit).
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

func (h *MatchHandler) MarkNotificationsUnread(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	database.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, true).
		Update("is_read", false)

	return c.JSON(fiber.Map{"message": "Notifications marquées comme non lues"})
}

func (h *MatchHandler) UpdateNotificationRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		IsRead *bool `json:"is_read"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.IsRead == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "is_read requis"})
	}

	var notif models.Notification
	if err := database.DB.Where("id = ? AND user_id = ?", uint(id), userID).First(&notif).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Notification non trouvée"})
	}

	notif.IsRead = *req.IsRead
	if err := database.DB.Save(&notif).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de mettre à jour la notification"})
	}

	return c.JSON(notif)
}

func (h *MatchHandler) UpdateNotificationsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		IDs    []uint `json:"ids"`
		IsRead *bool  `json:"is_read"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.IsRead == nil || len(req.IDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ids et is_read requis"})
	}

	result := database.DB.Model(&models.Notification{}).
		Where("user_id = ? AND id IN ?", userID, req.IDs).
		Update("is_read", *req.IsRead)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de mettre à jour les notifications"})
	}

	return c.JSON(fiber.Map{
		"message": "Notifications mises à jour",
		"updated": result.RowsAffected,
	})
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

	result := database.DB.Where("id = ? AND user_id = ?", uint(id), userID).Delete(&models.Notification{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de supprimer la notification"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Notification non trouvée"})
	}

	return c.JSON(fiber.Map{"message": "Notification supprimée"})
}

func (h *MatchHandler) DeleteNotifications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		IDs []uint `json:"ids"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || len(req.IDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ids requis"})
	}

	result := database.DB.Where("user_id = ? AND id IN ?", userID, req.IDs).Delete(&models.Notification{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de supprimer les notifications"})
	}

	return c.JSON(fiber.Map{
		"message": "Notifications supprimées",
		"deleted": result.RowsAffected,
	})
}

// SuperLike sends a super like to a user (premium).
func (h *MatchHandler) SuperLike(c *fiber.Ctx) error {
	likerID := c.Locals("userID").(uint)

	type Req struct {
		LikedID uint `json:"liked_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.LikedID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "liked_id requis"})
	}
	if likerID == req.LikedID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Impossible"})
	}

	// Premium check (5 superlikes/day for free, unlimited for premium)
	var user models.User
	database.DB.First(&user, likerID)

	if !user.IsPremium {
		// Count today's superlikes
		var count int64
		database.DB.Model(&models.Like{}).
			Where("liker_id = ? AND type = 'superlike' AND created_at > NOW() - INTERVAL '24 hours'", likerID).
			Count(&count)
		if count >= 5 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Limite de 5 Super Likes par jour (Premium = illimité)", "upgrade": true})
		}
	}

	// Check if already liked
	var existing models.Like
	if err := database.DB.Where("liker_id = ? AND liked_id = ?", likerID, req.LikedID).First(&existing).Error; err == nil {
		// Update to superlike
		database.DB.Model(&existing).Update("type", "superlike")
	} else {
		like := models.Like{LikerID: likerID, LikedID: req.LikedID, Type: "superlike"}
		database.DB.Create(&like)
	}

	// Notify the liked user
	var liker models.User
	database.DB.First(&liker, likerID)
	notif := models.Notification{
		UserID: req.LikedID,
		Type:   "superlike",
		Title:  "Super Like reçu ! ",
		Body:   liker.Username + " vous a Super Liké !",
		Data:   `{"type":"superlike","user_id":` + strconv.FormatUint(uint64(likerID), 10) + `}`,
	}
	if err := database.DB.Create(&notif).Error; err == nil {
		h.emitNotification(notif)
	}
	SendPushToUser(req.LikedID, "Super Like reçu ! ", liker.Username+" vous a Super Liké !", map[string]interface{}{"type": "superlike", "user_id": likerID})

	// Check mutual
	var reverse models.Like
	isMatch := database.DB.Where("liker_id = ? AND liked_id = ?", req.LikedID, likerID).First(&reverse).Error == nil
	if isMatch {
		u1, u2 := likerID, req.LikedID
		if u2 < u1 {
			u1, u2 = u2, u1
		}
		var existingMatch models.Match
		if database.DB.Where("user1_id = ? AND user2_id = ?", u1, u2).First(&existingMatch).Error != nil {
			match := models.Match{User1ID: u1, User2ID: u2}
			database.DB.Create(&match)
			var liked models.User
			database.DB.First(&liked, req.LikedID)
			likerMatchData, _ := json.Marshal(fiber.Map{"match_user_id": req.LikedID})
			likerNotif := models.Notification{UserID: likerID, Type: "match", Title: "Nouveau match !", Body: "Vous avez matché avec " + liked.Username, Data: string(likerMatchData)}
			if err := database.DB.Create(&likerNotif).Error; err == nil {
				h.emitNotification(likerNotif)
			}
			likedMatchData, _ := json.Marshal(fiber.Map{"match_user_id": likerID})
			likedNotif := models.Notification{UserID: req.LikedID, Type: "match", Title: "Nouveau match !", Body: "Vous avez matché avec " + liker.Username, Data: string(likedMatchData)}
			if err := database.DB.Create(&likedNotif).Error; err == nil {
				h.emitNotification(likedNotif)
			}
			SendPushToUser(likerID, "Nouveau match ! ", "Vous avez matché avec "+liked.Username, map[string]interface{}{"type": "match", "match_user_id": req.LikedID})
			SendPushToUser(req.LikedID, "Nouveau match ! ", "Vous avez matché avec "+liker.Username, map[string]interface{}{"type": "match", "match_user_id": likerID})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"super_liked": true, "is_match": isMatch})
}

// WhoLikedMe returns users who liked the current user (premium only).
func (h *MatchHandler) WhoLikedMe(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	database.DB.First(&user, userID)

	var likes []models.Like
	database.DB.Where("liked_id = ?", userID).
		Preload("Liker").
		Order("created_at DESC").
		Limit(50).
		Find(&likes)

	if !user.IsPremium {
		// Return count only, blur profiles
		result := make([]fiber.Map, 0, len(likes))
		for range likes {
			result = append(result, fiber.Map{
				"blurred":  true,
				"is_match": false,
			})
		}
		return c.JSON(fiber.Map{
			"count":    len(likes),
			"profiles": result,
			"upgrade":  true,
			"message":  "Passez Premium pour voir qui vous a liké",
		})
	}

	result := make([]fiber.Map, 0, len(likes))
	for _, like := range likes {
		u := like.Liker
		result = append(result, fiber.Map{
			"id":         u.ID,
			"username":   u.Username,
			"avatar_url": u.AvatarURL,
			"city":       u.City,
			"type":       like.Type,
			"liked_at":   like.CreatedAt,
		})
	}

	return c.JSON(fiber.Map{"count": len(result), "profiles": result, "upgrade": false})
}

// Rewind undoes the last like or pass action (premium only).
func (h *MatchHandler) Rewind(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	database.DB.First(&user, userID)

	if !user.IsPremium {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":   "Rewind disponible avec Lomi Pass Premium",
			"upgrade": true,
		})
	}

	// Find last like
	var lastLike models.Like
	likeErr := database.DB.Where("liker_id = ?", userID).Order("created_at DESC").First(&lastLike).Error

	// Find last pass
	var lastPass models.Pass
	passErr := database.DB.Where("user_id = ?", userID).Order("created_at DESC").First(&lastPass).Error

	if likeErr != nil && passErr != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Aucune action à annuler"})
	}

	// Delete the most recent one
	if likeErr == nil && (passErr != nil || lastLike.CreatedAt.After(lastPass.CreatedAt)) {
		// Also delete the match if it created one
		u1, u2 := userID, lastLike.LikedID
		if u2 < u1 {
			u1, u2 = u2, u1
		}
		database.DB.Where("user1_id = ? AND user2_id = ?", u1, u2).Delete(&models.Match{})
		database.DB.Delete(&lastLike)
		return c.JSON(fiber.Map{"rewound": "like", "user_id": lastLike.LikedID})
	}

	database.DB.Delete(&lastPass)
	return c.JSON(fiber.Map{"rewound": "pass", "user_id": lastPass.PassedID})
}

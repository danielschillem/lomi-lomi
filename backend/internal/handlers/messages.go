package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type MessageHandler struct {
	WSHub *WSHub
}

func NewMessageHandler(wsHub *WSHub) *MessageHandler {
	return &MessageHandler{WSHub: wsHub}
}

func (h *MessageHandler) GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	// Get blocked user IDs (both directions)
	var excludeIDs []uint
	database.DB.Model(&models.Block{}).Where("blocker_id = ?", userID).Pluck("blocked_id", &excludeIDs)
	var blockerIDs []uint
	database.DB.Model(&models.Block{}).Where("blocked_id = ?", userID).Pluck("blocker_id", &blockerIDs)
	excludeIDs = append(excludeIDs, blockerIDs...)

	query := database.DB.
		Preload("User1").
		Preload("User2").
		Where("user1_id = ? OR user2_id = ?", userID, userID)

	if len(excludeIDs) > 0 {
		query = query.Where("user1_id NOT IN ? AND user2_id NOT IN ?", excludeIDs, excludeIDs)
	}

	var conversations []models.Conversation
	query.Order("updated_at DESC").Find(&conversations)

	return c.JSON(conversations)
}

func (h *MessageHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	convID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID conversation invalide",
		})
	}

	// Verify user is part of conversation
	var conv models.Conversation
	if err := database.DB.First(&conv, uint(convID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Conversation non trouvée",
		})
	}
	if conv.User1ID != userID && conv.User2ID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Accès interdit",
		})
	}

	var messages []models.Message
	database.DB.
		Preload("Sender").
		Where("conversation_id = ?", uint(convID)).
		Order("created_at ASC").
		Find(&messages)

	// Mark messages as read
	database.DB.Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", uint(convID), userID, false).
		Update("is_read", true)

	return c.JSON(messages)
}

func (h *MessageHandler) SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type SendRequest struct {
		ReceiverID uint   `json:"receiver_id"`
		Content    string `json:"content"`
	}

	var req SendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	if req.Content == "" || req.ReceiverID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Destinataire et contenu requis",
		})
	}

	// Check if blocked
	var blockCount int64
	database.DB.Model(&models.Block{}).Where(
		"(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)",
		userID, req.ReceiverID, req.ReceiverID, userID,
	).Count(&blockCount)
	if blockCount > 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Communication impossible avec cet utilisateur",
		})
	}

	// Find or create conversation
	var conv models.Conversation
	result := database.DB.
		Where("(user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
			userID, req.ReceiverID, req.ReceiverID, userID).
		First(&conv)

	if result.Error != nil {
		conv = models.Conversation{
			User1ID: userID,
			User2ID: req.ReceiverID,
		}
		database.DB.Create(&conv)
	}

	msg := models.Message{
		ConversationID: conv.ID,
		SenderID:       userID,
		Content:        req.Content,
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible d'envoyer le message",
		})
	}

	// Update conversation timestamp
	database.DB.Model(&conv).Update("updated_at", msg.CreatedAt)

	database.DB.Preload("Sender").First(&msg, msg.ID)

	// Push message via WebSocket to receiver
	if h.WSHub != nil {
		h.WSHub.SendToUser(req.ReceiverID, WSMessage{
			Type: "message",
			Data: map[string]interface{}{
				"id":              msg.ID,
				"conversation_id": msg.ConversationID,
				"sender_id":       msg.SenderID,
				"content":         msg.Content,
				"created_at":      msg.CreatedAt,
				"is_read":         msg.IsRead,
				"sender":          map[string]interface{}{"id": msg.Sender.ID, "username": msg.Sender.Username, "avatar_url": msg.Sender.AvatarURL},
			},
		})
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

// MarkRead marks messages in a conversation as read and notifies senders via WS.
func (h *MessageHandler) MarkRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	convID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	// Verify membership
	var conv models.Conversation
	if err := database.DB.First(&conv, uint(convID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Conversation non trouvée"})
	}
	if conv.User1ID != userID && conv.User2ID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	// Get unread message IDs before updating (to notify senders)
	var unreadMsgs []models.Message
	database.DB.Where("conversation_id = ? AND sender_id != ? AND is_read = ?", uint(convID), userID, false).Find(&unreadMsgs)

	database.DB.Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", uint(convID), userID, false).
		Update("is_read", true)

	// Notify senders via WS
	if h.WSHub != nil {
		for _, msg := range unreadMsgs {
			h.WSHub.SendToUser(msg.SenderID, WSMessage{
				Type: "read_receipt",
				Data: map[string]interface{}{
					"conversation_id": convID,
					"message_id":      msg.ID,
					"read_by":         userID,
				},
			})
		}
	}

	return c.JSON(fiber.Map{"message": "Messages marqués comme lus"})
}

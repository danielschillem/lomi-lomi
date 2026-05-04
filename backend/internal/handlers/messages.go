package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

const maxMessageLength = 5000

type MessageHandler struct {
	WSHub  *WSHub
	Config *config.Config
}

func NewMessageHandler(wsHub *WSHub, cfg *config.Config) *MessageHandler {
	return &MessageHandler{WSHub: wsHub, Config: cfg}
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

	// Build enriched response with last_message and unread_count
	type ConvResponse struct {
		models.Conversation
		LastMessage string `json:"last_message"`
		UnreadCount int64  `json:"unread_count"`
	}

	result := make([]ConvResponse, 0, len(conversations))
	for _, conv := range conversations {
		var lastMsg models.Message
		database.DB.Where("conversation_id = ?", conv.ID).Order("created_at DESC").First(&lastMsg)

		var unread int64
		database.DB.Model(&models.Message{}).
			Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conv.ID, userID, false).
			Count(&unread)

		result = append(result, ConvResponse{
			Conversation: conv,
			LastMessage:  lastMsg.Content,
			UnreadCount:  unread,
		})
	}

	return c.JSON(result)
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

	// Pagination: ?before=<msg_id>&limit=50
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	beforeID, _ := strconv.ParseUint(c.Query("before", "0"), 10, 64)

	query := database.DB.
		Preload("Sender").
		Where("conversation_id = ?", uint(convID))

	if beforeID > 0 {
		query = query.Where("id < ?", beforeID)
	}

	var messages []models.Message
	query.Order("created_at DESC").Limit(limit).Find(&messages)

	// Reverse for chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	// Mark messages as read
	database.DB.Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", uint(convID), userID, false).
		Update("is_read", true)

	hasMore := len(messages) == limit

	return c.JSON(fiber.Map{
		"messages": messages,
		"has_more": hasMore,
	})
}

func (h *MessageHandler) SendMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type SendRequest struct {
		ReceiverID uint   `json:"receiver_id"`
		Content    string `json:"content"`
		ImageURL   string `json:"image_url"`
	}

	var req SendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	if req.Content == "" && req.ImageURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Contenu ou image requis",
		})
	}
	if req.ReceiverID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Destinataire requis",
		})
	}

	// Validate content length
	if len(req.Content) > maxMessageLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Message trop long (max %d caractères)", maxMessageLength),
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
		ImageURL:       req.ImageURL,
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
				"image_url":       msg.ImageURL,
				"created_at":      msg.CreatedAt,
				"is_read":         msg.IsRead,
				"sender":          map[string]interface{}{"id": msg.Sender.ID, "username": msg.Sender.Username, "avatar_url": msg.Sender.AvatarURL},
			},
		})
	}

	// Send push notification to receiver
	pushBody := msg.Content
	if pushBody == "" && msg.ImageURL != "" {
		pushBody = "Image"
	}
	SendPushToUser(req.ReceiverID, msg.Sender.Username, pushBody, map[string]interface{}{
		"type":            "message",
		"conversation_id": msg.ConversationID,
		"sender_id":       msg.SenderID,
	})

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

// GetOrCreateConversation returns the conversation between the authenticated user and the given user_id.
func (h *MessageHandler) GetOrCreateConversation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	otherID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil || uint(otherID) == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID utilisateur invalide"})
	}

	var conv models.Conversation
	result := database.DB.
		Preload("User1").Preload("User2").
		Where("(user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
			userID, uint(otherID), uint(otherID), userID).
		First(&conv)

	if result.Error != nil {
		conv = models.Conversation{
			User1ID: userID,
			User2ID: uint(otherID),
		}
		database.DB.Create(&conv)
		database.DB.Preload("User1").Preload("User2").First(&conv, conv.ID)
	}

	return c.JSON(conv)
}

// DeleteMessage soft-deletes a message. Only the sender can delete.
func (h *MessageHandler) DeleteMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	msgID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID message invalide"})
	}

	var msg models.Message
	if err := database.DB.First(&msg, uint(msgID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Message non trouvé"})
	}

	if msg.SenderID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Seul l'expéditeur peut supprimer"})
	}

	database.DB.Delete(&msg)

	// Notify the other party via WS
	if h.WSHub != nil {
		var conv models.Conversation
		database.DB.First(&conv, msg.ConversationID)
		receiverID := conv.User1ID
		if receiverID == userID {
			receiverID = conv.User2ID
		}
		h.WSHub.SendToUser(receiverID, WSMessage{
			Type: "message_deleted",
			Data: map[string]interface{}{
				"message_id":      msg.ID,
				"conversation_id": msg.ConversationID,
			},
		})
	}

	return c.JSON(fiber.Map{"message": "Message supprimé"})
}

// EditMessage allows the sender to edit a message's content.
func (h *MessageHandler) EditMessage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	msgID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID message invalide"})
	}

	type EditReq struct {
		Content string `json:"content"`
	}
	var req EditReq
	if err := c.BodyParser(&req); err != nil || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Contenu requis"})
	}

	if len(req.Content) > maxMessageLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Message trop long (max %d caractères)", maxMessageLength),
		})
	}

	var msg models.Message
	if err := database.DB.First(&msg, uint(msgID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Message non trouvé"})
	}

	if msg.SenderID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Seul l'expéditeur peut modifier"})
	}

	// Only allow editing within 15 minutes
	if time.Since(msg.CreatedAt) > 15*time.Minute {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Modification impossible après 15 minutes"})
	}

	database.DB.Model(&msg).Updates(map[string]interface{}{
		"content":   req.Content,
		"is_edited": true,
	})

	database.DB.Preload("Sender").First(&msg, msg.ID)

	// Notify via WS
	if h.WSHub != nil {
		var conv models.Conversation
		database.DB.First(&conv, msg.ConversationID)
		receiverID := conv.User1ID
		if receiverID == userID {
			receiverID = conv.User2ID
		}
		h.WSHub.SendToUser(receiverID, WSMessage{
			Type: "message_edited",
			Data: map[string]interface{}{
				"message_id":      msg.ID,
				"conversation_id": msg.ConversationID,
				"content":         msg.Content,
				"is_edited":       true,
			},
		})
	}

	return c.JSON(msg)
}

// SearchMessages searches messages in a conversation.
func (h *MessageHandler) SearchMessages(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	convID, err := strconv.ParseUint(c.Query("conversation_id", "0"), 10, 32)
	if err != nil || convID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "conversation_id requis"})
	}

	q := strings.TrimSpace(c.Query("q"))
	if q == "" || len(q) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Terme de recherche requis (min 2 caractères)"})
	}

	// Verify membership
	var conv models.Conversation
	if err := database.DB.First(&conv, uint(convID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Conversation non trouvée"})
	}
	if conv.User1ID != userID && conv.User2ID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	var messages []models.Message
	database.DB.
		Preload("Sender").
		Where("conversation_id = ? AND content ILIKE ?", uint(convID), "%"+q+"%").
		Order("created_at DESC").
		Limit(50).
		Find(&messages)

	return c.JSON(fiber.Map{"messages": messages})
}

// UploadMessageImage uploads an image for use in a chat message.
func (h *MessageHandler) UploadMessageImage(c *fiber.Ctx) error {
	_ = c.Locals("userID").(uint)

	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Image requise"})
	}

	// Max 10MB
	if file.Size > 10*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Image trop volumineuse (max 10 Mo)"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format non supporté (jpg, png, webp, gif)"})
	}

	b := make([]byte, 16)
	rand.Read(b)
	filename := fmt.Sprintf("msg_%s%s", hex.EncodeToString(b), ext)

	uploadDir := "uploads"
	if h.Config != nil {
		uploadDir = h.Config.UploadDir
	}
	os.MkdirAll(uploadDir, 0755)
	savePath := filepath.Join(uploadDir, filename)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lors de l'upload"})
	}

	baseURL := ""
	if h.Config != nil {
		baseURL = h.Config.BaseURL
	}
	imageURL := baseURL + "/uploads/" + filename

	return c.JSON(fiber.Map{"image_url": imageURL})
}

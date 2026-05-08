package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
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

func userCanAccessConversation(userID uint, conv models.Conversation) bool {
	if conv.IsGroup {
		var count int64
		database.DB.Model(&models.ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conv.ID, userID).
			Count(&count)
		return count > 0
	}
	return conv.User1ID == userID || conv.User2ID == userID
}

func conversationRecipients(conv models.Conversation, senderID uint) []uint {
	if conv.IsGroup {
		var ids []uint
		database.DB.Model(&models.ConversationMember{}).
			Where("conversation_id = ? AND user_id != ?", conv.ID, senderID).
			Pluck("user_id", &ids)
		return ids
	}

	if conv.User1ID == senderID {
		return []uint{conv.User2ID}
	}
	if conv.User2ID == senderID {
		return []uint{conv.User1ID}
	}
	return []uint{}
}

func normalizeMemberIDs(ownerID uint, memberIDs []uint) []uint {
	seen := map[uint]bool{ownerID: true}
	result := make([]uint, 0, len(memberIDs))
	for _, id := range memberIDs {
		if id == 0 || seen[id] {
			continue
		}
		seen[id] = true
		result = append(result, id)
	}
	return result
}

func makeCallRoom(conversationID uint) string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("textme-call-%d-%d", conversationID, time.Now().UnixNano())
	}
	return fmt.Sprintf("textme-call-%d-%s", conversationID, hex.EncodeToString(b))
}

func callParticipantPayload(user models.User) map[string]interface{} {
	return map[string]interface{}{
		"id":         user.ID,
		"username":   user.Username,
		"avatar_url": user.AvatarURL,
		"is_online":  user.IsOnline,
	}
}

func callEventPayload(call models.Call) map[string]interface{} {
	return map[string]interface{}{
		"id":              call.ID,
		"conversation_id": call.ConversationID,
		"caller_id":       call.CallerID,
		"receiver_id":     call.ReceiverID,
		"call_type":       call.CallType,
		"room":            call.Room,
		"status":          call.Status,
		"created_at":      call.CreatedAt,
		"accepted_at":     call.AcceptedAt,
		"ended_at":        call.EndedAt,
		"caller":          callParticipantPayload(call.Caller),
		"receiver":        callParticipantPayload(call.Receiver),
	}
}

func (h *MessageHandler) GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	// Get blocked user IDs (both directions)
	var excludeIDs []uint
	database.DB.Model(&models.Block{}).Where("blocker_id = ?", userID).Pluck("blocked_id", &excludeIDs)
	var blockerIDs []uint
	database.DB.Model(&models.Block{}).Where("blocked_id = ?", userID).Pluck("blocker_id", &blockerIDs)
	excludeIDs = append(excludeIDs, blockerIDs...)

	directQuery := database.DB.
		Preload("User1").
		Preload("User2").
		Where("(is_group = ? OR is_group IS NULL) AND (user1_id = ? OR user2_id = ?)", false, userID, userID)

	if len(excludeIDs) > 0 {
		directQuery = directQuery.Where("user1_id NOT IN ? AND user2_id NOT IN ?", excludeIDs, excludeIDs)
	}

	var directConversations []models.Conversation
	directQuery.Find(&directConversations)

	var groupIDs []uint
	database.DB.Model(&models.ConversationMember{}).
		Where("user_id = ?", userID).
		Pluck("conversation_id", &groupIDs)

	var groupConversations []models.Conversation
	if len(groupIDs) > 0 {
		database.DB.
			Preload("GroupMembers.User").
			Where("id IN ? AND is_group = ?", groupIDs, true).
			Find(&groupConversations)
	}

	conversations := append(directConversations, groupConversations...)
	sort.Slice(conversations, func(i, j int) bool {
		return conversations[i].UpdatedAt.After(conversations[j].UpdatedAt)
	})

	// Build enriched response with last_message and unread_count
	type ConvResponse struct {
		models.Conversation
		LastMessage string `json:"last_message"`
		UnreadCount int64  `json:"unread_count"`
		MemberCount int64  `json:"member_count"`
	}

	result := make([]ConvResponse, 0, len(conversations))
	for _, conv := range conversations {
		var lastMsg models.Message
		database.DB.Where("conversation_id = ?", conv.ID).Order("created_at DESC").First(&lastMsg)

		var unread int64
		database.DB.Model(&models.Message{}).
			Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conv.ID, userID, false).
			Count(&unread)

		memberCount := int64(2)
		if conv.IsGroup {
			database.DB.Model(&models.ConversationMember{}).
				Where("conversation_id = ?", conv.ID).
				Count(&memberCount)
		}

		result = append(result, ConvResponse{
			Conversation: conv,
			LastMessage:  lastMsg.Content,
			UnreadCount:  unread,
			MemberCount:  memberCount,
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
	if !userCanAccessConversation(userID, conv) {
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
		ConversationID uint     `json:"conversation_id,omitempty"`
		ReceiverID     uint     `json:"receiver_id,omitempty"`
		Content        string   `json:"content"`
		ImageURL       string   `json:"image_url"`
		AudioURL       string   `json:"audio_url"`
		CallType       string   `json:"call_type,omitempty"`
		CallRoom       string   `json:"call_room,omitempty"`
		Latitude       *float64 `json:"latitude,omitempty"`
		Longitude      *float64 `json:"longitude,omitempty"`
		ViewOnce       bool     `json:"view_once,omitempty"`
	}

	var req SendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	if req.Content == "" && req.ImageURL == "" && req.AudioURL == "" && req.CallType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Contenu, image, audio ou appel requis",
		})
	}
	if req.ReceiverID == 0 && req.ConversationID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Destinataire ou conversation requis",
		})
	}

	// Validate content length
	if len(req.Content) > maxMessageLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Message trop long (max %d caractères)", maxMessageLength),
		})
	}

	var conv models.Conversation
	if req.ConversationID > 0 {
		if err := database.DB.First(&conv, req.ConversationID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Conversation non trouvée"})
		}
		if !userCanAccessConversation(userID, conv) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
		}
		if !conv.IsGroup && req.ReceiverID == 0 {
			if conv.User1ID == userID {
				req.ReceiverID = conv.User2ID
			} else {
				req.ReceiverID = conv.User1ID
			}
		}
		if !conv.IsGroup {
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
		}
	} else {
		if req.ReceiverID == userID {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Destinataire invalide"})
		}

		var receiver models.User
		if err := database.DB.First(&receiver, req.ReceiverID).Error; err != nil || receiver.IsBanned {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
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

		// Find or create direct conversation. Direct chat is now public/free.
		result := database.DB.
			Where("(is_group = ? OR is_group IS NULL) AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))",
				false, userID, req.ReceiverID, req.ReceiverID, userID).
			First(&conv)

		if result.Error != nil {
			conv = models.Conversation{
				User1ID: userID,
				User2ID: req.ReceiverID,
			}
			database.DB.Create(&conv)
		}
	}

	msg := models.Message{
		ConversationID: conv.ID,
		SenderID:       userID,
		Content:        req.Content,
		ImageURL:       req.ImageURL,
		AudioURL:       req.AudioURL,
		CallType:       req.CallType,
		CallRoom:       req.CallRoom,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		ViewOnce:       req.ViewOnce,
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible d'envoyer le message",
		})
	}

	// Update conversation timestamp
	database.DB.Model(&conv).Update("updated_at", msg.CreatedAt)

	database.DB.Preload("Sender").First(&msg, msg.ID)

	recipients := conversationRecipients(conv, userID)

	// Push message via WebSocket to direct receiver or group members
	if h.WSHub != nil {
		for _, recipientID := range recipients {
			h.WSHub.SendToUser(recipientID, WSMessage{
				Type: "message",
				Data: map[string]interface{}{
					"id":              msg.ID,
					"conversation_id": msg.ConversationID,
					"sender_id":       msg.SenderID,
					"content":         msg.Content,
					"image_url":       msg.ImageURL,
					"audio_url":       msg.AudioURL,
					"call_type":       msg.CallType,
					"call_room":       msg.CallRoom,
					"latitude":        msg.Latitude,
					"longitude":       msg.Longitude,
					"view_once":       msg.ViewOnce,
					"created_at":      msg.CreatedAt,
					"is_read":         msg.IsRead,
					"sender":          map[string]interface{}{"id": msg.Sender.ID, "username": msg.Sender.Username, "avatar_url": msg.Sender.AvatarURL},
				},
			})
		}
	}

	// Send push notification to receiver
	pushBody := msg.Content
	if pushBody == "" && msg.ImageURL != "" {
		pushBody = "Image"
	} else if pushBody == "" && msg.AudioURL != "" {
		pushBody = "Note vocale"
	} else if pushBody == "" && msg.CallType != "" {
		if msg.CallType == "video" {
			pushBody = "Invitation appel vidéo"
		} else {
			pushBody = "Invitation appel audio"
		}
	}
	for _, recipientID := range recipients {
		SendPushToUser(recipientID, msg.Sender.Username, pushBody, map[string]interface{}{
			"type":            "message",
			"conversation_id": msg.ConversationID,
			"sender_id":       msg.SenderID,
		})
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

// GetCalls returns recent direct audio/video calls for the authenticated user.
func (h *MessageHandler) GetCalls(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var calls []models.Call
	if err := database.DB.
		Preload("Caller").
		Preload("Receiver").
		Where("caller_id = ? OR receiver_id = ?", userID, userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&calls).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de charger les appels"})
	}

	return c.JSON(calls)
}

// StartCall creates a direct call session and notifies the receiver in real time.
func (h *MessageHandler) StartCall(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req struct {
		ConversationID uint   `json:"conversation_id,omitempty"`
		ReceiverID     uint   `json:"receiver_id,omitempty"`
		CallType       string `json:"call_type"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	req.CallType = strings.ToLower(strings.TrimSpace(req.CallType))
	if req.CallType != "audio" && req.CallType != "video" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Type d'appel invalide"})
	}
	if req.ConversationID == 0 && req.ReceiverID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Destinataire ou conversation requis"})
	}

	var conv models.Conversation
	if req.ConversationID > 0 {
		if err := database.DB.First(&conv, req.ConversationID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Conversation non trouvée"})
		}
		if !userCanAccessConversation(userID, conv) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
		}
		if conv.IsGroup {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Les appels de groupe arrivent dans une prochaine étape"})
		}
		if req.ReceiverID == 0 {
			if conv.User1ID == userID {
				req.ReceiverID = conv.User2ID
			} else {
				req.ReceiverID = conv.User1ID
			}
		}
	} else {
		if req.ReceiverID == userID {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Destinataire invalide"})
		}

		var receiver models.User
		if err := database.DB.First(&receiver, req.ReceiverID).Error; err != nil || receiver.IsBanned {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
		}

		result := database.DB.
			Where("(is_group = ? OR is_group IS NULL) AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))",
				false, userID, req.ReceiverID, req.ReceiverID, userID).
			First(&conv)
		if result.Error != nil {
			conv = models.Conversation{
				User1ID: userID,
				User2ID: req.ReceiverID,
			}
			if err := database.DB.Create(&conv).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer la conversation"})
			}
		}
	}

	if req.ReceiverID == 0 || req.ReceiverID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Destinataire invalide"})
	}

	var blockCount int64
	database.DB.Model(&models.Block{}).Where(
		"(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)",
		userID, req.ReceiverID, req.ReceiverID, userID,
	).Count(&blockCount)
	if blockCount > 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Communication impossible avec cet utilisateur"})
	}

	call := models.Call{
		ConversationID: conv.ID,
		CallerID:       userID,
		ReceiverID:     req.ReceiverID,
		CallType:       req.CallType,
		Room:           makeCallRoom(conv.ID),
		Status:         "ringing",
	}
	if err := database.DB.Create(&call).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de démarrer l'appel"})
	}

	database.DB.Model(&conv).Update("updated_at", call.CreatedAt)
	database.DB.Preload("Caller").Preload("Receiver").First(&call, call.ID)

	payload := callEventPayload(call)
	if h.WSHub != nil {
		h.WSHub.SendToUser(call.ReceiverID, WSMessage{
			Type: "call_incoming",
			Data: payload,
		})
	}

	callKind := "audio"
	if call.CallType == "video" {
		callKind = "vidéo"
	}
	SendPushToUser(call.ReceiverID, "Appel TextMe", fmt.Sprintf("%s vous appelle en %s", call.Caller.Username, callKind), map[string]interface{}{
		"type":            "call",
		"call_id":         call.ID,
		"conversation_id": call.ConversationID,
		"caller_id":       call.CallerID,
		"call_type":       call.CallType,
		"call_room":       call.Room,
	})

	return c.Status(fiber.StatusCreated).JSON(call)
}

// UpdateCallStatus accepts, declines or ends an existing direct call.
func (h *MessageHandler) UpdateCallStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	callID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil || callID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID appel invalide"})
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))

	allowed := map[string]bool{
		"accepted":  true,
		"declined":  true,
		"missed":    true,
		"ended":     true,
		"cancelled": true,
	}
	if !allowed[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut d'appel invalide"})
	}

	var call models.Call
	if err := database.DB.Preload("Caller").Preload("Receiver").First(&call, uint(callID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Appel non trouvé"})
	}
	if call.CallerID != userID && call.ReceiverID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	switch req.Status {
	case "accepted":
		if call.ReceiverID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Seul le destinataire peut accepter l'appel"})
		}
	case "declined", "missed":
		if call.ReceiverID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Seul le destinataire peut refuser l'appel"})
		}
	case "cancelled":
		if call.CallerID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Seul l'appelant peut annuler l'appel"})
		}
	}

	now := time.Now()
	updates := map[string]interface{}{"status": req.Status}
	if req.Status == "accepted" {
		updates["accepted_at"] = &now
	} else {
		updates["ended_at"] = &now
	}
	if err := database.DB.Model(&call).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de mettre à jour l'appel"})
	}

	database.DB.Preload("Caller").Preload("Receiver").First(&call, call.ID)
	payload := callEventPayload(call)
	if h.WSHub != nil {
		otherID := call.ReceiverID
		if userID == call.ReceiverID {
			otherID = call.CallerID
		}
		h.WSHub.SendToUser(otherID, WSMessage{
			Type: "call_status",
			Data: payload,
		})
	}

	return c.JSON(call)
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
	if !userCanAccessConversation(userID, conv) {
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

	var other models.User
	if err := database.DB.First(&other, uint(otherID)).Error; err != nil || other.IsBanned {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	var blockCount int64
	database.DB.Model(&models.Block{}).Where(
		"(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)",
		userID, uint(otherID), uint(otherID), userID,
	).Count(&blockCount)
	if blockCount > 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Communication impossible avec cet utilisateur"})
	}

	var conv models.Conversation
	result := database.DB.
		Preload("User1").Preload("User2").
		Where("(is_group = ? OR is_group IS NULL) AND ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))",
			false, userID, uint(otherID), uint(otherID), userID).
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

// CreateGroup creates a public TextMe group conversation.
func (h *MessageHandler) CreateGroup(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req struct {
		Title     string `json:"title"`
		AvatarURL string `json:"avatar_url"`
		MemberIDs []uint `json:"member_ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	title := strings.TrimSpace(req.Title)
	if len(title) < 2 || len(title) > 80 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Nom de groupe requis (2 à 80 caractères)"})
	}

	memberIDs := normalizeMemberIDs(userID, req.MemberIDs)
	if len(memberIDs) < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ajoutez au moins un membre"})
	}
	if len(memberIDs) > 99 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Un groupe ne peut pas dépasser 100 membres"})
	}

	var existingCount int64
	database.DB.Model(&models.User{}).
		Where("id IN ? AND is_banned = ?", memberIDs, false).
		Count(&existingCount)
	if existingCount != int64(len(memberIDs)) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Un ou plusieurs membres sont invalides"})
	}

	var blockCount int64
	database.DB.Model(&models.Block{}).Where(
		"((blocker_id = ? AND blocked_id IN ?) OR (blocked_id = ? AND blocker_id IN ?))",
		userID, memberIDs, userID, memberIDs,
	).Count(&blockCount)
	if blockCount > 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Impossible d'ajouter un utilisateur bloqué"})
	}

	conv := models.Conversation{
		User1ID:     userID,
		User2ID:     userID,
		IsGroup:     true,
		Title:       title,
		AvatarURL:   strings.TrimSpace(req.AvatarURL),
		CreatedByID: userID,
	}

	if err := database.DB.Create(&conv).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer le groupe"})
	}

	members := []models.ConversationMember{
		{ConversationID: conv.ID, UserID: userID, Role: "admin"},
	}
	for _, id := range memberIDs {
		members = append(members, models.ConversationMember{
			ConversationID: conv.ID,
			UserID:         id,
			Role:           "member",
		})
	}
	if err := database.DB.Create(&members).Error; err != nil {
		database.DB.Delete(&conv)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible d'ajouter les membres"})
	}

	database.DB.Preload("GroupMembers.User").First(&conv, conv.ID)

	if h.WSHub != nil {
		for _, id := range memberIDs {
			h.WSHub.SendToUser(id, WSMessage{
				Type: "group_created",
				Data: map[string]interface{}{
					"conversation_id": conv.ID,
					"title":           conv.Title,
					"created_by_id":   userID,
				},
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(conv)
}

// GetGroupMembers returns members for a group conversation.
func (h *MessageHandler) GetGroupMembers(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	convID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil || convID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID conversation invalide"})
	}

	var conv models.Conversation
	if err := database.DB.First(&conv, uint(convID)).Error; err != nil || !conv.IsGroup {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Groupe non trouvé"})
	}
	if !userCanAccessConversation(userID, conv) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	var members []models.ConversationMember
	database.DB.
		Preload("User").
		Where("conversation_id = ?", conv.ID).
		Order("role ASC, created_at ASC").
		Find(&members)

	return c.JSON(fiber.Map{"members": members})
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

	// Notify the other party or group members via WS
	if h.WSHub != nil {
		var conv models.Conversation
		database.DB.First(&conv, msg.ConversationID)
		for _, receiverID := range conversationRecipients(conv, userID) {
			h.WSHub.SendToUser(receiverID, WSMessage{
				Type: "message_deleted",
				Data: map[string]interface{}{
					"message_id":      msg.ID,
					"conversation_id": msg.ConversationID,
				},
			})
		}
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
		for _, receiverID := range conversationRecipients(conv, userID) {
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
	if !userCanAccessConversation(userID, conv) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	var messages []models.Message
	database.DB.
		Preload("Sender").
		Where("conversation_id = ? AND LOWER(content) LIKE ?", uint(convID), "%"+strings.ToLower(q)+"%").
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

// UploadMessageAudio uploads an audio clip for use in a chat message.
func (h *MessageHandler) UploadMessageAudio(c *fiber.Ctx) error {
	_ = c.Locals("userID").(uint)

	file, err := c.FormFile("audio")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Audio requis"})
	}

	// Max 20MB
	if file.Size > 20*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Audio trop volumineux (max 20 Mo)"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".mp3": true, ".m4a": true, ".aac": true, ".ogg": true, ".wav": true, ".webm": true}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format non supporté (mp3, m4a, aac, ogg, wav, webm)"})
	}

	b := make([]byte, 16)
	rand.Read(b)
	filename := fmt.Sprintf("aud_%s%s", hex.EncodeToString(b), ext)

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
	audioURL := baseURL + "/uploads/" + filename

	return c.JSON(fiber.Map{"audio_url": audioURL})
}

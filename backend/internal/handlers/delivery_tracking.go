package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type DeliveryTrackingHandler struct {
	WSHub *WSHub
}

func NewDeliveryTrackingHandler(wsHub *WSHub) *DeliveryTrackingHandler {
	return &DeliveryTrackingHandler{WSHub: wsHub}
}

// ---- Admin/Owner : créer une mission de livraison pour une commande ----

// CreateDeliveryRequest crée une mission de livraison liée à une commande boutique.
// Accessible par admin ou owner uniquement.
func (h *DeliveryTrackingHandler) CreateDeliveryRequest(c *fiber.Ctx) error {
	orderID, err := strconv.ParseUint(c.Params("orderID"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID commande invalide"})
	}

	// Vérifier que la commande existe
	var order models.Order
	if err := database.DB.Preload("DeliveryAddress").First(&order, uint(orderID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Commande introuvable"})
	}

	// Une seule mission par commande
	var existing models.DeliveryTracking
	if err := database.DB.Where("order_id = ?", orderID).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Mission de livraison déjà créée pour cette commande"})
	}

	type Req struct {
		PickupLat      float64 `json:"pickup_lat"`
		PickupLng      float64 `json:"pickup_lng"`
		PickupAddress  string  `json:"pickup_address"`
		DropoffLat     float64 `json:"dropoff_lat"`
		DropoffLng     float64 `json:"dropoff_lng"`
		DropoffAddress string  `json:"dropoff_address"`
		Note           string  `json:"note"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	// Si pas de dropoff fourni, utiliser l'adresse de livraison de la commande
	dropoffAddress := req.DropoffAddress
	if dropoffAddress == "" && order.DeliveryAddress != nil {
		dropoffAddress = order.DeliveryAddress.Address + ", " + order.DeliveryAddress.City
	}

	dt := models.DeliveryTracking{
		OrderID:        uint(orderID),
		ClientID:       order.UserID,
		Status:         "pending",
		PickupLat:      req.PickupLat,
		PickupLng:      req.PickupLng,
		PickupAddress:  req.PickupAddress,
		DropoffLat:     req.DropoffLat,
		DropoffLng:     req.DropoffLng,
		DropoffAddress: dropoffAddress,
		Note:           req.Note,
	}
	database.DB.Create(&dt)

	// Notifier tous les livreurs connectés
	if h.WSHub != nil {
		h.WSHub.BroadcastToRole("livreur", WSMessage{
			Type: "delivery_request_available",
			Data: map[string]interface{}{
				"delivery_id":     dt.ID,
				"order_id":        dt.OrderID,
				"pickup_address":  dt.PickupAddress,
				"dropoff_address": dt.DropoffAddress,
				"note":            dt.Note,
			},
		})
	}

	return c.Status(fiber.StatusCreated).JSON(dt)
}

// ---- Livreur : voir les missions disponibles ----

func (h *DeliveryTrackingHandler) GetAvailableDeliveries(c *fiber.Ctx) error {
	deliveries := make([]models.DeliveryTracking, 0)
	database.DB.
		Preload("Order").
		Preload("Order.Items").
		Preload("Order.Items.Product").
		Where("status = ?", "pending").
		Order("created_at ASC").
		Find(&deliveries)
	return c.JSON(deliveries)
}

// GetMyDeliveries retourne les missions du livreur connecté.
func (h *DeliveryTrackingHandler) GetMyDeliveries(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	deliveries := make([]models.DeliveryTracking, 0)
	database.DB.
		Preload("Order").
		Preload("Order.Items").
		Preload("Order.Items.Product").
		Preload("Client").
		Where("delivery_person_id = ?", userID).
		Order("created_at DESC").
		Limit(30).
		Find(&deliveries)
	return c.JSON(deliveries)
}

// ---- Livreur : accepter une mission ----

func (h *DeliveryTrackingHandler) AcceptDelivery(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	dtID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var dt models.DeliveryTracking
	if err := database.DB.First(&dt, uint(dtID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mission introuvable"})
	}
	if dt.Status != "pending" {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Mission déjà prise en charge"})
	}

	now := time.Now()
	database.DB.Model(&dt).Updates(map[string]interface{}{
		"delivery_person_id": userID,
		"status":             "accepted",
		"accepted_at":        now,
	})
	dt.DeliveryPersonID = &userID
	dt.Status = "accepted"
	dt.AcceptedAt = &now

	// Charger le livreur
	var deliveryPerson models.User
	database.DB.Select("id, username, avatar_url").First(&deliveryPerson, userID)

	// Notifier le client
	if h.WSHub != nil {
		h.WSHub.SendToUser(dt.ClientID, WSMessage{
			Type: "delivery_accepted",
			Data: map[string]interface{}{
				"delivery_id":          dt.ID,
				"delivery_person_id":   userID,
				"delivery_person_name": deliveryPerson.Username,
				"avatar_url":           deliveryPerson.AvatarURL,
				"pickup_address":       dt.PickupAddress,
				"dropoff_address":      dt.DropoffAddress,
			},
		})
	}

	// Push notification au client
	SendPushToUser(dt.ClientID, "Livreur en route 🚀", deliveryPerson.Username+" a pris en charge votre livraison !", map[string]interface{}{
		"type":        "delivery_accepted",
		"delivery_id": dt.ID,
	})

	database.DB.Preload("Order").Preload("Client").Preload("DeliveryPerson").First(&dt, dt.ID)
	return c.JSON(dt)
}

// ---- Livreur : mettre à jour le statut ----

// Statuts autorisés par ordre : accepted → picking_up → picked_up → delivering → delivered
var allowedStatusTransitions = map[string]string{
	"accepted":   "picking_up",
	"picking_up": "picked_up",
	"picked_up":  "delivering",
	"delivering": "delivered",
}

func (h *DeliveryTrackingHandler) UpdateDeliveryStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	dtID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status requis"})
	}

	var dt models.DeliveryTracking
	if err := database.DB.First(&dt, uint(dtID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mission introuvable"})
	}
	if dt.DeliveryPersonID == nil || *dt.DeliveryPersonID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	// Valider la transition
	expected, ok := allowedStatusTransitions[dt.Status]
	if !ok || expected != req.Status {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Transition de statut invalide"})
	}

	now := time.Now()
	updates := map[string]interface{}{"status": req.Status}

	switch req.Status {
	case "picked_up":
		updates["picked_up_at"] = now
	case "delivered":
		updates["delivered_at"] = now
		// Mettre à jour le statut de la commande
		database.DB.Model(&models.Order{}).Where("id = ?", dt.OrderID).Update("status", "delivered")
	}

	database.DB.Model(&dt).Updates(updates)
	dt.Status = req.Status

	// Notifier le client du changement d'étape
	stepLabels := map[string]string{
		"picking_up": "Votre livreur est en route pour récupérer votre colis 📦",
		"picked_up":  "Colis récupéré ! En route vers vous 🚗",
		"delivering": "Votre livreur approche ! 📍",
		"delivered":  "Livraison effectuée ! 🎉",
	}
	label := stepLabels[req.Status]

	if h.WSHub != nil {
		h.WSHub.SendToUser(dt.ClientID, WSMessage{
			Type: "delivery_status_changed",
			Data: map[string]interface{}{
				"delivery_id": dt.ID,
				"status":      req.Status,
				"message":     label,
			},
		})
	}

	// Push notification au client sur les étapes clés
	if req.Status == "delivered" || req.Status == "picked_up" {
		SendPushToUser(dt.ClientID, "Mise à jour livraison", label, map[string]interface{}{
			"type":        "delivery_status_changed",
			"delivery_id": dt.ID,
			"status":      req.Status,
		})
	}

	return c.JSON(fiber.Map{"status": req.Status, "message": label})
}

// ---- Livreur : envoyer sa position GPS en temps réel ----

func (h *DeliveryTrackingHandler) UpdateDeliveryLocation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	dtID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	var dt models.DeliveryTracking
	if err := database.DB.First(&dt, uint(dtID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mission introuvable"})
	}
	if dt.DeliveryPersonID == nil || *dt.DeliveryPersonID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}
	if dt.Status == "delivered" || dt.Status == "canceled" {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "Mission terminée"})
	}

	// Persister la position (throttled: en prod on peut skip la DB et ne faire que le relay WS)
	database.DB.Model(&dt).Updates(map[string]interface{}{
		"delivery_person_lat": req.Latitude,
		"delivery_person_lng": req.Longitude,
	})

	// Relay WS au client
	if h.WSHub != nil {
		h.WSHub.SendToUser(dt.ClientID, WSMessage{
			Type: "delivery_location_update",
			Data: map[string]interface{}{
				"delivery_id":        dt.ID,
				"delivery_person_id": userID,
				"latitude":           req.Latitude,
				"longitude":          req.Longitude,
			},
		})
	}

	return c.JSON(fiber.Map{"updated": true})
}

// ---- Commun : récupérer le détail d'une mission ----

func (h *DeliveryTrackingHandler) GetDelivery(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	dtID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var dt models.DeliveryTracking
	if err := database.DB.
		Preload("Order").
		Preload("Order.Items").
		Preload("Order.Items.Product").
		Preload("Client").
		Preload("DeliveryPerson").
		First(&dt, uint(dtID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mission introuvable"})
	}

	// Autoriser : client, livreur assigné, admin
	var requester models.User
	database.DB.Select("role").First(&requester, userID)

	isClient := dt.ClientID == userID
	isDeliveryPerson := dt.DeliveryPersonID != nil && *dt.DeliveryPersonID == userID
	isAdmin := requester.Role == "admin"

	if !isClient && !isDeliveryPerson && !isAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	return c.JSON(dt)
}

// GetDeliveryByOrder retourne la mission de livraison d'une commande (pour le client).
func (h *DeliveryTrackingHandler) GetDeliveryByOrder(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	orderID, err := strconv.ParseUint(c.Params("orderID"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var dt models.DeliveryTracking
	if err := database.DB.
		Preload("DeliveryPerson").
		Where("order_id = ?", uint(orderID)).
		First(&dt).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Aucune mission de livraison pour cette commande"})
	}

	var requester models.User
	database.DB.Select("role").First(&requester, userID)

	isClient := dt.ClientID == userID
	isDeliveryPerson := dt.DeliveryPersonID != nil && *dt.DeliveryPersonID == userID
	isAdmin := requester.Role == "admin"

	if !isClient && !isDeliveryPerson && !isAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	return c.JSON(dt)
}

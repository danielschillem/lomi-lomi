package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type LocationHandler struct {
	WSHub *WSHub
}

func NewLocationHandler(wsHub *WSHub) *LocationHandler {
	return &LocationHandler{WSHub: wsHub}
}

// StartLocationShare creates a new live location sharing session.
func (h *LocationHandler) StartLocationShare(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		ReceiverID uint    `json:"receiver_id"`
		Latitude   float64 `json:"latitude"`
		Longitude  float64 `json:"longitude"`
		Duration   int     `json:"duration"` // minutes, default 30
	}

	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.ReceiverID == 0 || userID == req.ReceiverID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "receiver_id requis"})
	}

	// Verify users are matched
	var matchCount int64
	database.DB.Model(&models.Match{}).Where(
		"(user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
		userID, req.ReceiverID, req.ReceiverID, userID,
	).Count(&matchCount)
	if matchCount == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Vous devez être matchés pour partager votre localisation"})
	}

	// Deactivate any existing share between these users in this direction
	database.DB.Model(&models.LocationShare{}).
		Where("sender_id = ? AND receiver_id = ? AND is_active = ?", userID, req.ReceiverID, true).
		Update("is_active", false)

	duration := req.Duration
	if duration <= 0 || duration > 480 {
		duration = 30
	}

	share := models.LocationShare{
		SenderID:   userID,
		ReceiverID: req.ReceiverID,
		Latitude:   req.Latitude,
		Longitude:  req.Longitude,
		IsActive:   true,
		ExpiresAt:  time.Now().Add(time.Duration(duration) * time.Minute),
	}
	database.DB.Create(&share)

	// Notify receiver via WS
	var sender models.User
	database.DB.First(&sender, userID)
	if h.WSHub != nil {
		h.WSHub.SendToUser(req.ReceiverID, WSMessage{
			Type: "location_share_started",
			Data: map[string]interface{}{
				"share_id":   share.ID,
				"sender_id":  userID,
				"username":   sender.Username,
				"latitude":   share.Latitude,
				"longitude":  share.Longitude,
				"expires_at": share.ExpiresAt,
			},
		})
	}

	return c.Status(fiber.StatusCreated).JSON(share)
}

// UpdateLocation updates the sender's position in an active share.
func (h *LocationHandler) UpdateLocation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	shareID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var share models.LocationShare
	if err := database.DB.First(&share, uint(shareID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Partage non trouvé"})
	}
	if share.SenderID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}
	if !share.IsActive || time.Now().After(share.ExpiresAt) {
		database.DB.Model(&share).Update("is_active", false)
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "Partage expiré"})
	}

	type Req struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	database.DB.Model(&share).Updates(map[string]interface{}{
		"latitude":  req.Latitude,
		"longitude": req.Longitude,
	})

	// Push real-time update to receiver
	if h.WSHub != nil {
		h.WSHub.SendToUser(share.ReceiverID, WSMessage{
			Type: "location_update",
			Data: map[string]interface{}{
				"share_id":  share.ID,
				"sender_id": userID,
				"latitude":  req.Latitude,
				"longitude": req.Longitude,
			},
		})
	}

	return c.JSON(fiber.Map{"updated": true})
}

// StopLocationShare deactivates a location share.
func (h *LocationHandler) StopLocationShare(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	shareID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var share models.LocationShare
	if err := database.DB.First(&share, uint(shareID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Partage non trouvé"})
	}
	// Sender or receiver can stop the share
	if share.SenderID != userID && share.ReceiverID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	database.DB.Model(&share).Update("is_active", false)

	// Notify both parties
	otherID := share.ReceiverID
	if userID == share.ReceiverID {
		otherID = share.SenderID
	}
	if h.WSHub != nil {
		h.WSHub.SendToUser(otherID, WSMessage{
			Type: "location_share_stopped",
			Data: map[string]interface{}{
				"share_id":   share.ID,
				"stopped_by": userID,
			},
		})
	}

	return c.JSON(fiber.Map{"message": "Partage arrêté"})
}

// GetActiveShares returns all active location shares for the user.
func (h *LocationHandler) GetActiveShares(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	// Expire old shares
	database.DB.Model(&models.LocationShare{}).
		Where("is_active = ? AND expires_at < ?", true, time.Now()).
		Update("is_active", false)

	var shares []models.LocationShare
	database.DB.
		Preload("Sender").
		Preload("Receiver").
		Where("(sender_id = ? OR receiver_id = ?) AND is_active = ?", userID, userID, true).
		Find(&shares)

	return c.JSON(shares)
}

// ---- VTC Rides ----

// RequestVTCRide creates a VTC ride request from one user to pick up another.
func (h *LocationHandler) RequestVTCRide(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		PassengerID    uint    `json:"passenger_id"`
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
	if req.PassengerID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "passenger_id requis"})
	}
	if req.PickupLat == 0 || req.PickupLng == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Position de prise en charge requise"})
	}

	ride := models.VTCRide{
		RequesterID:    userID,
		PassengerID:    req.PassengerID,
		PickupLat:      req.PickupLat,
		PickupLng:      req.PickupLng,
		PickupAddress:  req.PickupAddress,
		DropoffLat:     req.DropoffLat,
		DropoffLng:     req.DropoffLng,
		DropoffAddress: req.DropoffAddress,
		Status:         "pending",
		Note:           req.Note,
	}
	database.DB.Create(&ride)

	// Notify the passenger
	var requester models.User
	database.DB.First(&requester, userID)
	if h.WSHub != nil {
		h.WSHub.SendToUser(req.PassengerID, WSMessage{
			Type: "vtc_ride_requested",
			Data: map[string]interface{}{
				"ride_id":         ride.ID,
				"requester_id":    userID,
				"username":        requester.Username,
				"pickup_address":  ride.PickupAddress,
				"dropoff_address": ride.DropoffAddress,
				"note":            ride.Note,
			},
		})
	}

	database.DB.Preload("Requester").Preload("Passenger").First(&ride, ride.ID)
	return c.Status(fiber.StatusCreated).JSON(ride)
}

// GetVTCRide returns a specific ride.
func (h *LocationHandler) GetVTCRide(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	rideID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var ride models.VTCRide
	if err := database.DB.Preload("Requester").Preload("Passenger").Preload("Driver").First(&ride, uint(rideID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Course non trouvée"})
	}

	if ride.RequesterID != userID && ride.PassengerID != userID && (ride.DriverID == nil || *ride.DriverID != userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	return c.JSON(ride)
}

// GetMyVTCRides returns rides where user is requester or passenger.
func (h *LocationHandler) GetMyVTCRides(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var rides []models.VTCRide
	database.DB.
		Preload("Requester").
		Preload("Passenger").
		Preload("Driver").
		Where("requester_id = ? OR passenger_id = ?", userID, userID).
		Order("created_at DESC").
		Limit(20).
		Find(&rides)

	return c.JSON(rides)
}

// UpdateVTCRideStatus updates a ride's status.
func (h *LocationHandler) UpdateVTCRideStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	rideID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	validStatuses := map[string]bool{
		"accepted": true, "in_progress": true, "completed": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut invalide"})
	}

	var ride models.VTCRide
	if err := database.DB.First(&ride, uint(rideID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Course non trouvée"})
	}

	// Only requester, passenger or driver can update
	if ride.RequesterID != userID && ride.PassengerID != userID && (ride.DriverID == nil || *ride.DriverID != userID) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	database.DB.Model(&ride).Update("status", req.Status)

	// Notify the other parties
	notifyIDs := []uint{}
	if ride.RequesterID != userID {
		notifyIDs = append(notifyIDs, ride.RequesterID)
	}
	if ride.PassengerID != userID && ride.PassengerID != ride.RequesterID {
		notifyIDs = append(notifyIDs, ride.PassengerID)
	}
	if ride.DriverID != nil && *ride.DriverID != userID {
		notifyIDs = append(notifyIDs, *ride.DriverID)
	}

	if h.WSHub != nil {
		for _, id := range notifyIDs {
			h.WSHub.SendToUser(id, WSMessage{
				Type: "vtc_ride_updated",
				Data: map[string]interface{}{
					"ride_id":    ride.ID,
					"status":     req.Status,
					"updated_by": userID,
				},
			})
		}
	}

	return c.JSON(fiber.Map{"message": "Statut mis à jour", "status": req.Status})
}

// UpdateVTCDriverLocation updates driver position for a ride in progress.
func (h *LocationHandler) UpdateVTCDriverLocation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	rideID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var ride models.VTCRide
	if err := database.DB.First(&ride, uint(rideID)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Course non trouvée"})
	}

	// Driver or requester can update driver location
	if ride.DriverID != nil && *ride.DriverID != userID && ride.RequesterID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Accès interdit"})
	}

	type Req struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	database.DB.Model(&ride).Updates(map[string]interface{}{
		"driver_lat": req.Latitude,
		"driver_lng": req.Longitude,
	})

	// Push to passenger (and requester if different)
	notifyIDs := []uint{ride.PassengerID}
	if ride.RequesterID != ride.PassengerID {
		notifyIDs = append(notifyIDs, ride.RequesterID)
	}

	if h.WSHub != nil {
		for _, id := range notifyIDs {
			if id != userID {
				h.WSHub.SendToUser(id, WSMessage{
					Type: "vtc_driver_location",
					Data: map[string]interface{}{
						"ride_id":   ride.ID,
						"latitude":  req.Latitude,
						"longitude": req.Longitude,
					},
				})
			}
		}
	}

	return c.JSON(fiber.Map{"updated": true})
}

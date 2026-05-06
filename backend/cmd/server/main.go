package main

import (
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/handlers"
	"github.com/lomilomi/backend/internal/middleware"
	"github.com/lomilomi/backend/internal/models"
)

func main() {
	cfg := config.Load()

	// Database
	database.Connect(cfg)
	database.Migrate()
	database.Seed()

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:   "Lomi Lomi API v1.0",
		BodyLimit: 10 * 1024 * 1024, // 10 MB max body size
	})

	// Middleware
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.RateLimitAPI())
	// Normalize CORS origins: Fiber v2.52+ requires ", " (comma+space) separator
	rawOrigins := strings.Split(cfg.CORSOrigin, ",")
	for i := range rawOrigins {
		rawOrigins[i] = strings.TrimSpace(rawOrigins[i])
	}
	corsOrigins := strings.Join(rawOrigins, ", ")
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "Lomi Lomi API",
		})
	})

	// Bootstrap admin (secured by ADMIN_SECRET env var, one-time use)
	app.Post("/api/bootstrap-admin", func(c *fiber.Ctx) error {
		secret := os.Getenv("ADMIN_SECRET")
		if secret == "" || c.Get("X-Admin-Secret") != secret {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		}

		// Check if an admin already exists
		var adminCount int64
		database.DB.Model(&models.User{}).Where("role = 'admin'").Count(&adminCount)
		if adminCount > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Un administrateur existe déjà"})
		}

		var req struct {
			Email string `json:"email"`
		}
		if err := c.BodyParser(&req); err != nil || req.Email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email required"})
		}
		if err := database.DB.Exec("UPDATE users SET role = 'admin' WHERE email = ?", req.Email).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Erreur interne"})
		}
		return c.JSON(fiber.Map{"ok": true, "message": req.Email + " promoted to admin"})
	})

	// Handlers
	wsHub := handlers.NewWSHub(cfg)
	authHandler := handlers.NewAuthHandler(cfg)
	profileHandler := handlers.NewProfileHandler(wsHub)
	shopHandler := handlers.NewShopHandler()
	placeHandler := handlers.NewPlaceHandler()
	adminHandler := handlers.NewAdminHandler()
	wellnessHandler := handlers.NewWellnessHandler()
	matchHandler := handlers.NewMatchHandler()
	paymentHandler := handlers.NewOrangeMoneyHandler(cfg)
	servicePayHandler := handlers.NewServicePaymentHandler(cfg)
	uploadHandler := handlers.NewUploadHandler(cfg)
	safetyHandler := handlers.NewSafetyHandler()
	ownerHandler := handlers.NewOwnerHandler()
	deliveryHandler := handlers.NewDeliveryHandler()
	pushHandler := handlers.NewPushHandler()
	premiumHandler := handlers.NewPremiumHandler()
	eventHandler := handlers.NewEventHandler()
	profileExtHandler := handlers.NewProfileExtHandler(cfg)
	messageHandler := handlers.NewMessageHandler(wsHub, cfg)
	locationHandler := handlers.NewLocationHandler(wsHub)
	deliveryTrackingHandler := handlers.NewDeliveryTrackingHandler(wsHub)

	// Public routes
	api := app.Group("/api/v1")
	authRateLimit := middleware.RateLimitAuth()
	api.Post("/auth/register", authRateLimit, authHandler.Register)
	api.Post("/auth/login", authRateLimit, authHandler.Login)
	api.Post("/auth/send-otp", authRateLimit, authHandler.SendOTP)
	api.Post("/auth/verify-otp", authRateLimit, authHandler.VerifyOTP)
	api.Post("/auth/register-phone", authRateLimit, authHandler.RegisterPhone)
	api.Post("/auth/forgot-password", authRateLimit, authHandler.ForgotPassword)
	api.Post("/auth/reset-password", authRateLimit, authHandler.ResetPassword)

	// Public shop & places
	api.Get("/shop/products", shopHandler.GetProducts)
	api.Get("/shop/products/:id", shopHandler.GetProduct)
	api.Get("/places", placeHandler.GetPlaces)
	api.Get("/places/:id", placeHandler.GetPlace)

	// Public events
	api.Get("/events", eventHandler.GetEvents)
	api.Get("/events/:id", eventHandler.GetEvent)

	// Public wellness
	api.Get("/wellness/providers", wellnessHandler.GetProviders)
	api.Get("/wellness/providers/:id", wellnessHandler.GetProvider)
	api.Get("/wellness/services/:id", wellnessHandler.GetService)

	// Protected routes
	jwt := middleware.JWTAuth(cfg)
	api.Get("/auth/me", jwt, authHandler.Me)
	api.Put("/auth/password", jwt, authHandler.ChangePassword)
	api.Delete("/auth/account", jwt, authHandler.DeleteAccount)

	api.Get("/profiles/:id", jwt, profileHandler.GetProfile)
	api.Put("/profiles/me", jwt, profileHandler.UpdateProfile)
	api.Get("/preferences", jwt, profileHandler.GetPreferences)
	api.Put("/preferences", jwt, profileHandler.UpdatePreferences)
	api.Get("/discover", jwt, profileHandler.Discover)
	api.Get("/nearby", jwt, profileHandler.NearbyUsers)
	api.Post("/location", jwt, profileHandler.UpdateMyLocation)
	api.Get("/search", jwt, profileHandler.SearchProfiles)

	// Like / Match
	api.Post("/likes", jwt, matchHandler.LikeUser)
	api.Post("/superlikes", jwt, matchHandler.SuperLike)
	api.Get("/likes/me", jwt, matchHandler.WhoLikedMe)
	api.Post("/rewind", jwt, matchHandler.Rewind)
	api.Post("/pass", jwt, matchHandler.PassUser)
	api.Get("/matches", jwt, matchHandler.GetMatches)
	api.Delete("/matches/:id", jwt, matchHandler.Unmatch)

	// Notifications
	api.Get("/notifications", jwt, matchHandler.GetNotifications)
	api.Get("/notifications/unread", jwt, matchHandler.UnreadCount)
	api.Put("/notifications/read", jwt, matchHandler.MarkNotificationsRead)
	api.Delete("/notifications/:id", jwt, matchHandler.DeleteNotification)

	// Messaging
	api.Get("/conversations", jwt, messageHandler.GetConversations)
	api.Get("/conversations/:id/messages", jwt, messageHandler.GetMessages)
	api.Post("/messages", jwt, messageHandler.SendMessage)
	api.Put("/conversations/:id/read", jwt, messageHandler.MarkRead)
	api.Get("/conversations/with/:userId", jwt, messageHandler.GetOrCreateConversation)
	api.Delete("/messages/:id", jwt, messageHandler.DeleteMessage)
	api.Put("/messages/:id", jwt, messageHandler.EditMessage)
	api.Get("/messages/search", jwt, messageHandler.SearchMessages)

	// Location sharing
	api.Post("/location/share", jwt, locationHandler.StartLocationShare)
	api.Put("/location/share/:id", jwt, locationHandler.UpdateLocation)
	api.Delete("/location/share/:id", jwt, locationHandler.StopLocationShare)
	api.Get("/location/shares", jwt, locationHandler.GetActiveShares)

	// VTC Rides
	api.Post("/vtc/rides", jwt, locationHandler.RequestVTCRide)
	api.Get("/vtc/rides", jwt, locationHandler.GetMyVTCRides)
	api.Get("/vtc/rides/:id", jwt, locationHandler.GetVTCRide)
	api.Put("/vtc/rides/:id/status", jwt, locationHandler.UpdateVTCRideStatus)
	api.Put("/vtc/rides/:id/driver-location", jwt, locationHandler.UpdateVTCDriverLocation)

	// Shop
	api.Post("/shop/orders", jwt, shopHandler.CreateOrder)
	api.Get("/shop/orders", jwt, shopHandler.GetOrders)

	// Delivery tracking (boutique)
	// Admin/Owner : créer une mission pour une commande
	api.Post("/shop/orders/:orderID/delivery", jwt, middleware.RequireRole("admin", "owner"), deliveryTrackingHandler.CreateDeliveryRequest)
	// Client : suivre la livraison de sa commande
	api.Get("/shop/orders/:orderID/delivery", jwt, deliveryTrackingHandler.GetDeliveryByOrder)
	// Livreur : missions disponibles & mes missions
	api.Get("/delivery/available", jwt, middleware.RequireRole("livreur", "admin"), deliveryTrackingHandler.GetAvailableDeliveries)
	api.Get("/delivery/mine", jwt, middleware.RequireRole("livreur", "admin"), deliveryTrackingHandler.GetMyDeliveries)
	// Toutes parties : détail d'une mission
	api.Get("/delivery/:id", jwt, deliveryTrackingHandler.GetDelivery)
	// Livreur : actions sur une mission
	api.Post("/delivery/:id/accept", jwt, middleware.RequireRole("livreur", "admin"), deliveryTrackingHandler.AcceptDelivery)
	api.Put("/delivery/:id/status", jwt, middleware.RequireRole("livreur", "admin"), deliveryTrackingHandler.UpdateDeliveryStatus)
	api.Put("/delivery/:id/location", jwt, middleware.RequireRole("livreur", "admin"), deliveryTrackingHandler.UpdateDeliveryLocation)

	// Orange Money (XML-RPC API BF)
	api.Post("/om/ussd-code", jwt, paymentHandler.GetUSSDCode)
	api.Post("/om/confirm", jwt, paymentHandler.ConfirmPayment)
	api.Get("/orders/:id/payment-status", jwt, paymentHandler.CheckPaymentStatus)

	// Service payments (connection, reservation, booking)
	api.Get("/pay/connection/:userId", jwt, servicePayHandler.CheckConnectionPaid)
	api.Post("/pay/connection/initiate", jwt, servicePayHandler.InitiateConnectionPayment)
	api.Post("/pay/connection/confirm", jwt, servicePayHandler.ConfirmConnectionPayment)
	api.Post("/pay/reservation/initiate", jwt, servicePayHandler.InitiateReservationPayment)
	api.Post("/pay/reservation/confirm", jwt, servicePayHandler.ConfirmReservationPayment)
	api.Post("/pay/booking/initiate", jwt, servicePayHandler.InitiateBookingPayment)
	api.Post("/pay/booking/confirm", jwt, servicePayHandler.ConfirmBookingPayment)

	// Push notifications
	api.Post("/push/register", jwt, pushHandler.RegisterPushToken)
	api.Delete("/push/register", jwt, pushHandler.UnregisterPushToken)

	// Premium
	api.Get("/premium/plans", premiumHandler.GetPlans)
	api.Get("/premium/me", jwt, premiumHandler.GetMySubscription)
	api.Post("/premium/subscribe", jwt, premiumHandler.Subscribe)
	api.Delete("/premium/subscribe", jwt, premiumHandler.CancelSubscription)

	// Events (authenticated)
	api.Post("/events/:id/attend", jwt, eventHandler.AttendEvent)
	api.Get("/events/me", jwt, eventHandler.GetMyEvents)

	// Prompts & extended profile
	api.Get("/prompts", jwt, profileExtHandler.GetPrompts)
	api.Post("/prompts", jwt, profileExtHandler.SavePrompts)
	api.Post("/onboarding/complete", jwt, profileExtHandler.CompleteOnboarding)

	// Selfie verification
	uploadRL := middleware.RateLimitUpload()
	api.Post("/messages/upload-image", jwt, uploadRL, messageHandler.UploadMessageImage)
	api.Post("/upload/selfie", jwt, uploadRL, profileExtHandler.UploadSelfie)
	api.Post("/upload/avatar", jwt, uploadRL, uploadHandler.UploadAvatar)

	// Photo gallery
	api.Post("/photos", jwt, uploadRL, uploadHandler.UploadPhoto)
	api.Delete("/photos/:id", jwt, uploadHandler.DeletePhoto)
	api.Get("/users/:id/photos", uploadHandler.GetPhotos)

	// Email verification
	api.Post("/auth/send-verification", jwt, uploadHandler.SendVerification)
	api.Get("/auth/verify-email", uploadHandler.VerifyEmail)

	// Wellness bookings & reviews
	api.Post("/wellness/bookings", jwt, wellnessHandler.CreateBooking)
	api.Get("/wellness/bookings", jwt, wellnessHandler.GetMyBookings)
	api.Put("/wellness/bookings/:id/cancel", jwt, wellnessHandler.CancelBooking)
	api.Post("/wellness/reviews", jwt, wellnessHandler.CreateReview)

	// Safety: report & block
	api.Post("/reports", jwt, safetyHandler.CreateReport)
	api.Post("/blocks", jwt, safetyHandler.BlockUser)
	api.Delete("/blocks/:id", jwt, safetyHandler.UnblockUser)
	api.Get("/blocks", jwt, safetyHandler.GetBlockedUsers)

	// Delivery addresses
	api.Get("/addresses", jwt, deliveryHandler.GetAddresses)
	api.Post("/addresses", jwt, deliveryHandler.CreateAddress)
	api.Put("/addresses/:id", jwt, deliveryHandler.UpdateAddress)
	api.Delete("/addresses/:id", jwt, deliveryHandler.DeleteAddress)

	// Place reservations (user side)
	api.Post("/places/reservations", jwt, deliveryHandler.CreatePlaceReservation)
	api.Get("/places/reservations", jwt, deliveryHandler.GetMyReservations)
	api.Put("/places/reservations/:id/cancel", jwt, deliveryHandler.CancelReservation)

	// Order tracking (user side)
	api.Get("/orders/:id/tracking", jwt, deliveryHandler.GetOrderTracking)

	// Static uploads directory
	app.Static("/uploads", cfg.UploadDir)

	// WebSocket endpoint (authenticated via token query param)
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws", websocket.New(wsHub.HandleWebSocket))

	// Admin routes (requires JWT + admin role)
	admin := api.Group("/admin", middleware.JWTAuth(cfg), middleware.RequireAdmin())

	// Owner dashboard routes (requires JWT + owner or admin role)
	owner := api.Group("/owner", middleware.JWTAuth(cfg), middleware.RequireOwner())
	owner.Get("/stats", ownerHandler.GetStats)
	owner.Get("/places", ownerHandler.GetMyPlaces)
	owner.Put("/places/:id", ownerHandler.UpdateMyPlace)
	owner.Get("/products", ownerHandler.GetMyProducts)
	owner.Post("/products", ownerHandler.CreateMyProduct)
	owner.Put("/products/:id", ownerHandler.UpdateMyProduct)
	owner.Delete("/products/:id", ownerHandler.DeleteMyProduct)
	owner.Get("/orders", ownerHandler.GetMyOrders)
	owner.Put("/orders/:id/status", ownerHandler.UpdateOrderStatus)
	owner.Get("/wellness/bookings", ownerHandler.GetMyWellnessBookings)
	owner.Put("/wellness/bookings/:id/status", ownerHandler.UpdateBookingStatus)
	owner.Get("/reservations", ownerHandler.GetMyPlaceReservations)
	owner.Put("/reservations/:id/status", ownerHandler.UpdateReservationStatus)
	admin.Get("/stats", adminHandler.GetStats)
	admin.Get("/stats/timeline", adminHandler.GetStatsTimeline)
	admin.Get("/users", adminHandler.ListUsers)
	admin.Put("/users/:id", adminHandler.UpdateUser)
	admin.Delete("/users/:id", adminHandler.DeleteUser)
	admin.Post("/products", adminHandler.CreateProduct)
	admin.Put("/products/:id", adminHandler.UpdateProduct)
	admin.Delete("/products/:id", adminHandler.DeleteProduct)
	admin.Post("/places", adminHandler.CreatePlace)
	admin.Put("/places/:id", adminHandler.UpdatePlace)
	admin.Delete("/places/:id", adminHandler.DeletePlace)
	admin.Get("/orders", adminHandler.ListOrders)
	// Admin wellness
	admin.Post("/wellness/providers", wellnessHandler.AdminCreateProvider)
	admin.Put("/wellness/providers/:id", wellnessHandler.AdminUpdateProvider)
	admin.Delete("/wellness/providers/:id", wellnessHandler.AdminDeleteProvider)
	admin.Post("/wellness/services", wellnessHandler.AdminCreateService)
	admin.Put("/wellness/services/:id", wellnessHandler.AdminUpdateService)
	admin.Delete("/wellness/services/:id", wellnessHandler.AdminDeleteService)
	admin.Put("/wellness/providers/:id/availability", wellnessHandler.AdminSetAvailability)
	admin.Get("/wellness/bookings", wellnessHandler.AdminListBookings)
	admin.Put("/wellness/bookings/:id/status", wellnessHandler.AdminUpdateBookingStatus)
	admin.Put("/orders/:id/status", adminHandler.UpdateOrderStatus)
	admin.Get("/reports", safetyHandler.AdminListReports)
	admin.Put("/reports/:id", safetyHandler.AdminUpdateReport)
	admin.Put("/users/:id/ban", safetyHandler.AdminBanUser)
	admin.Get("/users/:id/reports-count", safetyHandler.AdminGetReportCount)

	// Admin premium & selfie
	admin.Post("/premium/grant", premiumHandler.AdminGrantPremium)
	admin.Get("/selfies", profileExtHandler.AdminListSelfies)
	admin.Post("/selfies/review", profileExtHandler.AdminReviewSelfie)

	// Admin events
	admin.Post("/events", eventHandler.AdminCreateEvent)
	admin.Put("/events/:id", eventHandler.AdminUpdateEvent)
	admin.Delete("/events/:id", eventHandler.AdminDeleteEvent)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")
		_ = app.Shutdown()
	}()

	log.Printf("Lomi Lomi API starting on :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

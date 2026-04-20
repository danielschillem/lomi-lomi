package main

import (
	"log"
	"os"
	"os/signal"
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
)

func main() {
	cfg := config.Load()

	// Database
	database.Connect(cfg)
	database.Migrate()

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Lomi Lomi API v1.0",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.RateLimitAPI())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	}))

	// Health check
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "Lomi Lomi API",
		})
	})

	// Handlers
	authHandler := handlers.NewAuthHandler(cfg)
	profileHandler := handlers.NewProfileHandler()
	shopHandler := handlers.NewShopHandler()
	placeHandler := handlers.NewPlaceHandler()
	adminHandler := handlers.NewAdminHandler()
	wellnessHandler := handlers.NewWellnessHandler()
	matchHandler := handlers.NewMatchHandler()
	paymentHandler := handlers.NewPaymentHandler(cfg)
	uploadHandler := handlers.NewUploadHandler(cfg)
	safetyHandler := handlers.NewSafetyHandler()
	wsHub := handlers.NewWSHub(cfg)
	messageHandler := handlers.NewMessageHandler(wsHub)

	// Public routes
	api := app.Group("/api/v1")
	authRateLimit := middleware.RateLimitAuth()
	api.Post("/auth/register", authRateLimit, authHandler.Register)
	api.Post("/auth/login", authRateLimit, authHandler.Login)
	api.Post("/auth/send-otp", authRateLimit, authHandler.SendOTP)
	api.Post("/auth/verify-otp", authRateLimit, authHandler.VerifyOTP)
	api.Post("/auth/register-phone", authRateLimit, authHandler.RegisterPhone)

	// Public shop & places
	api.Get("/shop/products", shopHandler.GetProducts)
	api.Get("/shop/products/:id", shopHandler.GetProduct)
	api.Get("/places", placeHandler.GetPlaces)
	api.Get("/places/:id", placeHandler.GetPlace)

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
	api.Get("/search", jwt, profileHandler.SearchProfiles)

	// Like / Match
	api.Post("/likes", jwt, matchHandler.LikeUser)
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

	// Shop
	api.Post("/shop/orders", jwt, shopHandler.CreateOrder)
	api.Get("/shop/orders", jwt, shopHandler.GetOrders)

	// Stripe Checkout
	api.Post("/checkout", jwt, paymentHandler.CreateCheckout)
	api.Post("/stripe/webhook", paymentHandler.HandleWebhook)

	// Upload avatar
	api.Post("/upload/avatar", jwt, uploadHandler.UploadAvatar)

	// Photo gallery
	api.Post("/photos", jwt, uploadHandler.UploadPhoto)
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

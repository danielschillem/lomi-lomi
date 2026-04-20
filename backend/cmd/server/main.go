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

	// Public shop & places
	api.Get("/shop/products", shopHandler.GetProducts)
	api.Get("/shop/products/:id", shopHandler.GetProduct)
	api.Get("/places", placeHandler.GetPlaces)
	api.Get("/places/:id", placeHandler.GetPlace)

	// Protected routes
	protected := api.Group("", middleware.JWTAuth(cfg))
	protected.Get("/auth/me", authHandler.Me)
	protected.Put("/auth/password", authHandler.ChangePassword)
	protected.Delete("/auth/account", authHandler.DeleteAccount)

	protected.Get("/profiles/:id", profileHandler.GetProfile)
	protected.Put("/profiles/me", profileHandler.UpdateProfile)
	protected.Get("/preferences", profileHandler.GetPreferences)
	protected.Put("/preferences", profileHandler.UpdatePreferences)
	protected.Get("/discover", profileHandler.Discover)
	protected.Get("/search", profileHandler.SearchProfiles)

	// Like / Match
	protected.Post("/likes", matchHandler.LikeUser)
	protected.Post("/pass", matchHandler.PassUser)
	protected.Get("/matches", matchHandler.GetMatches)
	protected.Delete("/matches/:id", matchHandler.Unmatch)

	// Notifications
	protected.Get("/notifications", matchHandler.GetNotifications)
	protected.Get("/notifications/unread", matchHandler.UnreadCount)
	protected.Put("/notifications/read", matchHandler.MarkNotificationsRead)
	protected.Delete("/notifications/:id", matchHandler.DeleteNotification)

	// Messaging
	protected.Get("/conversations", messageHandler.GetConversations)
	protected.Get("/conversations/:id/messages", messageHandler.GetMessages)
	protected.Post("/messages", messageHandler.SendMessage)
	protected.Put("/conversations/:id/read", messageHandler.MarkRead)
	protected.Get("/conversations/with/:userId", messageHandler.GetOrCreateConversation)

	// Shop
	protected.Post("/shop/orders", shopHandler.CreateOrder)
	protected.Get("/shop/orders", shopHandler.GetOrders)

	// Stripe Checkout
	protected.Post("/checkout", paymentHandler.CreateCheckout)
	api.Post("/stripe/webhook", paymentHandler.HandleWebhook)

	// Upload avatar
	protected.Post("/upload/avatar", uploadHandler.UploadAvatar)

	// Photo gallery
	protected.Post("/photos", uploadHandler.UploadPhoto)
	protected.Delete("/photos/:id", uploadHandler.DeletePhoto)
	api.Get("/users/:id/photos", uploadHandler.GetPhotos)

	// Email verification
	protected.Post("/auth/send-verification", uploadHandler.SendVerification)
	api.Get("/auth/verify-email", uploadHandler.VerifyEmail)

	// Safety: report & block
	protected.Post("/reports", safetyHandler.CreateReport)
	protected.Post("/blocks", safetyHandler.BlockUser)
	protected.Delete("/blocks/:id", safetyHandler.UnblockUser)
	protected.Get("/blocks", safetyHandler.GetBlockedUsers)

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

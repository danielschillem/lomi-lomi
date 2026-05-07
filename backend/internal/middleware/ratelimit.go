package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitAPI applies route-aware API rate limits.
// - General API: 120 req/min/IP
// - Messaging/notifications/realtime-heavy endpoints: 300 req/min/IP
// Excludes webhook endpoints which have their own validation.
func RateLimitAPI() fiber.Handler {
	generalRL := limiter.New(limiter.Config{
		Max:        120,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Trop de requêtes, réessayez dans un instant",
			})
		},
	})

	realtimeRL := limiter.New(limiter.Config{
		Max:        300,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Trop de requêtes temps réel, réessayez dans un instant",
			})
		},
	})

	return func(c *fiber.Ctx) error {
		// Skip rate limiting for webhooks (validated by signature)
		if c.Path() == "/api/v1/om/webhook" {
			return c.Next()
		}

		path := c.Path()
		// Chat/notification intensive routes can generate bursts from polling,
		// read receipts and websocket reconnects.
		if strings.HasPrefix(path, "/api/v1/messages") ||
			strings.HasPrefix(path, "/api/v1/conversations") ||
			strings.HasPrefix(path, "/api/v1/notifications") ||
			path == "/ws" {
			return realtimeRL(c)
		}

		return generalRL(c)
	}
}

// RateLimitAuth applies a strict rate limit for auth endpoints (5 requests per minute per IP).
func RateLimitAuth() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Trop de tentatives, réessayez dans une minute",
			})
		},
	})
}

// RateLimitUpload applies a rate limit for upload endpoints (10 per minute per IP).
func RateLimitUpload() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Trop d'uploads, réessayez dans un instant",
			})
		},
	})
}

package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitAPI applies a general API rate limit (60 requests per minute per IP).
// Excludes webhook endpoints which have their own validation.
func RateLimitAPI() fiber.Handler {
	rl := limiter.New(limiter.Config{
		Max:        60,
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
	return func(c *fiber.Ctx) error {
		// Skip rate limiting for webhooks (validated by signature)
		if c.Path() == "/api/v1/om/webhook" {
			return c.Next()
		}
		return rl(c)
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

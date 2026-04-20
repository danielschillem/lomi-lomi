package config

import (
	"log"
	"os"
)

type Config struct {
	Port             string
	DBDriver         string
	DBHost           string
	DBPort           string
	DBUser           string
	DBPass           string
	DBName           string
	DBSSLMode        string
	JWTSecret        string
	CORSOrigin       string
	StripeSecretKey  string
	StripeWebhookSec string
	UploadDir        string
	SMTPHost         string
	SMTPPort         string
	SMTPUser         string
	SMTPPass         string
	SMTPFrom         string
	BaseURL          string
	TwilioSID        string
	TwilioToken      string
	TwilioPhone      string
}

func Load() *Config {
	cfg := &Config{
		Port:             getEnv("PORT", "8888"),
		DBDriver:         getEnv("DB_DRIVER", "sqlite"),
		DBHost:           getEnv("DB_HOST", "localhost"),
		DBPort:           getEnv("DB_PORT", "5432"),
		DBUser:           getEnv("DB_USER", "lomilomi"),
		DBPass:           getEnv("DB_PASS", "lomilomi"),
		DBName:           getEnv("DB_NAME", "lomilomi"),
		DBSSLMode:        getEnv("DB_SSLMODE", "disable"),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		CORSOrigin:       getEnv("CORS_ORIGIN", "http://localhost:3000"),
		StripeSecretKey:  getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSec: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		UploadDir:        getEnv("UPLOAD_DIR", "./uploads"),
		SMTPHost:         getEnv("SMTP_HOST", ""),
		SMTPPort:         getEnv("SMTP_PORT", "587"),
		SMTPUser:         getEnv("SMTP_USER", ""),
		SMTPPass:         getEnv("SMTP_PASS", ""),
		SMTPFrom:         getEnv("SMTP_FROM", "noreply@lomilomi.app"),
		BaseURL:          getEnv("BASE_URL", "http://localhost:8888"),
		TwilioSID:        getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioToken:      getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioPhone:      getEnv("TWILIO_PHONE_NUMBER", ""),
	}

	if cfg.JWTSecret == "change-me-in-production" {
		log.Println("⚠️  WARNING: JWT_SECRET is using the default value. Set JWT_SECRET env var in production!")
	}

	return cfg
}

func (c *Config) DSN() string {
	return "host=" + c.DBHost +
		" port=" + c.DBPort +
		" user=" + c.DBUser +
		" password=" + c.DBPass +
		" dbname=" + c.DBName +
		" sslmode=" + c.DBSSLMode
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

package config

import (
	"log"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	Port               string
	DBDriver           string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPass             string
	DBName             string
	DBSSLMode          string
	JWTSecret          string
	CORSOrigin         string
	OrangeMoneyBaseURL string
	OrangeMoneyAPIKey  string
	OrangeMoneyPIN     string
	UploadDir          string
	SMTPHost           string
	SMTPPort           string
	SMTPUser           string
	SMTPPass           string
	SMTPFrom           string
	BaseURL            string
	TwilioSID          string
	TwilioToken        string
	TwilioPhone        string
}

func Load() *Config {
	cfg := &Config{
		Port:               getEnv("PORT", "8888"),
		DBDriver:           getEnv("DB_DRIVER", "sqlite"),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "lomilomi"),
		DBPass:             getEnv("DB_PASS", "lomilomi"),
		DBName:             getEnv("DB_NAME", "lomilomi"),
		DBSSLMode:          getEnv("DB_SSLMODE", "disable"),
		JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production"),
		CORSOrigin:         getEnv("CORS_ORIGIN", "http://localhost:3000"),
		OrangeMoneyBaseURL: getEnv("OM_BASE_URL", "https://api.orange.com/orange-money-webpay/dev/v1"),
		OrangeMoneyAPIKey:  getEnv("OM_API_KEY", ""),
		OrangeMoneyPIN:     getEnv("OM_PIN", ""),
		UploadDir:          getEnv("UPLOAD_DIR", "./uploads"),
		SMTPHost:           getEnv("SMTP_HOST", ""),
		SMTPPort:           getEnv("SMTP_PORT", "587"),
		SMTPUser:           getEnv("SMTP_USER", ""),
		SMTPPass:           getEnv("SMTP_PASS", ""),
		SMTPFrom:           getEnv("SMTP_FROM", "noreply@lomilomi.app"),
		BaseURL:            getEnv("BASE_URL", "http://localhost:8888"),
		TwilioSID:          getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioToken:        getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioPhone:        getEnv("TWILIO_PHONE_NUMBER", ""),
	}

	if cfg.JWTSecret == "change-me-in-production" {
		log.Println("⚠️  WARNING: JWT_SECRET is using the default value. Set JWT_SECRET env var in production!")
	}

	// Support DATABASE_URL (e.g. from docker-compose)
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		cfg.DBDriver = "postgres"
		if parsed, err := url.Parse(dbURL); err == nil {
			cfg.DBHost = parsed.Hostname()
			cfg.DBPort = parsed.Port()
			if cfg.DBPort == "" {
				cfg.DBPort = "5432"
			}
			cfg.DBUser = parsed.User.Username()
			cfg.DBPass, _ = parsed.User.Password()
			cfg.DBName = strings.TrimPrefix(parsed.Path, "/")
			if parsed.Query().Get("sslmode") != "" {
				cfg.DBSSLMode = parsed.Query().Get("sslmode")
			} else {
				cfg.DBSSLMode = "require"
			}
		}
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

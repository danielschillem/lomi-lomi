package database

import (
	"log"

	"github.com/glebarez/sqlite"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	var err error
	var dialector gorm.Dialector

	switch cfg.DBDriver {
	case "postgres":
		dialector = postgres.Open(cfg.DSN())
		log.Println("Using PostgreSQL database")
	default:
		dialector = sqlite.Open("lomilomi.db")
		log.Println("Using SQLite database (dev mode)")
	}

	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connected successfully")
}

func Migrate() {
	err := DB.AutoMigrate(
		&models.User{},
		&models.UserPreference{},
		&models.Photo{},
		&models.Like{},
		&models.Pass{},
		&models.Match{},
		&models.Notification{},
		&models.EmailVerification{},
		&models.Report{},
		&models.Block{},
		&models.OTP{},
		&models.Conversation{},
		&models.Message{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
		&models.Place{},
		&models.WellnessProvider{},
		&models.WellnessService{},
		&models.WellnessAvailability{},
		&models.WellnessBooking{},
		&models.WellnessReview{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	log.Println("Database migrated successfully")
}

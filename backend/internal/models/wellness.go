package models

import (
	"time"

	"gorm.io/gorm"
)

// WellnessProvider represents a wellness professional (masseur, spa, etc.)
type WellnessProvider struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OwnerID        uint    `gorm:"index" json:"owner_id"`
	Name           string  `gorm:"size:200;not null" json:"name"`
	Description    string  `gorm:"type:text" json:"description"`
	Category       string  `gorm:"size:100;index" json:"category"` // spa, massage_salon, massage_home, aesthetics, yoga, coaching
	ImageURL       string  `gorm:"size:500" json:"image_url"`
	Phone          string  `gorm:"size:20" json:"phone"`
	Email          string  `gorm:"size:255" json:"email"`
	Website        string  `gorm:"size:300" json:"website"`
	Address        string  `gorm:"size:500" json:"address"`
	City           string  `gorm:"size:100;index" json:"city"`
	Latitude       float64 `json:"latitude"`
	Longitude      float64 `json:"longitude"`
	Rating         float64 `gorm:"default:0" json:"rating"`
	ReviewCount    int     `gorm:"default:0" json:"review_count"`
	Certifications string  `gorm:"type:text" json:"certifications"` // JSON array as string
	MobileService  bool    `gorm:"default:false" json:"mobile_service"`
	IsVerified     bool    `gorm:"default:false" json:"is_verified"`
	IsActive       bool    `gorm:"default:true" json:"is_active"`

	Services       []WellnessService      `gorm:"foreignKey:ProviderID" json:"services,omitempty"`
	Availabilities []WellnessAvailability `gorm:"foreignKey:ProviderID" json:"availabilities,omitempty"`
	Owner          User                   `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
}

// WellnessService represents a service offered by a provider
type WellnessService struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ProviderID  uint    `gorm:"not null;index" json:"provider_id"`
	Name        string  `gorm:"size:200;not null" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Duration    int     `gorm:"not null" json:"duration"` // in minutes
	Price       float64 `gorm:"not null" json:"price"`
	Category    string  `gorm:"size:100;index" json:"category"` // relaxation, hot_stones, thai, sport, facial, manicure, yoga, meditation
	IsDuo       bool    `gorm:"default:false" json:"is_duo"`
	IsActive    bool    `gorm:"default:true" json:"is_active"`

	Provider WellnessProvider `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
}

// WellnessAvailability represents a provider's available time slots
type WellnessAvailability struct {
	ID         uint   `gorm:"primaryKey" json:"id"`
	ProviderID uint   `gorm:"not null;index" json:"provider_id"`
	DayOfWeek  int    `gorm:"not null" json:"day_of_week"`       // 0=Sunday, 1=Monday, ...
	StartTime  string `gorm:"size:5;not null" json:"start_time"` // "09:00"
	EndTime    string `gorm:"size:5;not null" json:"end_time"`   // "18:00"
}

// WellnessBooking represents a reservation
type WellnessBooking struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID     uint      `gorm:"not null;index" json:"user_id"`
	ServiceID  uint      `gorm:"not null;index" json:"service_id"`
	ProviderID uint      `gorm:"not null;index" json:"provider_id"`
	Date       time.Time `gorm:"not null;index" json:"date"`
	StartTime  string    `gorm:"size:5;not null" json:"start_time"`     // "14:00"
	EndTime    string    `gorm:"size:5;not null" json:"end_time"`       // "15:00"
	Persons    int       `gorm:"default:1" json:"persons"`              // 1=solo, 2=duo
	GuestID    *uint     `json:"guest_id,omitempty"`                    // invite a match
	Status     string    `gorm:"size:50;default:pending" json:"status"` // pending, confirmed, completed, canceled
	TotalPrice float64   `gorm:"not null" json:"total_price"`
	Notes      string    `gorm:"size:500" json:"notes"`
	PaymentID  string    `gorm:"size:255" json:"payment_id"`

	User     User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Guest    *User            `gorm:"foreignKey:GuestID" json:"guest,omitempty"`
	Service  WellnessService  `gorm:"foreignKey:ServiceID" json:"service,omitempty"`
	Provider WellnessProvider `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
}

// WellnessReview represents a user review after a booking
type WellnessReview struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID     uint    `gorm:"not null;index" json:"user_id"`
	BookingID  uint    `gorm:"uniqueIndex;not null" json:"booking_id"`
	ProviderID uint    `gorm:"not null;index" json:"provider_id"`
	Rating     float64 `gorm:"not null" json:"rating"` // 1-5
	Comment    string  `gorm:"size:1000" json:"comment"`

	User     User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Booking  WellnessBooking  `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
	Provider WellnessProvider `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
}

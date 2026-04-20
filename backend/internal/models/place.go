package models

import (
	"time"

	"gorm.io/gorm"
)

type Place struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OwnerID     uint    `gorm:"index" json:"owner_id"`
	Name        string  `gorm:"size:200;not null" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Category    string  `gorm:"size:100;index" json:"category"` // hotel, restaurant, leisure
	Address     string  `gorm:"size:500" json:"address"`
	City        string  `gorm:"size:100;index" json:"city"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	ImageURL    string  `gorm:"size:500" json:"image_url"`
	Phone       string  `gorm:"size:20" json:"phone"`
	Website     string  `gorm:"size:300" json:"website"`
	Rating      float64 `gorm:"default:0" json:"rating"`
	IsPartner   bool    `gorm:"default:false" json:"is_partner"`

	Owner User `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
}

// PlaceReservation represents a booking for a place (hotel, restaurant)
type PlaceReservation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	PlaceID   uint      `gorm:"not null;index" json:"place_id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Date      time.Time `gorm:"not null;index" json:"date"`
	EndDate   time.Time `json:"end_date"`
	Persons   int       `gorm:"default:1" json:"persons"`
	Status    string    `gorm:"size:50;default:pending" json:"status"` // pending, confirmed, canceled, completed
	Notes     string    `gorm:"size:500" json:"notes"`
	PaymentID string    `gorm:"size:255" json:"payment_id"`

	Place Place `gorm:"foreignKey:PlaceID" json:"place,omitempty"`
	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

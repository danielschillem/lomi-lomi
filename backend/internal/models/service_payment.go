package models

import (
	"time"

	"gorm.io/gorm"
)

// ServicePayment tracks paid actions: messaging connection, place reservation, wellness booking
type ServicePayment struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID        uint    `gorm:"not null;index" json:"user_id"`
	Type          string  `gorm:"size:50;not null;index" json:"type"`   // connection, reservation, booking
	Amount        float64 `gorm:"not null" json:"amount"`               // 250 or 500
	Status        string  `gorm:"size:30;default:pending" json:"status"` // pending, paid, failed
	TransactionID string  `gorm:"size:255" json:"transaction_id"`
	// Reference to what was paid for
	TargetUserID *uint `gorm:"index" json:"target_user_id,omitempty"` // for connection: the other user
	ReferenceID  *uint `json:"reference_id,omitempty"`                // for reservation/booking: place_reservation_id or booking_id

	User       User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	TargetUser *User `gorm:"foreignKey:TargetUserID" json:"target_user,omitempty"`
}

// Service payment amounts
const (
	ConnectionFee  = 250 // FCFA - one-time fee to message a new user
	ReservationFee = 500 // FCFA - per place reservation
	BookingFee     = 500 // FCFA - per wellness booking
)

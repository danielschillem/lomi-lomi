package models

import (
	"time"

	"gorm.io/gorm"
)

type Product struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OwnerID     uint    `gorm:"index" json:"owner_id"`
	Name        string  `gorm:"size:200;not null" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Price       float64 `gorm:"not null" json:"price"`
	ImageURL    string  `gorm:"size:500" json:"image_url"`
	Category    string  `gorm:"size:100;index" json:"category"`
	Stock       int     `gorm:"default:0" json:"stock"`
	IsActive    bool    `gorm:"default:true" json:"is_active"`

	Owner User `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
}

type Order struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID            uint    `gorm:"not null;index" json:"user_id"`
	TotalAmount       float64 `gorm:"not null" json:"total_amount"`
	Status            string  `gorm:"size:50;default:pending" json:"status"` // pending, confirmed, preparing, shipped, delivered, canceled
	PaymentID         string  `gorm:"size:255" json:"payment_id"`
	DeliveryAddressID *uint   `gorm:"index" json:"delivery_address_id"`

	User            User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	DeliveryAddress *DeliveryAddress `gorm:"foreignKey:DeliveryAddressID" json:"delivery_address,omitempty"`
	Items           []OrderItem      `json:"items,omitempty"`
}

type OrderItem struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	OrderID   uint    `gorm:"not null;index" json:"order_id"`
	ProductID uint    `gorm:"not null" json:"product_id"`
	Quantity  int     `gorm:"not null" json:"quantity"`
	Price     float64 `gorm:"not null" json:"price"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

// DeliveryAddress represents a user's delivery address
type DeliveryAddress struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID     uint   `gorm:"not null;index" json:"user_id"`
	Label      string `gorm:"size:100" json:"label"` // "Maison", "Bureau"
	FullName   string `gorm:"size:200;not null" json:"full_name"`
	Phone      string `gorm:"size:20" json:"phone"`
	Address    string `gorm:"size:500;not null" json:"address"`
	City       string `gorm:"size:100;not null" json:"city"`
	PostalCode string `gorm:"size:20" json:"postal_code"`
	Country    string `gorm:"size:100;default:France" json:"country"`
	IsDefault  bool   `gorm:"default:false" json:"is_default"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

package models

import (
	"time"

	"gorm.io/gorm"
)

type Conversation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User1ID uint `gorm:"not null;index" json:"user1_id"`
	User2ID uint `gorm:"not null;index" json:"user2_id"`

	User1 User `gorm:"foreignKey:User1ID" json:"user1,omitempty"`
	User2 User `gorm:"foreignKey:User2ID" json:"user2,omitempty"`
}

type Message struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ConversationID uint   `gorm:"not null;index" json:"conversation_id"`
	SenderID       uint   `gorm:"not null;index" json:"sender_id"`
	Content        string `gorm:"type:text;not null" json:"content"`
	ImageURL       string `gorm:"size:500" json:"image_url,omitempty"`
	IsRead         bool   `gorm:"default:false" json:"is_read"`
	IsEdited       bool   `gorm:"default:false" json:"is_edited"`

	// Partage de localisation
	Latitude  *float64 `json:"latitude,omitempty"`
	Longitude *float64 `json:"longitude,omitempty"`

	// Photos à vue unique
	ViewOnce bool       `gorm:"default:false" json:"view_once"`
	ViewedAt *time.Time `json:"viewed_at,omitempty"`

	Sender User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

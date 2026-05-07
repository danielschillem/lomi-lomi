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
	IsGroup bool `gorm:"default:false;index" json:"is_group"`

	Title       string `gorm:"size:120" json:"title,omitempty"`
	AvatarURL   string `gorm:"size:500" json:"avatar_url,omitempty"`
	CreatedByID uint   `gorm:"index" json:"created_by_id,omitempty"`

	User1 User `gorm:"foreignKey:User1ID" json:"user1,omitempty"`
	User2 User `gorm:"foreignKey:User2ID" json:"user2,omitempty"`

	GroupMembers []ConversationMember `gorm:"foreignKey:ConversationID" json:"group_members,omitempty"`
}

type ConversationMember struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`

	ConversationID uint   `gorm:"not null;uniqueIndex:idx_conversation_member" json:"conversation_id"`
	UserID         uint   `gorm:"not null;uniqueIndex:idx_conversation_member;index" json:"user_id"`
	Role           string `gorm:"size:20;default:member" json:"role"` // admin, member

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type Message struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ConversationID uint   `gorm:"not null;index" json:"conversation_id"`
	SenderID       uint   `gorm:"not null;index" json:"sender_id"`
	Content        string `gorm:"type:text;not null" json:"content"`
	ImageURL       string `gorm:"size:500" json:"image_url,omitempty"`
	AudioURL       string `gorm:"size:500" json:"audio_url,omitempty"`
	CallType       string `gorm:"size:10" json:"call_type,omitempty"` // audio, video
	CallRoom       string `gorm:"size:100" json:"call_room,omitempty"`
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

package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Username   string     `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Email      string     `gorm:"uniqueIndex;size:255;not null" json:"-"`
	Password   string     `gorm:"size:255;not null" json:"-"`
	Bio        string     `gorm:"size:500" json:"bio"`
	AvatarURL  string     `gorm:"size:500" json:"avatar_url"`
	Gender     string     `gorm:"size:20" json:"gender"`
	BirthDate  *time.Time `json:"birth_date"`
	City       string     `gorm:"size:100" json:"city"`
	Latitude   float64    `json:"latitude"`
	Longitude  float64    `json:"longitude"`
	IsVerified bool       `gorm:"default:false" json:"is_verified"`
	IsOnline   bool       `gorm:"default:false" json:"is_online"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	Role       string     `gorm:"size:20;default:user" json:"role"` // user, admin
}

type UserPreference struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	UserID      uint   `gorm:"uniqueIndex;not null" json:"user_id"`
	MinAge      int    `gorm:"default:18" json:"min_age"`
	MaxAge      int    `gorm:"default:99" json:"max_age"`
	MaxDistance int    `gorm:"default:50" json:"max_distance"` // km
	Gender      string `gorm:"size:20" json:"gender"`
	Interests   string `gorm:"size:1000" json:"interests"` // JSON array stored as string
}

type Like struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	LikerID   uint      `gorm:"not null;index" json:"liker_id"`
	LikedID   uint      `gorm:"not null;index" json:"liked_id"`
	Liker     User      `gorm:"foreignKey:LikerID" json:"liker,omitempty"`
	Liked     User      `gorm:"foreignKey:LikedID" json:"liked,omitempty"`
}

type Match struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	User1ID   uint      `gorm:"not null;index" json:"user1_id"`
	User2ID   uint      `gorm:"not null;index" json:"user2_id"`
	User1     User      `gorm:"foreignKey:User1ID" json:"user1,omitempty"`
	User2     User      `gorm:"foreignKey:User2ID" json:"user2,omitempty"`
}

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Type      string    `gorm:"size:50;not null" json:"type"` // match, message, order
	Title     string    `gorm:"size:200" json:"title"`
	Body      string    `gorm:"size:500" json:"body"`
	Data      string    `gorm:"type:text" json:"data"` // JSON metadata
	IsRead    bool      `gorm:"default:false" json:"is_read"`
}

type EmailVerification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Token     string    `gorm:"size:255;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
}

type Report struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	CreatedAt  time.Time `json:"created_at"`
	ReporterID uint      `gorm:"not null;index" json:"reporter_id"`
	ReportedID uint      `gorm:"not null;index" json:"reported_id"`
	Reason     string    `gorm:"size:50;not null" json:"reason"`
	Details    string    `gorm:"size:1000" json:"details"`
	Status     string    `gorm:"size:20;default:pending" json:"status"` // pending, reviewed, dismissed
	Reporter   User      `gorm:"foreignKey:ReporterID" json:"reporter,omitempty"`
	Reported   User      `gorm:"foreignKey:ReportedID" json:"reported,omitempty"`
}

type Block struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	BlockerID uint      `gorm:"not null;index:idx_blocker_blocked" json:"blocker_id"`
	BlockedID uint      `gorm:"not null;index:idx_blocker_blocked" json:"blocked_id"`
	Blocker   User      `gorm:"foreignKey:BlockerID" json:"blocker,omitempty"`
	Blocked   User      `gorm:"foreignKey:BlockedID" json:"blocked,omitempty"`
}

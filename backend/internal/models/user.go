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
	Email      string     `gorm:"uniqueIndex;size:255" json:"-"`
	Phone      string     `gorm:"uniqueIndex;size:20" json:"-"`
	Password   string     `gorm:"size:255" json:"-"`
	Bio        string     `gorm:"size:500" json:"bio"`
	AvatarURL  string     `gorm:"size:500" json:"avatar_url"`
	Gender     string     `gorm:"size:20" json:"gender"`
	LookingFor string     `gorm:"size:20" json:"looking_for"`
	BirthDate  *time.Time `json:"birth_date"`
	City       string     `gorm:"size:100" json:"city"`
	Latitude   float64    `json:"latitude"`
	Longitude  float64    `json:"longitude"`
	IsVerified bool       `gorm:"default:false" json:"is_verified"`
	IsOnline   bool       `gorm:"default:false" json:"is_online"`
	IsBanned   bool       `gorm:"default:false" json:"is_banned"`
	BanReason  string     `gorm:"size:255" json:"ban_reason,omitempty"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	Role       string     `gorm:"size:20;default:user" json:"role"` // user, owner, admin
	PushToken  string     `gorm:"size:255" json:"-"`
	// Premium
	IsPremium    bool       `gorm:"default:false" json:"is_premium"`
	PremiumUntil *time.Time `json:"premium_until,omitempty"`
	// Extended profile
	Languages      string `gorm:"size:200" json:"languages,omitempty"`       // JSON array e.g. ["Français","Moore"]
	LookingForType string `gorm:"size:50" json:"looking_for_type,omitempty"` // serious, casual, friendship
	Height         int    `gorm:"default:0" json:"height,omitempty"`         // cm
	HasChildren    string `gorm:"size:10" json:"has_children,omitempty"`     // yes, no, want
	Religion       string `gorm:"size:50" json:"religion,omitempty"`
	// Onboarding
	OnboardingDone bool `gorm:"default:false" json:"onboarding_done"`
	// Photo verification
	SelfieURL    string `gorm:"size:500" json:"selfie_url,omitempty"`
	SelfieStatus string `gorm:"size:20;default:none" json:"selfie_status"` // none, pending, approved, rejected

	Photos  []Photo  `gorm:"foreignKey:UserID" json:"photos,omitempty"`
	Prompts []Prompt `gorm:"foreignKey:UserID" json:"prompts,omitempty"`
}

type Photo struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	URL       string    `gorm:"size:500;not null" json:"url"`
	Position  int       `gorm:"default:0" json:"position"`
}

type UserPreference struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	UserID      uint   `gorm:"uniqueIndex;not null" json:"user_id"`
	MinAge      int    `gorm:"default:18" json:"min_age"`
	MaxAge      int    `gorm:"default:99" json:"max_age"`
	MaxDistance int    `gorm:"default:50" json:"max_distance"` // km
	Gender      string `gorm:"size:20" json:"gender"`
	Interests   string `gorm:"size:1000" json:"interests"` // JSON array stored as string
	ShowOnline  bool   `gorm:"default:true" json:"show_online"`
}

type Like struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	LikerID   uint      `gorm:"not null;index" json:"liker_id"`
	LikedID   uint      `gorm:"not null;index" json:"liked_id"`
	Type      string    `gorm:"size:20;default:like" json:"type"` // like, superlike
	Liker     User      `gorm:"foreignKey:LikerID" json:"liker,omitempty"`
	Liked     User      `gorm:"foreignKey:LikedID" json:"liked,omitempty"`
}

type Pass struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	PassedID  uint      `gorm:"not null;index" json:"passed_id"`
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

type OTP struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	Phone     string    `gorm:"size:20;not null;index" json:"-"`
	Code      string    `gorm:"size:6;not null" json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
}

// LocationShare represents a live location sharing session between two users.
type LocationShare struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	SenderID   uint      `gorm:"not null;index" json:"sender_id"`
	ReceiverID uint      `gorm:"not null;index" json:"receiver_id"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	ExpiresAt  time.Time `json:"expires_at"`
	Sender     User      `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver   User      `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
}

// VTCRide represents a VTC ride request between users or to a destination.
type VTCRide struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	RequesterID    uint      `gorm:"not null;index" json:"requester_id"`
	PassengerID    uint      `gorm:"not null;index" json:"passenger_id"`
	DriverID       *uint     `gorm:"index" json:"driver_id"`
	PickupLat      float64   `json:"pickup_lat"`
	PickupLng      float64   `json:"pickup_lng"`
	PickupAddress  string    `gorm:"size:500" json:"pickup_address"`
	DropoffLat     float64   `json:"dropoff_lat"`
	DropoffLng     float64   `json:"dropoff_lng"`
	DropoffAddress string    `gorm:"size:500" json:"dropoff_address"`
	Status         string    `gorm:"size:20;default:pending" json:"status"` // pending, accepted, in_progress, completed, cancelled
	DriverLat      float64   `json:"driver_lat"`
	DriverLng      float64   `json:"driver_lng"`
	EstimatedPrice float64   `json:"estimated_price"`
	Note           string    `gorm:"size:500" json:"note"`
	Requester      User      `gorm:"foreignKey:RequesterID" json:"requester,omitempty"`
	Passenger      User      `gorm:"foreignKey:PassengerID" json:"passenger,omitempty"`
	Driver         *User     `gorm:"foreignKey:DriverID" json:"driver,omitempty"`
}

// PasswordReset holds a one-time token to reset a user's password.
type PasswordReset struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Token     string    `gorm:"size:255;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
}

// Subscription tracks a user's premium plan.
type Subscription struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Plan      string    `gorm:"size:20;not null" json:"plan"` // monthly, yearly
	Amount    float64   `json:"amount"`
	StartedAt time.Time `json:"started_at"`
	EndsAt    time.Time `json:"ends_at"`
	Status    string    `gorm:"size:20;default:active" json:"status"` // active, expired, cancelled
	TxID      string    `gorm:"size:255" json:"tx_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// Prompt is a profile prompt answer (e.g. "Mon péché mignon: ...")
type Prompt struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Question  string    `gorm:"size:200;not null" json:"question"`
	Answer    string    `gorm:"size:500;not null" json:"answer"`
}

// Event represents a social event linked to a place.
type Event struct {
	ID           uint            `gorm:"primaryKey" json:"id"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	DeletedAt    gorm.DeletedAt  `gorm:"index" json:"-"`
	OrganizerID  uint            `gorm:"not null;index" json:"organizer_id"`
	PlaceID      *uint           `gorm:"index" json:"place_id,omitempty"`
	Title        string          `gorm:"size:200;not null" json:"title"`
	Description  string          `gorm:"size:2000" json:"description"`
	ImageURL     string          `gorm:"size:500" json:"image_url"`
	City         string          `gorm:"size:100" json:"city"`
	Address      string          `gorm:"size:300" json:"address"`
	Latitude     float64         `json:"latitude"`
	Longitude    float64         `json:"longitude"`
	StartsAt     time.Time       `json:"starts_at"`
	EndsAt       *time.Time      `json:"ends_at,omitempty"`
	MaxAttendees int             `gorm:"default:0" json:"max_attendees"` // 0 = unlimited
	Price        float64         `gorm:"default:0" json:"price"`         // 0 = gratuit
	Category     string          `gorm:"size:50" json:"category"`        // soiree, rencontre, atelier, sport
	IsPublished  bool            `gorm:"default:true" json:"is_published"`
	Organizer    User            `gorm:"foreignKey:OrganizerID" json:"organizer,omitempty"`
	Place        *Place          `gorm:"foreignKey:PlaceID" json:"place,omitempty"`
	Attendees    []EventAttendee `gorm:"foreignKey:EventID" json:"attendees,omitempty"`
}

// EventAttendee tracks who is attending an event.
type EventAttendee struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	EventID   uint      `gorm:"not null;index:idx_event_user" json:"event_id"`
	UserID    uint      `gorm:"not null;index:idx_event_user" json:"user_id"`
	Status    string    `gorm:"size:20;default:going" json:"status"` // going, interested, cancelled
	Event     Event     `gorm:"foreignKey:EventID" json:"event,omitempty"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

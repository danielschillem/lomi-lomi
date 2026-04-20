package handlers

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/middleware"
	"github.com/lomilomi/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	Config *config.Config
}

type RegisterRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{Config: cfg}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	if req.Username == "" || req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Tous les champs sont requis",
		})
	}

	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Le mot de passe doit contenir au moins 8 caractères",
		})
	}

	if _, err := mail.ParseAddress(req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Adresse email invalide",
		})
	}

	// Check if user already exists
	var existing models.User
	if err := database.DB.Where("email = ? OR username = ?", req.Email, req.Username).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Un compte avec cet email ou pseudo existe déjà",
		})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Erreur interne",
		})
	}

	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible de créer le compte",
		})
	}

	// Create default preferences
	prefs := models.UserPreference{
		UserID:      user.ID,
		MinAge:      18,
		MaxAge:      99,
		MaxDistance: 50,
	}
	database.DB.Create(&prefs)

	token, err := middleware.GenerateToken(h.Config, user.ID, user.Username, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible de générer le token",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":          user.ID,
			"username":    user.Username,
			"avatar_url":  user.AvatarURL,
			"is_verified": user.IsVerified,
			"role":        user.Role,
		},
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Données invalides",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email et mot de passe requis",
		})
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Email ou mot de passe incorrect",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Email ou mot de passe incorrect",
		})
	}

	token, err := middleware.GenerateToken(h.Config, user.ID, user.Username, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Impossible de générer le token",
		})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":          user.ID,
			"username":    user.Username,
			"avatar_url":  user.AvatarURL,
			"is_verified": user.IsVerified,
			"role":        user.Role,
		},
	})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Utilisateur non trouvé",
		})
	}

	return c.JSON(user)
}

// ChangePassword changes the authenticated user's password.
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Les deux champs sont requis"})
	}
	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Le nouveau mot de passe doit contenir au moins 8 caractères"})
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Mot de passe actuel incorrect"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur interne"})
	}

	database.DB.Model(&user).Update("password", string(hashed))
	return c.JSON(fiber.Map{"message": "Mot de passe modifié avec succès"})
}

// DeleteAccount soft-deletes the authenticated user's account.
func (h *AuthHandler) DeleteAccount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type Req struct {
		Password string `json:"password"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Mot de passe requis pour confirmer"})
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Mot de passe incorrect"})
	}

	// Soft delete (GORM DeletedAt)
	database.DB.Delete(&user)
	return c.JSON(fiber.Map{"message": "Compte supprimé avec succès"})
}

// --- OTP Authentication ---

var phoneRegex = regexp.MustCompile(`^\+[1-9]\d{6,14}$`)

func generateOTP() string {
	code := ""
	for i := 0; i < 6; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		code += fmt.Sprintf("%d", n.Int64())
	}
	return code
}

func sendSMS(cfg *config.Config, phone, message string) error {
	if cfg.TwilioSID == "" || cfg.TwilioToken == "" {
		// Dev mode: log OTP to console
		log.Printf("📱 SMS to %s: %s", phone, message)
		return nil
	}

	// Twilio REST API
	twilioURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", cfg.TwilioSID)

	data := url.Values{}
	data.Set("To", phone)
	data.Set("From", cfg.TwilioPhone)
	data.Set("Body", message)

	client := fiber.AcquireClient()
	defer fiber.ReleaseClient(client)

	agent := client.Post(twilioURL)
	agent.Set("Content-Type", "application/x-www-form-urlencoded")
	agent.BasicAuth(cfg.TwilioSID, cfg.TwilioToken)
	agent.Body([]byte(data.Encode()))

	code, _, errs := agent.String()
	if len(errs) > 0 {
		return errs[0]
	}
	if code >= 400 {
		return fmt.Errorf("twilio error: status %d", code)
	}
	return nil
}

// SendOTP sends a 6-digit code to the given phone number.
func (h *AuthHandler) SendOTP(c *fiber.Ctx) error {
	type Req struct {
		Phone string `json:"phone"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	phone := strings.TrimSpace(req.Phone)
	if !phoneRegex.MatchString(phone) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Numéro de téléphone invalide (format: +33612345678)"})
	}

	// Rate limit: max 1 OTP per phone per 60 seconds
	var recentCount int64
	database.DB.Model(&models.OTP{}).
		Where("phone = ? AND created_at > ? AND used = ?", phone, time.Now().Add(-60*time.Second), false).
		Count(&recentCount)
	if recentCount > 0 {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Veuillez attendre 60 secondes avant de renvoyer un code"})
	}

	code := generateOTP()

	otp := models.OTP{
		Phone:     phone,
		Code:      code,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	database.DB.Create(&otp)

	msg := fmt.Sprintf("Votre code Lomi Lomi : %s (expire dans 5 min)", code)
	if err := sendSMS(h.Config, phone, msg); err != nil {
		log.Printf("SMS send error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible d'envoyer le SMS"})
	}

	resp := fiber.Map{"message": "Code envoyé", "phone": phone}
	// Dev mode: include OTP in response for testing
	if h.Config.TwilioSID == "" {
		resp["dev_code"] = code
	}
	return c.JSON(resp)
}

// VerifyOTP verifies the code and logs in or returns a registration token.
func (h *AuthHandler) VerifyOTP(c *fiber.Ctx) error {
	type Req struct {
		Phone string `json:"phone"`
		Code  string `json:"code"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	phone := strings.TrimSpace(req.Phone)
	code := strings.TrimSpace(req.Code)
	if phone == "" || code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Téléphone et code requis"})
	}

	var otp models.OTP
	err := database.DB.
		Where("phone = ? AND code = ? AND used = ? AND expires_at > ?", phone, code, false, time.Now()).
		Order("created_at DESC").
		First(&otp).Error
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Code invalide ou expiré"})
	}

	// Mark OTP as used
	database.DB.Model(&otp).Update("used", true)

	// Check if user with this phone exists
	var user models.User
	if err := database.DB.Where("phone = ?", phone).First(&user).Error; err == nil {
		// Existing user → login
		token, err := middleware.GenerateToken(h.Config, user.ID, user.Username, user.Role)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur interne"})
		}
		return c.JSON(fiber.Map{
			"action": "login",
			"token":  token,
			"user": fiber.Map{
				"id":          user.ID,
				"username":    user.Username,
				"avatar_url":  user.AvatarURL,
				"is_verified": user.IsVerified,
				"role":        user.Role,
			},
		})
	}

	// New user → needs to complete registration (choose username)
	return c.JSON(fiber.Map{
		"action":         "register",
		"phone_verified": phone,
	})
}

// RegisterPhone creates a new account after phone verification.
func (h *AuthHandler) RegisterPhone(c *fiber.Ctx) error {
	type Req struct {
		Username string `json:"username"`
		Phone    string `json:"phone"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	username := strings.TrimSpace(req.Username)
	phone := strings.TrimSpace(req.Phone)

	if username == "" || phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pseudo et téléphone requis"})
	}
	if len(username) < 3 || len(username) > 50 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Le pseudo doit contenir entre 3 et 50 caractères"})
	}

	// Verify that this phone was recently verified (OTP used within 10 min)
	var otpCount int64
	database.DB.Model(&models.OTP{}).
		Where("phone = ? AND used = ? AND created_at > ?", phone, true, time.Now().Add(-10*time.Minute)).
		Count(&otpCount)
	if otpCount == 0 {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Numéro non vérifié. Envoyez d'abord un code OTP."})
	}

	// Check uniqueness
	var existing models.User
	if err := database.DB.Where("phone = ? OR username = ?", phone, username).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Ce pseudo ou numéro est déjà utilisé"})
	}

	user := models.User{
		Username:   username,
		Phone:      phone,
		IsVerified: true, // Phone-verified users are auto-verified
	}
	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Impossible de créer le compte"})
	}

	// Create default preferences
	prefs := models.UserPreference{UserID: user.ID, MinAge: 18, MaxAge: 99, MaxDistance: 50}
	database.DB.Create(&prefs)

	token, err := middleware.GenerateToken(h.Config, user.ID, user.Username, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur interne"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":          user.ID,
			"username":    user.Username,
			"avatar_url":  user.AvatarURL,
			"is_verified": user.IsVerified,
			"role":        user.Role,
		},
	})
}

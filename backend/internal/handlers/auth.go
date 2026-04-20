package handlers

import (
	"net/mail"

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

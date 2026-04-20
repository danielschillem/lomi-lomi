package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/smtp"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type UploadHandler struct {
	Config *config.Config
}

func NewUploadHandler(cfg *config.Config) *UploadHandler {
	// Ensure upload directory exists
	os.MkdirAll(cfg.UploadDir, 0755)
	return &UploadHandler{Config: cfg}
}

func (h *UploadHandler) UploadAvatar(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	file, err := c.FormFile("avatar")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fichier avatar requis"})
	}

	// Validate size (max 5MB)
	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fichier trop volumineux (max 5 Mo)"})
	}

	// Validate extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format non supporté (jpg, png, webp)"})
	}

	// Generate unique filename
	b := make([]byte, 16)
	rand.Read(b)
	filename := fmt.Sprintf("avatar_%d_%s%s", userID, hex.EncodeToString(b), ext)
	savePath := filepath.Join(h.Config.UploadDir, filename)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lors de l'upload"})
	}

	avatarURL := h.Config.BaseURL + "/uploads/" + filename
	database.DB.Model(&models.User{}).Where("id = ?", userID).Update("avatar_url", avatarURL)

	return c.JSON(fiber.Map{
		"avatar_url": avatarURL,
		"message":    "Avatar mis à jour",
	})
}

// ---- Email verification ----

func (h *UploadHandler) SendVerification(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if user.IsVerified {
		return c.JSON(fiber.Map{"message": "Email déjà vérifié"})
	}

	// Generate token
	b := make([]byte, 32)
	rand.Read(b)
	token := hex.EncodeToString(b)

	verification := models.EmailVerification{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	database.DB.Create(&verification)

	// Send email
	verifyURL := h.Config.BaseURL + "/api/v1/auth/verify-email?token=" + token
	body := fmt.Sprintf(
		"Bonjour %s,\n\nCliquez sur le lien pour vérifier votre email:\n%s\n\nCe lien expire dans 24h.\n\nLomi Lomi",
		user.Username, verifyURL,
	)

	if h.Config.SMTPHost != "" {
		go sendEmail(h.Config, user.Email, "Vérification email — Lomi Lomi", body)
	}

	return c.JSON(fiber.Map{"message": "Email de vérification envoyé"})
}

func (h *UploadHandler) VerifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token requis"})
	}

	var verification models.EmailVerification
	if err := database.DB.Where("token = ? AND used = ? AND expires_at > ?", token, false, time.Now()).First(&verification).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token invalide ou expiré"})
	}

	database.DB.Model(&verification).Update("used", true)
	database.DB.Model(&models.User{}).Where("id = ?", verification.UserID).Update("is_verified", true)

	// Redirect to frontend success page
	return c.Redirect(h.Config.CORSOrigin + "/profil?verified=true")
}

func sendEmail(cfg *config.Config, to, subject, body string) {
	auth := smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPHost)
	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s",
		cfg.SMTPFrom, to, subject, body,
	)
	addr := cfg.SMTPHost + ":" + cfg.SMTPPort
	smtp.SendMail(addr, auth, cfg.SMTPFrom, []string{to}, []byte(msg))
}

// ---- Photo gallery ----

func (h *UploadHandler) UploadPhoto(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	// Max 6 photos per user
	var count int64
	database.DB.Model(&models.Photo{}).Where("user_id = ?", userID).Count(&count)
	if count >= 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Maximum 6 photos autorisées"})
	}

	file, err := c.FormFile("photo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fichier photo requis"})
	}

	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fichier trop volumineux (max 5 Mo)"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format non supporté (jpg, png, webp)"})
	}

	b := make([]byte, 16)
	rand.Read(b)
	filename := fmt.Sprintf("photo_%d_%s%s", userID, hex.EncodeToString(b), ext)
	savePath := filepath.Join(h.Config.UploadDir, filename)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur lors de l'upload"})
	}

	photo := models.Photo{
		UserID:   userID,
		URL:      h.Config.BaseURL + "/uploads/" + filename,
		Position: int(count),
	}
	database.DB.Create(&photo)

	return c.Status(fiber.StatusCreated).JSON(photo)
}

func (h *UploadHandler) GetPhotos(c *fiber.Ctx) error {
	uid, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var photos []models.Photo
	database.DB.Where("user_id = ?", uid).Order("position ASC").Find(&photos)

	return c.JSON(photos)
}

func (h *UploadHandler) DeletePhoto(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	photoID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var photo models.Photo
	if err := database.DB.First(&photo, photoID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Photo non trouvée"})
	}

	if photo.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Non autorisé"})
	}

	// Delete file from disk
	filename := filepath.Base(photo.URL)
	os.Remove(filepath.Join(h.Config.UploadDir, filename))

	database.DB.Delete(&photo)

	return c.JSON(fiber.Map{"message": "Photo supprimée"})
}

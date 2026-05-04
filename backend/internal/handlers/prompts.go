package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/config"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type ProfileExtHandler struct {
	Config *config.Config
}

func NewProfileExtHandler(cfg *config.Config) *ProfileExtHandler {
	return &ProfileExtHandler{Config: cfg}
}

// GetPrompts returns the profile prompts of a user.
func (h *ProfileExtHandler) GetPrompts(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	prompts := make([]models.Prompt, 0)
	database.DB.Where("user_id = ?", userID).Find(&prompts)
	return c.JSON(prompts)
}

// SavePrompts upserts profile prompts (max 3).
func (h *ProfileExtHandler) SavePrompts(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	type PromptInput struct {
		Question string `json:"question"`
		Answer   string `json:"answer"`
	}
	var inputs []PromptInput
	if err := c.BodyParser(&inputs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}
	if len(inputs) > 3 {
		inputs = inputs[:3]
	}

	// Replace all prompts for this user
	database.DB.Where("user_id = ?", userID).Delete(&models.Prompt{})
	for _, p := range inputs {
		if p.Question == "" || p.Answer == "" {
			continue
		}
		database.DB.Create(&models.Prompt{UserID: userID, Question: p.Question, Answer: p.Answer})
	}

	prompts := make([]models.Prompt, 0)
	database.DB.Where("user_id = ?", userID).Find(&prompts)
	return c.JSON(prompts)
}

// CompleteOnboarding marks the user's onboarding as done.
func (h *ProfileExtHandler) CompleteOnboarding(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	database.DB.Model(&models.User{}).Where("id = ?", userID).Update("onboarding_done", true)
	return c.JSON(fiber.Map{"message": "Onboarding terminé"})
}

// UploadSelfie uploads a selfie for identity verification.
func (h *ProfileExtHandler) UploadSelfie(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	file, err := c.FormFile("selfie")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fichier selfie requis"})
	}

	if file.Size > 5*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fichier trop volumineux (max 5 Mo)"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format non supporté"})
	}

	b := make([]byte, 16)
	rand.Read(b)
	filename := fmt.Sprintf("selfie_%d_%s%s", userID, hex.EncodeToString(b), ext)
	savePath := filepath.Join(h.Config.UploadDir, filename)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erreur upload"})
	}

	selfieURL := h.Config.BaseURL + "/uploads/" + filename
	database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"selfie_url":    selfieURL,
		"selfie_status": "pending",
	})

	return c.JSON(fiber.Map{
		"selfie_url":    selfieURL,
		"selfie_status": "pending",
		"message":       "Selfie soumis pour vérification",
	})
}

// AdminListSelfies returns users with pending selfie verification.
func (h *ProfileExtHandler) AdminListSelfies(c *fiber.Ctx) error {
	users := make([]models.User, 0)
	database.DB.Where("selfie_status = 'pending'").
		Select("id, username, avatar_url, selfie_url, selfie_status, created_at").
		Find(&users)
	return c.JSON(users)
}

// AdminReviewSelfie approves or rejects a selfie.
func (h *ProfileExtHandler) AdminReviewSelfie(c *fiber.Ctx) error {
	type Req struct {
		UserID uint   `json:"user_id"`
		Action string `json:"action"` // approve, reject
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id et action requis"})
	}

	status := "rejected"
	isVerified := false
	if req.Action == "approve" {
		status = "approved"
		isVerified = true
	}

	database.DB.Model(&models.User{}).Where("id = ?", req.UserID).Updates(map[string]interface{}{
		"selfie_status": status,
		"is_verified":   isVerified,
	})

	return c.JSON(fiber.Map{"message": "Selfie " + status})
}

package handlers

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type SafetyHandler struct{}

func NewSafetyHandler() *SafetyHandler {
	return &SafetyHandler{}
}

// ---- Reports ----

func (h *SafetyHandler) CreateReport(c *fiber.Ctx) error {
	reporterID := c.Locals("userID").(uint)

	type Req struct {
		ReportedID uint   `json:"reported_id"`
		Reason     string `json:"reason"`
		Details    string `json:"details"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.ReportedID == 0 || req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "reported_id et reason requis"})
	}

	if reporterID == req.ReportedID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Impossible de se signaler soi-même"})
	}

	// Verify reported user exists
	var reported models.User
	if database.DB.First(&reported, req.ReportedID).Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur signalé introuvable"})
	}

	allowed := map[string]bool{
		"spam": true, "harassment": true, "fake": true,
		"inappropriate": true, "scam": true, "other": true,
	}
	if !allowed[req.Reason] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Raison invalide (spam, harassment, fake, inappropriate, scam, other)",
		})
	}

	// Check if already reported recently
	var existing models.Report
	if database.DB.Where("reporter_id = ? AND reported_id = ? AND status = ?", reporterID, req.ReportedID, "pending").First(&existing).Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Signalement déjà en cours"})
	}

	report := models.Report{
		ReporterID: reporterID,
		ReportedID: req.ReportedID,
		Reason:     req.Reason,
		Details:    req.Details,
	}
	database.DB.Create(&report)

	// Auto-flag: if user has 3+ pending reports, log a warning
	var pendingCount int64
	database.DB.Model(&models.Report{}).Where("reported_id = ? AND status = ?", req.ReportedID, "pending").Count(&pendingCount)
	if pendingCount >= 3 {
		log.Printf("AUTO-FLAG: user %d (%s) has %d pending reports", req.ReportedID, reported.Username, pendingCount)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Signalement enregistré", "id": report.ID})
}

// ---- Blocks ----

func (h *SafetyHandler) BlockUser(c *fiber.Ctx) error {
	blockerID := c.Locals("userID").(uint)

	type Req struct {
		BlockedID uint `json:"blocked_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.BlockedID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "blocked_id requis"})
	}

	if blockerID == req.BlockedID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Impossible de se bloquer soi-même"})
	}

	// Verify blocked user exists
	if database.DB.First(&models.User{}, req.BlockedID).Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur introuvable"})
	}

	// Check if already blocked
	var existing models.Block
	if database.DB.Where("blocker_id = ? AND blocked_id = ?", blockerID, req.BlockedID).First(&existing).Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Utilisateur déjà bloqué"})
	}

	block := models.Block{BlockerID: blockerID, BlockedID: req.BlockedID}
	database.DB.Create(&block)

	// Also remove any existing match between the two users
	database.DB.Where(
		"(user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
		blockerID, req.BlockedID, req.BlockedID, blockerID,
	).Delete(&models.Match{})

	// Remove likes in both directions
	database.DB.Where(
		"(liker_id = ? AND liked_id = ?) OR (liker_id = ? AND liked_id = ?)",
		blockerID, req.BlockedID, req.BlockedID, blockerID,
	).Delete(&models.Like{})

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Utilisateur bloqué"})
}

func (h *SafetyHandler) UnblockUser(c *fiber.Ctx) error {
	blockerID := c.Locals("userID").(uint)
	blockedID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	result := database.DB.Where("blocker_id = ? AND blocked_id = ?", blockerID, uint(blockedID)).Delete(&models.Block{})
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Blocage non trouvé"})
	}

	return c.JSON(fiber.Map{"message": "Utilisateur débloqué"})
}

func (h *SafetyHandler) GetBlockedUsers(c *fiber.Ctx) error {
	blockerID := c.Locals("userID").(uint)

	var blocks []models.Block
	database.DB.Preload("Blocked").Where("blocker_id = ?", blockerID).Find(&blocks)

	return c.JSON(blocks)
}

// ---- Admin: Reports ----

func (h *SafetyHandler) AdminListReports(c *fiber.Ctx) error {
	status := c.Query("status", "pending")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	query := database.DB.Model(&models.Report{})
	if status != "all" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var reports []models.Report
	query.Preload("Reporter").Preload("Reported").
		Offset(offset).Limit(limit).
		Order("created_at DESC").
		Find(&reports)

	return c.JSON(fiber.Map{"reports": reports, "total": total, "page": page})
}

func (h *SafetyHandler) AdminUpdateReport(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status requis (reviewed, dismissed)"})
	}

	if req.Status != "reviewed" && req.Status != "dismissed" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Statut invalide"})
	}

	var report models.Report
	if database.DB.First(&report, uint(id)).Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Signalement non trouvé"})
	}

	database.DB.Model(&report).Update("status", req.Status)

	return c.JSON(fiber.Map{"message": "Signalement mis à jour"})
}

// AdminBanUser bans or unbans a user account.
func (h *SafetyHandler) AdminBanUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	type Req struct {
		Banned bool   `json:"banned"`
		Reason string `json:"reason"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Données invalides"})
	}

	var user models.User
	if database.DB.First(&user, uint(id)).Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Utilisateur non trouvé"})
	}

	if user.Role == "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Impossible de bannir un administrateur"})
	}

	updates := map[string]interface{}{
		"is_banned":  req.Banned,
		"ban_reason": "",
	}
	if req.Banned {
		updates["ban_reason"] = req.Reason
	}
	database.DB.Model(&user).Updates(updates)

	action := "débanni"
	if req.Banned {
		action = "banni"
		log.Printf("ADMIN-BAN: user %d (%s) banned, reason: %s", user.ID, user.Username, req.Reason)
	}

	return c.JSON(fiber.Map{"message": "Utilisateur " + action})
}

// AdminGetReportCount returns the number of pending reports for a specific user.
func (h *SafetyHandler) AdminGetReportCount(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID invalide"})
	}

	var total int64
	database.DB.Model(&models.Report{}).Where("reported_id = ? AND status = ?", uint(id), "pending").Count(&total)

	return c.JSON(fiber.Map{"user_id": uint(id), "pending_reports": total})
}

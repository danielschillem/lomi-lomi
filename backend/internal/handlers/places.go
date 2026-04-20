package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/lomilomi/backend/internal/database"
	"github.com/lomilomi/backend/internal/models"
)

type PlaceHandler struct{}

func NewPlaceHandler() *PlaceHandler {
	return &PlaceHandler{}
}

func (h *PlaceHandler) GetPlaces(c *fiber.Ctx) error {
	category := c.Query("category")
	city := c.Query("city")

	query := database.DB.Model(&models.Place{})

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if city != "" {
		query = query.Where("city LIKE ?", "%"+city+"%")
	}

	var places []models.Place
	query.Order("rating DESC").Find(&places)

	return c.JSON(places)
}

func (h *PlaceHandler) GetPlace(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID invalide",
		})
	}

	var place models.Place
	if err := database.DB.First(&place, uint(id)).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Lieu non trouvé",
		})
	}

	return c.JSON(place)
}

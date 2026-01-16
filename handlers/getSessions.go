package handlers

import (
	"fmt"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func GetSessionsHandler(c *fiber.Ctx) error {
	user := c.Locals("user")
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "user not authenticated",
		})
	}

	claims, ok := user.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid token claims",
		})
	}

	student_id, ok := claims["student_id"]

	var confirmedTTs []models.StudentTimetable

	result := db.DB.
		Where("student_id_id = ? AND status = ?", student_id, "confirmed").
		Find(&confirmedTTs)

	if result.Error != nil {
		fmt.Println("DB error:", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": confirmedTTs,
	})
}

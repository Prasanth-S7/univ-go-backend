package handlers

import (
	"github.com/gofiber/fiber/v3"
)

func LoginHandler(c fiber.Ctx) error {
	return c.SendString("Login Handler was called")
}

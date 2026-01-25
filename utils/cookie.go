package utils

import (
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

func DeleteCookie(c *fiber.Ctx) {
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	isSecure := false
	sameSite := "Lax"
	if os.Getenv("GO_ENV") == "production" {
		isSecure = true
		sameSite = "None"
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
		Secure:   isSecure,
		Domain:   cookieDomain,
		SameSite: sameSite,
	})
}

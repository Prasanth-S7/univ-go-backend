package utils

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
)

func DeleteCookie(c fiber.Ctx) {
	fmt.Println(os.Getenv("COOKIE_DOMAIN"))
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		SameSite: "Lax",
		HTTPOnly: true,
		Secure:   true,
		Domain:   "localhost",
		Expires:  time.Now().Add(-time.Hour * 24 * 30),
	})
}

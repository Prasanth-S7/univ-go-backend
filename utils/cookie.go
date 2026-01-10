package utils

import (
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
)

// c.Cookie(&fiber.Cookie{
// 		Name:     "token",
// 		Value:    jwtToken,
// 		SameSite: "Lax",
// 		HTTPOnly: true,
// 		Secure:   true,
// 		Domain:   cookieDomain,
// 		Expires:  time.Now().Add(time.Hour * 24 * 30),
// 	})

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

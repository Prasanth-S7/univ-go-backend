package main

import (
	"log"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/handlers"
	"github.com/Prasanth-S7/univ-go-backend/middlewares"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
)

func main() {

	db.Connect()

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowCredentials: true,
	}))

	app.Get("/", func(c fiber.Ctx) error {
		log.Println("Health check successful")
		return c.SendString("Health check successful")
	})

	app.Post("/api/auth/login/", handlers.LoginHandler)

	app.Use(middlewares.JWTMiddleware())

	app.Options("/*", func(c fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	app.Get("/api/auth/profile/", handlers.ProfileHandler)
	app.Get("/api/auth/allowed-login-status/", handlers.AllowedLoginStatusHandler)
	app.Get("/api/student-courses/courses/available_courses/", handlers.AvailableCoursesHandler)

	log.Fatal(app.Listen(":3000"))
}

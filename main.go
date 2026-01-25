package main

import (
	"log"
	"os"
	"strings"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/handlers"
	"github.com/Prasanth-S7/univ-go-backend/middlewares"
	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {

	db.Connect()
	// db.InitRedis()
	// workers.StartWorker()

	app := fiber.New()

	// CORS Configuration - USE ONLY ONE
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			// Allow localhost for development
			if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
				return true
			}
			// Allow your production domains
			// if strings.HasSuffix(origin, ".rajalakshmi.org") || origin == "https://students.rajalakshmi.org" {
			// 	return true
			// }
			return false
		},
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-CSRF-Token",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowCredentials: true,
		ExposeHeaders:    "Set-Cookie",
	}))

	prom := fiberprometheus.New("univ-go-backend")
	prom.RegisterAt(app, "/metrics")
	app.Use(prom.Middleware)

	// logger config
	file, err := os.OpenFile("logs.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer file.Close()
	app.Use(logger.New(logger.Config{
		Output: file,
	}))

	app.Get("/", func(c *fiber.Ctx) error {
		log.Println("Health check successful")
		return c.SendString("Health check successful")
	})

	// Handle OPTIONS requests for CORS preflight
	app.Options("/*", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	// Public routes (no JWT required)
	app.Post("/api/auth/login/", handlers.LoginHandler)
	app.Post("/api/auth/logout/", handlers.LogoutHandler)

	// Apply JWT middleware for protected routes
	protected := app.Group("/api")
	protected.Use(middlewares.JWTMiddleware())

	// Protected routes
	protected.Get("/auth/profile/", handlers.ProfileHandler)
	protected.Get("/auth/allowed-login-status/", handlers.AllowedLoginStatusHandler)
	protected.Get("/student-courses/courses/available_courses/", handlers.AvailableCoursesHandler)
	protected.Get("/student-courses/courses/available_teachers/", handlers.AvailableTeachersHandler)
	protected.Get("/timetable/student/status/", handlers.GetStatusHandler)
	protected.Get("/timetable/student/sessions/", handlers.GetSessionsHandler)
	protected.Get("/timetable/sessions/:teacher_course_id/", handlers.AvailableSessionsHandler)
	protected.Get("/timetable/status/", handlers.StatusHandler)
	protected.Post("/timetable/student/add/bulk/", handlers.AddBulkHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000" // fallback for local dev
	}

	log.Printf("Starting server on port %s", port)
	log.Fatal(app.Listen("0.0.0.0:" + port))
}

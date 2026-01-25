package main

import (
	"log"
	"os"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/handlers"
	"github.com/Prasanth-S7/univ-go-backend/middlewares"
	"github.com/Prasanth-S7/univ-go-backend/workers"
	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {

	db.Connect()
	db.InitRedis()
	workers.StartWorker()

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,http://localhost:3000",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
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

	app.Post("/api/auth/login/", handlers.LoginHandler)
	app.Post("/api/auth/logout/", handlers.LogoutHandler)

	app.Use(middlewares.JWTMiddleware())

	app.Options("/*", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})
	app.Get("/api/auth/profile/", handlers.ProfileHandler)
	app.Get("/api/auth/allowed-login-status/", handlers.AllowedLoginStatusHandler)
	app.Get("/api/student-courses/courses/available_courses/", handlers.AvailableCoursesHandler)
	app.Get("/api/student-courses/courses/available_teachers/", handlers.AvailableTeachersHandler)
	app.Get("/api/timetable/student/status/", handlers.GetStatusHandler)
	app.Get("/api/timetable/student/sessions/", handlers.GetSessionsHandler)
	app.Get("/api/timetable/sessions/:teacher_course_id/", handlers.AvailableSessionsHandler)
	app.Post("/api/timetable/student/add/bulk/", handlers.AddBulkHandler)

	log.Fatal(app.Listen("0.0.0.0:3000"))
}

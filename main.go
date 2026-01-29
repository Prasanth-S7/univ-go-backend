package main

import (
	"log"
	"os"
	"strings"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/handlers"
	"github.com/Prasanth-S7/univ-go-backend/middlewares"
	"github.com/Prasanth-S7/univ-go-backend/utils"
	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {

	cfg, err := utils.LoadFromEnv()

	if err != nil {
		log.Fatalf("failed to load configuration: %v", err)
	}

	h := handlers.NewHandler(cfg)

	// db.Connect(cfg)
	// db.InitRedis()
	// workers.StartWorker()

	app := fiber.New()

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
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,x-csrftoken,X-CSRF-Token",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowCredentials: true,
		ExposeHeaders:    "Set-Cookie,Authorization",
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

	app.Options("/*", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	app.Get("/db-stats", func(c *fiber.Ctx) error {
		stats := db.GetDBStats()
		return c.JSON(stats)
	})

	app.Post("go/api/auth/login/", h.LoginHandler)
	app.Post("go/api/auth/logout/", h.LogoutHandler)

	protected := app.Group("go/api")
	protected.Use(middlewares.JWTMiddleware())

	protected.Get("/auth/profile/", h.ProfileHandler)
	protected.Get("/auth/allowed-login-status/", h.AllowedLoginStatusHandler)
	protected.Get("/student-courses/courses/available_courses/", h.AvailableCoursesHandler)
	protected.Get("/student-courses/courses/available_teachers/", h.AvailableTeachersHandler)
	protected.Get("/timetable/student/status/", h.GetStatusHandler)
	protected.Get("/timetable/student/sessions/", h.GetSessionsHandler)
	protected.Get("/timetable/sessions/:teacher_course_id/", h.AvailableSessionsHandler)
	protected.Get("/timetable/status/", h.StatusHandler)
	protected.Post("/timetable/student/add/bulk/", h.AddBulkHandler)

	log.Printf("Starting server on port %s", cfg.Port)
	log.Fatal(app.Listen("0.0.0.0:" + cfg.Port))
}

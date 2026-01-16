package handlers

import (
	"fmt"
	"time"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type BulkSelection struct {
	TeacherCourseID int64  `json:"teacher_course_id"`
	Batch           string `json:"batch"`
	IsDoMoreCourse  bool   `json:"is_do_more_course"`
}

type BulkAddRequest struct {
	Selections []BulkSelection `json:"selections"`
}

func AddBulkHandler(c *fiber.Ctx) error {
	user := c.Locals("user").(jwt.MapClaims)
	studentID, ok := user["student_id"]
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user token"})
	}

	fmt.Println("student_id: ", studentID)

	var req BulkAddRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, selection := range req.Selections {
		if selection.IsDoMoreCourse {
			// Skip DoMore courses for now as logic might differ
			continue
		}

		// 1. fetching the tt master for the teacher_course_id (this will return atmost 4 rows (theory, batch-1, batch-2, no-batch))
		var masters []models.TimetableMaster
		targetBatch := selection.Batch
		if targetBatch == "theory" {
			targetBatch = ""
		}
		if err := tx.Where(`teacher_course_id = ? AND batch = ?`, selection.TeacherCourseID, targetBatch).Find(&masters).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch course details"})
		}

		if len(masters) == 0 {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Course %d not found", selection.TeacherCourseID)})
		}

		// 2. Count existing confirmed bookings
		var currentCount int64
		query := tx.Model(&models.StudentTimetable{}).
			Where("teacher_course_id_id = ? AND batch = ? AND status = 'confirmed'", selection.TeacherCourseID, selection.Batch)

		if err := query.Count(&currentCount).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to check slot availability"})
		}

		// 3. Check Availability
		if int(currentCount) >= masters[0].StudentCount {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("No slots available for course %d (Batch: %s)", selection.TeacherCourseID, selection.Batch)})
		}

		// 4. Create Booking
		// Check if already booked?
		var existCount int64
		tx.Model(&models.StudentTimetable{}).
			Where("student_id_id = ? AND teacher_course_id_id = ? AND status = ?", studentID, selection.TeacherCourseID, "confirmed").
			Count(&existCount)

		if existCount > 0 {
			// Already booked, skip or error?
			// Usually idempotent is better, or return error.
			// Let's return error to avoid double booking confusion.
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Already booked for course %d", selection.TeacherCourseID)})
		}

		// Insert
		booking := models.StudentTimetable{
			Status:            "confirmed",
			RejectionReason:   "",
			IsMailSent:        false,
			Batch:             selection.Batch, // Use the requested batch string (e.g. "no-batch" or "A") to preserve UI selection
			IsInternalBooking: false,
			StudentID:         studentID.(int64),
			TeacherCourseID:   selection.TeacherCourseID,
			UpdatedAt:         time.Now(),
		}

		if err := tx.Create(&booking).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create booking"})
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Transaction commit failed"})
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"detail": "Bulk add successful!",
	})
}

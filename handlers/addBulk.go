package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type BulkSelection struct {
	TeacherCourseID int64  `json:"teacher_course_id"`
	Batch           string `json:"batch"`
	IsDoMoreCourse  bool   `json:"is_do_more_course"`
}

type BulkAddRequest struct {
	Selections []BulkSelection `json:"selections"`
}

type EnqueueTask struct {
	StudentID  int64           `json:"student_id"`
	RequestID  string          `json:"request_id"`
	Selections []BulkSelection `json:"selections"`
}

func AddBulkHandler(c *fiber.Ctx) error {
	user := c.Locals("user").(jwt.MapClaims)
	studentID := int64(user["student_id"].(float64))
	userID := fmt.Sprintf("%d", studentID)

	var req BulkAddRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	ctx := context.Background()

	// Check if user has active request
	if exists, _ := db.RedisClient.HExists(ctx, "user_active_requests", userID).Result(); exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You already have a pending request",
		})
	}

	requestID := uuid.New().String()

	// 1. Set active request
	if err := db.RedisClient.HSet(ctx, "user_active_requests", userID, requestID).Err(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to lock request"})
	}

	// 2. Queue task
	task := EnqueueTask{
		StudentID:  studentID,
		RequestID:  requestID,
		Selections: req.Selections,
	}

	taskJSON, err := json.Marshal(task)
	if err != nil {
		db.RedisClient.HDel(ctx, "user_active_requests", userID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to serialize task"})
	}

	if err := db.RedisClient.LPush(ctx, "booking_queue", taskJSON).Err(); err != nil {
		db.RedisClient.HDel(ctx, "user_active_requests", userID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to enqueue task"})
	}

	// 3. Return response
	queuedEvent := fiber.Map{
		"event":           "queued",
		"request_id":      requestID,
		"queued_at":       time.Now().Format(time.RFC3339),
		"selection_count": len(req.Selections),
	}

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"status":         "queued_for_processing",
		"request_id":     requestID,
		"queued_event":   queuedEvent,
		"rejected_items": []string{}, // Placeholder as Go worker handles validation now
	})
}

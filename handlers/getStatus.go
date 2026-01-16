package handlers

import (
	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func GetStatusHandler(c *fiber.Ctx) error {
	student_id := c.Locals("user").(jwt.MapClaims)["student_id"]

	query := `
		SELECT 
			c.id,
			cm.course_id as course_code,
			cm.course_name,
			cm.credits
		FROM "studentCourse_studentcourse" sc
		JOIN "course_course" c ON sc.course_id_id = c.id
		JOIN "courseMaster_coursemaster" cm ON c.course_id_id = cm.id
		WHERE sc.student_id_id = ?
	`

	type CourseResult struct {
		ID         int64  `db:"id"`
		CourseCode string `db:"course_code"`
		CourseName string `db:"course_name"`
	}

	var results []CourseResult

	if err := db.DB.Raw(query, student_id).Scan(&results).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch student courses",
		})
	}

	enrichedResults := make([]fiber.Map, 0, len(results))

	for _, result := range results {

		enrichedResult := fiber.Map{
			"course_id":   result.ID,
			"course_code": result.CourseCode,
			"course_name": result.CourseName,
			"selected":    true,
			"is_do_more":  false,
		}
		enrichedResults = append(enrichedResults, enrichedResult)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"all_selected": true,
		"courses":      enrichedResults,
	})
}

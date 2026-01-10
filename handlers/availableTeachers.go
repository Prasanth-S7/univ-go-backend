package handlers

import (
	"fmt"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v3"
)

func AvailableTeachersHandler(c fiber.Ctx) error {
	course_id := c.Query("course_id")

	if course_id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Course ID is required",
		})
	}

	var course models.Course
	if err := db.DB.Where("id = ?", course_id).First(&course).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": fmt.Sprintf("Course not found with ID: %s", course_id),
		})
	}

	type TeacherResult struct {
		ID          int64  `db:"id"`
		TeacherID   int64  `db:"teacher_id"`
		StaffCode   string `db:"staff_code"`
		TeacherName string `db:"teacher_name"`
		Department  string `db:"department"`
	}

	var results []TeacherResult

	query := `
		SELECT
			tc.id,
			t.id as teacher_id,
			t.staff_code,
			u.first_name || ' ' || u.last_name as teacher_name,
			d.dept_name as department
		FROM "teacherCourse_teachercourse" tc
		JOIN "teacher_teacher" t ON tc.teacher_id_id = t.id
		JOIN "authentication_user" u ON t.teacher_id_id = u.uuid
		JOIN "department_department" d ON t.dept_id_id = d.id
		WHERE tc.course_id_id = ?
	`

	if err := db.DB.Raw(query, course_id).Scan(&results).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch teachers",
		})
	}

	teachers := make([]fiber.Map, 0, len(results))
	for _, result := range results {
		teacher := fiber.Map{
			"id":           result.ID,
			"teacher_id":   result.TeacherID,
			"teacher_name": result.TeacherName,
			"department":   result.Department,
			"staff_code":   result.StaffCode,
		}
		teachers = append(teachers, teacher)
	}

	return c.JSON(teachers)
}

package handlers

import (
	"fmt"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func GetStatusHandler(c *fiber.Ctx) error {
	student_id := c.Locals("user").(jwt.MapClaims)["student_id"]

	// fetch student booked courses from timetable along with course_id
	bookedCoursesQuery := `
		SELECT DISTINCT tc.course_id_id as course_id
		FROM "timetableMaster_studenttimetable" st
		JOIN "teacherCourse_teachercourse" tc ON st.teacher_course_id_id = tc.id
		WHERE st.student_id_id = ? AND st.status = 'confirmed'
	`

	type BookedCourse struct {
		CourseID int64 `db:"course_id"`
	}

	var bookedCourses []BookedCourse
	if err := db.DB.Raw(bookedCoursesQuery, student_id).Scan(&bookedCourses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error while fetching student Timetables",
		})
	}

	// create a map of booked course IDs
	bookedCourseMap := make(map[int64]bool)
	for _, bc := range bookedCourses {
		bookedCourseMap[bc.CourseID] = true
	}

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

	allSelected := true
	fmt.Println(bookedCourses)
	fmt.Println(results)
	if len(bookedCourses) < len(results) {
		allSelected = false
	}

	for _, result := range results {
		// Check if this course is in the booked courses map
		isSelected := bookedCourseMap[result.ID]
		if !isSelected {
			allSelected = false
		}

		enrichedResult := fiber.Map{
			"course_id":   result.ID,
			"course_code": result.CourseCode,
			"course_name": result.CourseName,
			"selected":    isSelected,
			"is_do_more":  false,
		}
		enrichedResults = append(enrichedResults, enrichedResult)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"all_selected": allSelected,
		"courses":      enrichedResults,
	})
}

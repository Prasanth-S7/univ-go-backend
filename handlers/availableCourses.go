package handlers

import (
	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

func AvailableCoursesHandler(c fiber.Ctx) error {
	student_id := c.Locals("user").(jwt.MapClaims)["student_id"]

	type CourseResult struct {
		ID               int64   `db:"id"`
		CourseCode       string  `db:"course_code"`
		CourseName       string  `db:"course_name"`
		Credits          float64 `db:"credits"`
		CourseType       string  `db:"course_type"`
		DeptName         *string `db:"dept_name"`
		TeachingDeptName *string `db:"teaching_dept_name"`
	}

	var results []CourseResult

	query := `
		SELECT 
			c.id,
			cm.course_id as course_code,
			cm.course_name,
			cm.credits,
			cm.course_type,
			d1.dept_name as dept_name,
			d2.dept_name as teaching_dept_name
		FROM "studentCourse_studentcourse" sc
		JOIN "course_course" c ON sc.course_id_id = c.id
		JOIN "courseMaster_coursemaster" cm ON c.course_id_id = cm.id
		LEFT JOIN "department_department" d1 ON cm.course_dept_id_id = d1.id
		LEFT JOIN "department_department" d2 ON c.teaching_dept_id_id = d2.id
		WHERE sc.student_id_id = ?
	`

	if err := db.DB.Raw(query, student_id).Scan(&results).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch student courses",
		})
	}

	enrichedCourses := make([]fiber.Map, 0, len(results))
	for _, result := range results {
		deptName := ""
		if result.DeptName != nil {
			deptName = *result.DeptName
		}

		teachingDeptName := ""
		if result.TeachingDeptName != nil {
			teachingDeptName = *result.TeachingDeptName
		}

		enrichedCourse := fiber.Map{
			"id":                 result.ID,
			"course_code":        result.CourseCode,
			"course_name":        result.CourseName,
			"credits":            result.Credits,
			"course_type":        result.CourseType,
			"dept_name":          deptName,
			"teaching_dept_name": teachingDeptName,
			"course_description": "",
			"is_do_more":         false,
			"is_mandatory":       false,
			"sessions":           []interface{}{},
		}
		enrichedCourses = append(enrichedCourses, enrichedCourse)
	}

	return c.JSON(enrichedCourses)
}

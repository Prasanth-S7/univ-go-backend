package handlers

import ( // "fmt"
	// "github.com/Prasanth-S7/univ-go-backend/db"
	// "github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v3"
)

func AvailableCoursesHandler(c fiber.Ctx) error {

	// [
	// {
	//     "id": 237,
	//     "course_code": "CS23631",
	//     "course_name": "Compiler Design",
	//     "credits": 4.0,
	//     "course_type": "LoT",
	//     "dept_name": "Department of Computer Science and Engineering",
	//     "teaching_dept_name": "Department of Computer Science and Engineering",
	//     "course_description": "Lab and Theory Year 3, Semester 6.",
	//     "is_do_more": false,
	//     "is_mandatory": false,
	//     "sessions": []
	// },
	// ]

	// userClaims, ok := c.Locals("user").(jwt.MapClaims)
	// if !ok {
	// 	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
	// 		"error": "Unauthorized",
	// 	})
	// }

	// email, ok := userClaims["id"].(string)

	return c.JSON(fiber.Map{
		"message": "Success",
		"data": fiber.Map{
			"courses": []fiber.Map{},
		},
	})
}

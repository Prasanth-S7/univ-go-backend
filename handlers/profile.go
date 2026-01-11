package handlers

import (
	"fmt"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func ProfileHandler(c *fiber.Ctx) error {

	userClaims, ok := c.Locals("user").(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	email, ok := userClaims["id"].(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var user models.User
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	var student models.Student
	if err := db.DB.Where("student_id_id = ?", user.UUID).First(&student).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Student details not found",
		})
	}

	var department models.Department
	if student.DeptID != nil {
		if err := db.DB.First(&department, *student.DeptID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Department details not found for the given department ID: %d", *student.DeptID),
			})
		}
	}

	return c.JSON(fiber.Map{
		"message": "Success",
		"data": fiber.Map{
			"user": fiber.Map{
				"email":        user.Email,
				"first_name":   user.FirstName,
				"last_name":    user.LastName,
				"gender":       user.Gender,
				"phone_number": user.PhoneNumber,
				"is_active":    user.IsActive,
				"is_staff":     user.IsStaff,
				"is_superuser": user.IsSuperuser,
				"date_joined":  user.DateJoined,
				"last_login":   user.LastLogin,
				"user_type":    user.UserType,
			},
			"student": fiber.Map{
				"id":               student.ID,
				"batch":            student.Batch,
				"current_semester": student.CurrentSemester,
				"year":             student.Year,
				"roll_no":          student.RollNo,
				"student_type":     student.StudentType,
				"degree_type":      student.DegreeType,
				"department": fiber.Map{
					"id":               department.ID,
					"dept_name":        department.DeptName,
					"date_established": department.DateEstablished,
					"contact_info":     department.ContactInfo,
				},
			},
			"is_login_allowed": true,
		},
	})
}

package handlers

import (
	"fmt"
	"os"
	"time"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/middlewares"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/Prasanth-S7/univ-go-backend/utils"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

func LoginHandler(c fiber.Ctx) error {

	var req LoginRequest

	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var user models.User

	if err := db.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	//check if blocked student list

	var blockedStudentList []models.BlockedStudent

	if err := db.DB.Where("email =?", user.Email).Find(&blockedStudentList).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch blocked student list",
		})
	}

	if len(blockedStudentList) > 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "You are blocked",
		})
	}

	//fetch student details based on the email

	var student models.Student

	if err := db.DB.Where("student_id_id = ?", user.UUID).First(&student).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	//check if allowed login years

	var allowedLoginYears []models.StudentAccessConfig

	if err := db.DB.Where("allowed_login_years @> ?", fmt.Sprintf("[%d]", student.Year)).Find(&allowedLoginYears).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if len(allowedLoginYears) == 0 {
		var deptName string
		if student.DeptID != nil {
			var dept models.Department
			if err := db.DB.First(&dept, *student.DeptID).Error; err == nil {
				deptName = dept.DeptName
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"detail": fmt.Sprintf("Login for year: %d or Dept: %s is restricted at this time, try again later!", student.Year, deptName),
			"code":   "login_not_allowed",
		})
	}

	//check if allowed login Departments

	var allowedLoginDepartments []models.StudentAccessConfigAllowedLoginDept

	if student.DeptID != nil {
		if err := db.DB.Where("department_id = ?", *student.DeptID).Find(&allowedLoginDepartments).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch allowed login departments",
			})
		}
	}

	if len(allowedLoginDepartments) == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "You are not allowed to login",
		})
	}

	// if user.Password != req.Password {
	// 	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
	// 		"error": "Invalid password",
	// 	})
	// }

	//check if jwt secret key is present

	jwtKey := os.Getenv("JWT_KEY")
	if jwtKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Internal Server Error: JWT Key not found",
		})
	}

	var jwtToken string
	var err error
	if jwtToken, err = middlewares.EncodeJWT(user.Email, user.FirstName, user.LastName, user.UUID.String(), student.ID, jwtKey); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not login",
		})
	}

	// Set cookie
	cookieDomain := os.Getenv("COOKIE_DOMAIN")

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    jwtToken,
		SameSite: "Lax",
		HTTPOnly: true,
		Secure:   true,
		Domain:   cookieDomain,
		Expires:  time.Now().Add(time.Hour * 24 * 30),
	})

	c.Locals("user", fiber.Map{
		"id":         user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"gender":     user.Gender,
		"user_type":  user.UserType,
	})

	return c.JSON(fiber.Map{
		"id":         user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"gender":     user.Gender,
		"user_type":  user.UserType,
		"detail":     "Login successful!",
	})
}

func AllowedLoginStatusHandler(c fiber.Ctx) error {

	userClaims, ok := c.Locals("user").(jwt.MapClaims)
	if !ok {
		utils.DeleteCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	student_id, ok := userClaims["student_id"]
	if !ok {
		utils.DeleteCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var student models.Student
	if err := db.DB.Where("id = ?", student_id).First(&student).Error; err != nil {
		utils.DeleteCookie(c)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var allowedLoginYears []models.StudentAccessConfig

	if err := db.DB.Where("allowed_login_years @> ?", fmt.Sprintf("[%d]", student.Year)).Find(&allowedLoginYears).Error; err != nil {
		utils.DeleteCookie(c)
		return c.JSON(fiber.Map{
			"is_login_allowed": false,
		})
	}

	if len(allowedLoginYears) == 0 {
		utils.DeleteCookie(c)
		return c.JSON(fiber.Map{
			"is_login_allowed": false,
		})
	}

	//check if allowed login Departments

	var allowedLoginDepartments []models.StudentAccessConfigAllowedLoginDept

	if student.DeptID != nil {
		if err := db.DB.Where("department_id = ?", *student.DeptID).Find(&allowedLoginDepartments).Error; err != nil {
			utils.DeleteCookie(c)
			return c.JSON(fiber.Map{
				"is_login_allowed": false,
			})
		}
	}

	if len(allowedLoginDepartments) == 0 {
		utils.DeleteCookie(c)
		return c.JSON(fiber.Map{
			"is_login_allowed": false,
		})
	}
	return c.JSON(fiber.Map{
		"is_login_allowed": true,
	})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

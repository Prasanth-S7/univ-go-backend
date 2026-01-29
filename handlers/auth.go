package handlers

import (
	"fmt"
	"os"
	"time"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/middlewares"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/Prasanth-S7/univ-go-backend/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func (h *Handler) LoginHandler(c *fiber.Ctx) error {

	var req LoginRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var user models.User

	if err := db.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"detail": "No account found with this email. If you think it's a mistake, please contact the admin.",
			"code":   "user_not_found",
		})
	}

	isValid, errr := utils.VerifyDjangoPassword(req.Password, user.Password)
	if errr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Password verification failed",
		})
	}

	if !isValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Invalid password",
			"code":   "invalid_credentials",
		})
	}

	//check if blocked student list

	var blockedStudentList []models.BlockedStudent

	if err := db.DB.Where("email = ?", user.Email).Find(&blockedStudentList).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch blocked student list",
		})
	}

	if len(blockedStudentList) > 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"detail": "Your account has been blocked. Please contact the admin.",
			"code":   "account_blocked",
		})
	}

	//fetch student details based on the email

	var student models.Student

	if err := db.DB.Where("student_id_id = ?", user.UUID).First(&student).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Check if email is in allowed login emails list
	var allowedEmailConfigs []models.StudentAccessConfig
	if err := db.DB.Where("allowed_login_emails @> ?", fmt.Sprintf(`["%s"]`, user.Email)).Find(&allowedEmailConfigs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify email whitelist",
		})
	}

	// If email whitelist exists and user's email is in it, allow login immediately
	if len(allowedEmailConfigs) > 0 {
		// Email is whitelisted - skip year and department checks, proceed to login
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
		isSecure := false
		sameSite := "Lax"
		if os.Getenv("GO_ENV") == "production" {
			isSecure = true
			sameSite = "None"
		}

		c.Cookie(&fiber.Cookie{
			Name:     "token",
			Value:    jwtToken,
			SameSite: sameSite,
			HTTPOnly: true,
			Secure:   isSecure,
			Domain:   cookieDomain,
			Expires:  time.Now().Add(time.Hour * 24 * 30),
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

	// If not in email whitelist, proceed with normal year and department checks

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
	isSecure := false
	sameSite := "Lax"
	if os.Getenv("GO_ENV") == "production" {
		isSecure = true
		sameSite = "None"
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    jwtToken,
		SameSite: sameSite,
		HTTPOnly: true,
		Secure:   isSecure,
		Domain:   cookieDomain,
		Expires:  time.Now().Add(time.Hour * 24 * 30),
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

func (h *Handler) AllowedLoginStatusHandler(c *fiber.Ctx) error {

	userClaims, ok := c.Locals("user").(jwt.MapClaims)
	if !ok {
		utils.DeleteCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	student_id, ok := userClaims["student_id"]
	email, ok := userClaims["id"]

	if !ok {
		utils.DeleteCookie(c)
		fmt.Println("reaches here")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var allowedEmailConfigs []models.StudentAccessConfig
	if err := db.DB.Where("allowed_login_emails @> ?", fmt.Sprintf(`["%s"]`, email)).Find(&allowedEmailConfigs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify email whitelist",
		})
	}

	if len(allowedEmailConfigs) > 0 {
		return c.JSON(fiber.Map{
			"is_login_allowed": true,
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

func (h *Handler) LogoutHandler(c *fiber.Ctx) error {
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	isSecure := false
	sameSite := "Lax"
	if os.Getenv("GO_ENV") == "production" {
		isSecure = true
		sameSite = "None"
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
		Secure:   isSecure,
		Domain:   cookieDomain,
		SameSite: sameSite,
	})

	return c.JSON(fiber.Map{
		"detail": "Logout successful",
	})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

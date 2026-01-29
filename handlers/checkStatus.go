package handlers

import (
	"context"
	"fmt"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type TimetableStatusResponse struct {
	Confirmed []StudentTimetableDetail `json:"confirmed"`
	Rejected  []StudentTimetableDetail `json:"rejected"`
	Pending   bool                     `json:"pending"`
}

type StudentTimetableDetail struct {
	ID              int64  `json:"id"`
	Status          string `json:"status"`
	RejectionReason string `json:"rejection_reason,omitempty"`
	Batch           string `json:"batch"`
	TeacherCourseID int64  `json:"teacher_course_id"`
	CourseName      string `json:"course_name,omitempty"`
	TeacherName     string `json:"teacher_name,omitempty"`
}

func (h *Handler) StatusHandler(c *fiber.Ctx) error {
	user := c.Locals("user").(jwt.MapClaims)
	studentID := int64(user["student_id"].(float64))
	userID := fmt.Sprintf("%d", studentID)

	ctx := context.Background()

	// Check if user has pending request
	pending := false
	if exists, _ := db.RedisClient.HExists(ctx, "user_active_requests", userID).Result(); exists {
		pending = true
	}

	// Fetch all StudentTimetable records for this student
	var timetables []models.StudentTimetable
	if err := db.DB.Where("student_id_id = ?", studentID).Find(&timetables).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch timetable records",
		})
	}

	// Group by status
	confirmed := []StudentTimetableDetail{}
	rejected := []StudentTimetableDetail{}

	// Collect teacher course IDs for batch fetching
	teacherCourseIDs := make([]int64, 0, len(timetables))
	for _, tt := range timetables {
		teacherCourseIDs = append(teacherCourseIDs, tt.TeacherCourseID)
	}

	// Fetch teacher courses with related data
	type TeacherCourseInfo struct {
		TeacherCourseID int64  `gorm:"column:id"`
		CourseName      string `gorm:"column:course_name"`
		TeacherName     string `gorm:"column:teacher_name"`
	}

	var teacherCourseInfos []TeacherCourseInfo
	if len(teacherCourseIDs) > 0 {
		db.DB.Table("\"teacherCourse_teachercourse\" as tc").
			Select("tc.id, cm.course_name, CONCAT(u.first_name, ' ', u.last_name) as teacher_name").
			Joins("LEFT JOIN \"course_course\" as c ON tc.course_id_id = c.id").
			Joins("LEFT JOIN \"courseMaster_coursemaster\" as cm ON c.course_id_id = cm.id").
			Joins("LEFT JOIN \"teacher_teacher\" as t ON tc.teacher_id_id = t.id").
			Joins("LEFT JOIN \"authentication_user\" as u ON t.teacher_id_id = u.uuid").
			Where("tc.id IN ?", teacherCourseIDs).
			Scan(&teacherCourseInfos)
	}

	// Create map for quick lookup
	teacherCourseMap := make(map[int64]TeacherCourseInfo)
	for _, info := range teacherCourseInfos {
		teacherCourseMap[info.TeacherCourseID] = info
	}

	// Build response
	for _, tt := range timetables {
		detail := StudentTimetableDetail{
			ID:              tt.ID,
			Status:          tt.Status,
			RejectionReason: tt.RejectionReason,
			Batch:           tt.Batch,
			TeacherCourseID: tt.TeacherCourseID,
		}

		// Add course and teacher info if available
		if info, ok := teacherCourseMap[tt.TeacherCourseID]; ok {
			detail.CourseName = info.CourseName
			detail.TeacherName = info.TeacherName
		}

		if tt.Status == "confirmed" {
			confirmed = append(confirmed, detail)
		} else if tt.Status == "rejected" {
			rejected = append(rejected, detail)
		}
	}

	return c.JSON(TimetableStatusResponse{
		Confirmed: confirmed,
		Rejected:  rejected,
		Pending:   pending,
	})
}

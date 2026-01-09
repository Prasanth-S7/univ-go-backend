package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID               int64      `gorm:"primaryKey"`
	Title            string     `gorm:"type:varchar(255);not null"`
	Message          string     `gorm:"type:text;not null"`
	NotificationType string     `gorm:"type:varchar(20);not null"`
	CreatedAt        time.Time  `gorm:"type:timestamptz;not null"`
	ExpiresAt        *time.Time `gorm:"type:timestamptz"`
	IsActive         bool       `gorm:"not null"`
	ForAllUsers      bool       `gorm:"not null"`
	ForStudents      bool       `gorm:"not null"`
	ForTeachers      bool       `gorm:"not null"`
	ForAdmins        bool       `gorm:"not null"`
	CourseYear       *int       `gorm:"column:course_year"`
	Semester         *int       `gorm:"column:semester"`
	ActionURL        *string    `gorm:"type:varchar(255);column:action_url"`
	ActionText       *string    `gorm:"type:varchar(50);column:action_text"`
	DepartmentID     *int64     `gorm:"column:department_id_id"`
}

func (Notification) TableName() string {
	return "dashboard_notification"
}

type UserNotification struct {
	ID             int64      `gorm:"primaryKey"`
	ReadAt         *time.Time `gorm:"type:timestamptz"`
	IsRead         bool       `gorm:"not null"`
	NotificationID int64      `gorm:"not null"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null"`
}

func (UserNotification) TableName() string {
	return "dashboard_usernotification"
}

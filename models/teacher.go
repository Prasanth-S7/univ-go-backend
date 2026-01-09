package models

import (
	"time"

	"github.com/google/uuid"
)

type Teacher struct {
	ID                     int64      `gorm:"primaryKey"`
	StaffCode              string     `gorm:"type:varchar(50);not null"`
	TeacherRole            string     `gorm:"type:varchar(100);not null"`
	TeacherSpecialisation  string     `gorm:"type:varchar(100);not null"`
	TeacherWorkingHours    int        `gorm:"not null"`
	AvailabilityType       string     `gorm:"type:varchar(20);not null"` // e.g. Full time
	IsIndustryProfessional bool       `gorm:"not null"`
	ResignationStatus      string     `gorm:"type:varchar(20);not null"`
	ResignationDate        *time.Time `gorm:"type:date"`
	IsPlaceholder          bool       `gorm:"not null"`
	PlaceholderDescription string     `gorm:"type:text;not null"`
	IsSpecialSlot          bool       `gorm:"not null"`
	DeptID                 *int64     `gorm:"column:dept_id_id"`
	TeacherID              *uuid.UUID `gorm:"type:uuid;column:teacher_id_id"` // Link to Auth User
}

func (Teacher) TableName() string {
	return "teacher_teacher"
}

type TeacherAvailability struct {
	ID        int64     `gorm:"primaryKey"`
	DayOfWeek int       `gorm:"not null"`
	StartTime time.Time `gorm:"type:time;not null"`
	EndTime   time.Time `gorm:"type:time;not null"`
	TeacherID int64     `gorm:"column:teacher_id;not null"` // integer FK, not UUID here? Line 1958 says teacher_id bigint NOT NULL
}

func (TeacherAvailability) TableName() string {
	return "teacher_teacheravailability"
}

package models

import "time"

type StudentCourse struct {
	ID                int64     `gorm:"primaryKey"`
	Status            string    `gorm:"type:varchar(20);not null"`
	IsInternalBooking bool      `gorm:"not null"`
	CreatedAt         time.Time `gorm:"type:timestamptz;not null"`
	UpdatedAt         time.Time `gorm:"type:timestamptz;not null"`
	CourseID          *int64    `gorm:"column:course_id_id"`
	SlotID            *int64    `gorm:"column:slot_id_id"`
	StudentID         *int64    `gorm:"column:student_id_id"`
	TeacherID         *int64    `gorm:"column:teacher_id_id"`
}

func (StudentCourse) TableName() string {
	return "studentCourse_studentcourse"
}

type StudentCoursePreference struct {
	ID              int64     `gorm:"primaryKey"`
	PreferenceOrder int       `gorm:"not null"`
	CreatedAt       time.Time `gorm:"type:timestamptz;not null"`
	StudentCourseID int64     `gorm:"column:student_course_id;not null"`
	TeacherID       int64     `gorm:"column:teacher_id_id;not null"`
}

func (StudentCoursePreference) TableName() string {
	return "studentCourse_studentcoursepreference"
}

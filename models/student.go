package models

import (
	"time"

	"github.com/google/uuid"
)

type Student struct {
	ID               int64      `gorm:"primaryKey"`
	Batch            int        `gorm:"not null"`
	CurrentSemester  int        `gorm:"not null"`
	Year             int        `gorm:"not null"`
	RollNo           *string    `gorm:"type:varchar(50)"`
	StudentType      string     `gorm:"type:varchar(50);not null"`
	DegreeType       string     `gorm:"type:varchar(50);not null"`
	TimetableCreated bool       `gorm:"not null"`
	DeptID           *int64     `gorm:"column:dept_id_id"`
	StudentID        *uuid.UUID `gorm:"type:uuid;column:student_id_id"` // Link to Auth User
}

func (Student) TableName() string {
	return "student_student"
}

type StudentNote struct {
	ID          int64     `gorm:"primaryKey"`
	Title       string    `gorm:"type:varchar(200);not null"`
	Content     string    `gorm:"type:text;not null"`
	IsCompleted bool      `gorm:"not null"`
	CreatedAt   time.Time `gorm:"type:timestamptz;not null"`
	UpdatedAt   time.Time `gorm:"type:timestamptz;not null"`
	StudentID   int64     `gorm:"column:student_id;not null"`
}

func (StudentNote) TableName() string {
	return "student_studentnote"
}

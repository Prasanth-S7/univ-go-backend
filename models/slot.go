package models

import "time"

type Slot struct {
	ID            int64     `gorm:"primaryKey"`
	SlotName      string    `gorm:"type:varchar(20);not null"`
	SlotStartTime time.Time `gorm:"type:time;not null"`
	SlotEndTime   time.Time `gorm:"type:time;not null"`
	IsActive      bool      `gorm:"not null"`
	Description   *string   `gorm:"type:text"`
	SlotType      string    `gorm:"type:varchar(1);not null"`
}

func (Slot) TableName() string {
	return "slot_slot"
}

type SpecialTeacher struct {
	ID           int64     `gorm:"primaryKey"`
	SelectedDate time.Time `gorm:"type:timestamptz;not null"`
	IsActive     bool      `gorm:"not null"`
	DepartmentID int64     `gorm:"not null"`
	SelectedByID *int64    `gorm:"column:selected_by_id"`
	TeacherID    int64     `gorm:"not null"`
}

func (SpecialTeacher) TableName() string {
	return "slot_specialteacher"
}

type TeacherSlotAssignment struct {
	ID        int64  `gorm:"primaryKey"`
	DayOfWeek int    `gorm:"not null"`
	SlotType  string `gorm:"type:varchar(1);not null"`
	SlotID    int64  `gorm:"not null"`
	TeacherID int64  `gorm:"not null"`
}

func (TeacherSlotAssignment) TableName() string {
	return "slot_teacherslotassignment"
}

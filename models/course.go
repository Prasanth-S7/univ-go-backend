package models

import "time"

type Course struct {
	ID                     int64   `gorm:"primaryKey"`
	CourseYear             int     `gorm:"not null"`
	CourseSemester         int     `gorm:"not null"`
	NeedAssistTeacher      bool    `gorm:"not null"`
	ElectiveType           string  `gorm:"type:varchar(50);not null"`
	LabType                *string `gorm:"type:varchar(50)"`
	TeachingStatus         string  `gorm:"type:varchar(50);not null"`
	CourseMasterID         int64   `gorm:"column:course_id_id;not null"`
	ForDeptID              *int64  `gorm:"column:for_dept_id_id"`
	TeachingDeptID         *int64  `gorm:"column:teaching_dept_id_id"`
	AdditionalLectureHours int     `gorm:"not null"`
}

func (Course) TableName() string {
	return "course_course"
}

type CourseResourceAllocation struct {
	ID               int64     `gorm:"primaryKey"`
	AllocationReason string    `gorm:"type:text;not null"`
	AllocationDate   time.Time `gorm:"type:date;not null"`
	Status           string    `gorm:"type:varchar(50);not null"`
	CourseID         int64     `gorm:"column:course_id_id;not null"`
	OriginalDeptID   int64     `gorm:"column:original_dept_id_id;not null"`
	TeachingDeptID   int64     `gorm:"column:teaching_dept_id_id;not null"`
}

func (CourseResourceAllocation) TableName() string {
	return "course_courseresourceallocation"
}

type CourseSlotPreference struct {
	ID              int64 `gorm:"primaryKey"`
	PreferenceLevel int   `gorm:"not null"`
	CourseID        int64 `gorm:"column:course_id_id;not null"`
	SlotID          int64 `gorm:"column:slot_id_id;not null"`
}

func (CourseSlotPreference) TableName() string {
	return "course_courseslotpreference"
}

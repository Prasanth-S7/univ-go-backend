package models

import (
	"encoding/json"
	"time"
)

type TimetableMaster struct {
	ID              int64  `gorm:"primaryKey"`
	IsLab           bool   `gorm:"not null"`
	GroupName       string `gorm:"type:varchar(150);not null"`
	GroupIndex      int    `gorm:"not null"`
	IsBatched       bool   `gorm:"not null"`
	Batch           string `gorm:"type:varchar(20);not null"`
	StudentCount    int    `gorm:"not null"`
	Version         string `gorm:"type:varchar(100);not null"`
	TeacherCourseID *int64 `gorm:"column:teacher_course_id"`
}

func (TimetableMaster) TableName() string {
	return "timetableMaster_timetablemaster"
}

type Session struct {
	ID        int64     `gorm:"primaryKey"`
	Name      string    `gorm:"type:varchar(100);not null"`
	StartTime time.Time `gorm:"type:time;not null"`
	EndTime   time.Time `gorm:"type:time;not null"`
	IsLabTime bool      `gorm:"not null"`
}

func (Session) TableName() string {
	return "timetableMaster_session"
}

type DoMore struct {
	ID             int64           `gorm:"primaryKey"`
	DoMoreName     string          `gorm:"type:varchar(250);not null"`
	AvailableYears json.RawMessage `gorm:"type:jsonb;not null"`
	IsMandatory    bool            `gorm:"not null"`
}

func (DoMore) TableName() string {
	return "timetableMaster_domore"
}

type DoMoreAvailableDept struct {
	ID           int64 `gorm:"primaryKey"`
	DoMoreID     int64 `gorm:"column:domore_id;not null"`
	DepartmentID int64 `gorm:"column:department_id;not null"`
}

func (DoMoreAvailableDept) TableName() string {
	return "timetableMaster_domore_available_depts"
}

type DoMoreChoice struct {
	ID                int64     `gorm:"primaryKey"`
	IsConfirmed       bool      `gorm:"not null"`
	IsMailSent        bool      `gorm:"not null"`
	RejectionReason   string    `gorm:"type:varchar(200);not null"`
	IsInternalBooking bool      `gorm:"not null"`
	DoMoreChoiceID    int64     `gorm:"column:do_more_choice_id;not null"` // Likely refers to DoMore? Or something else. Keeping original column name.
	StudentID         int64     `gorm:"column:student_id_id;not null"`
	DoMoreSessionID   int64     `gorm:"column:do_more_session_id;not null"`
	UpdatedAt         time.Time `gorm:"type:timestamptz;not null"`
}

func (DoMoreChoice) TableName() string {
	return "timetableMaster_domorechoice"
}

type DoMoreSession struct {
	ID             int64  `gorm:"primaryKey"`
	Day            string `gorm:"type:varchar(10);not null"`
	SessionName    string `gorm:"type:varchar(20);not null"`
	StudentCount   int    `gorm:"not null"`
	DoMoreChoiceID int64  `gorm:"column:do_more_choice_id;not null"`
	SessionID      *int64 `gorm:"column:session_id"`
}

func (DoMoreSession) TableName() string {
	return "timetableMaster_domoresessions"
}

type StudentTimetable struct {
	ID                int64     `gorm:"primaryKey"`
	Status            string    `gorm:"type:varchar(20);not null"`
	RejectionReason   string    `gorm:"type:varchar(200);not null"`
	IsMailSent        bool      `gorm:"not null"`
	Batch             string    `gorm:"type:varchar(100);not null"`
	IsInternalBooking bool      `gorm:"not null"`
	StudentID         int64     `gorm:"column:student_id_id;not null"`
	TeacherCourseID   int64     `gorm:"column:teacher_course_id_id;not null"`
	UpdatedAt         time.Time `gorm:"type:timestamptz;not null"`
}

func (StudentTimetable) TableName() string {
	return "timetableMaster_studenttimetable"
}

type TimetableAllotment struct {
	ID                    int64  `gorm:"primaryKey"`
	Day                   string `gorm:"type:varchar(10);not null"`
	SessionName           string `gorm:"type:varchar(20);not null"`
	SessionID             *int64 `gorm:"column:session_id"`
	VenueID               int64  `gorm:"column:venue_id;not null"`
	TeacherCoursePeriodID int64  `gorm:"column:teacher_course_period_id;not null"`
}

func (TimetableAllotment) TableName() string {
	return "timetableMaster_timetableallotment"
}

package models

import "time"

type TeacherCourse struct {
	ID                        int64   `gorm:"primaryKey"`
	StudentCount              int     `gorm:"not null"`
	CurrentStudents           int     `gorm:"not null"`
	AcademicYear              int     `gorm:"not null"`
	Semester                  int     `gorm:"not null"`
	RequiresSpecialScheduling bool    `gorm:"not null"`
	AssistTeacherType         *string `gorm:"type:varchar(10)"`
	AssistTeacher2Type        *string `gorm:"type:varchar(10)"`
	AssistTeacher3Type        *string `gorm:"type:varchar(10)"`
	AssistTeacherID           *int64  `gorm:"column:asssist_teacher_id"`   // Schema typo: asssist
	AssistTeacher2ID          *int64  `gorm:"column:asssist_teacher_2_id"` // Schema typo: asssist
	AssistTeacher3ID          *int64  `gorm:"column:asssist_teacher_3_id"` // Schema typo: asssist
	CourseID                  *int64  `gorm:"column:course_id_id"`
	TeacherID                 *int64  `gorm:"column:teacher_id_id"`
}

func (TeacherCourse) TableName() string {
	return "teacherCourse_teachercourse"
}

type AssistantTeacherRequest struct {
	ID                 int64      `gorm:"primaryKey"`
	AssistantType      string     `gorm:"type:varchar(10);not null"`
	AssistantPosition  int        `gorm:"not null"`
	Status             string     `gorm:"type:varchar(10);not null"`
	RequestedDate      time.Time  `gorm:"type:timestamptz;not null"`
	ResponseDate       *time.Time `gorm:"type:timestamptz"`
	Comments           *string    `gorm:"type:text"`
	RequestedTeacherID *int64     `gorm:"column:requested_teacher_id"`
	RequestingDeptID   int64      `gorm:"column:requesting_dept_id;not null"`
	TargetDeptID       int64      `gorm:"column:target_dept_id;not null"`
	TeacherCourseID    int64      `gorm:"column:teacher_course_id;not null"`
}

func (AssistantTeacherRequest) TableName() string {
	return "teacherCourse_assistantteacherrequest"
}

type SoftSkills struct {
	ID          int64  `gorm:"primaryKey"`
	CourseCode  string `gorm:"type:varchar(10);not null"`
	CourseName  string `gorm:"type:varchar(10);not null"`
	Day         string `gorm:"type:varchar(10);not null"`
	SessionName string `gorm:"type:varchar(20);not null"`
	SessionID   *int64 `gorm:"column:session_id"`
	VenueID     int64  `gorm:"column:venue_id;not null"`
}

func (SoftSkills) TableName() string {
	return "teacherCourse_softskills"
}

type TeacherCoursePreferredAvailabilitySlot struct {
	ID                    int64 `gorm:"primaryKey"`
	TeacherCourseID       int64 `gorm:"column:teachercourse_id;not null"`
	TeacherAvailabilityID int64 `gorm:"column:teacheravailability_id;not null"`
}

func (TeacherCoursePreferredAvailabilitySlot) TableName() string {
	return "teacherCourse_teachercourse_preferred_availability_slots"
}

package models

type CourseMaster struct {
	ID                            int64   `gorm:"primaryKey"`
	CourseID                      string  `gorm:"type:varchar(50);not null"`
	CourseName                    string  `gorm:"type:varchar(255);not null"`
	IsZeroCreditCourse            bool    `gorm:"not null"`
	LectureHours                  int     `gorm:"not null"`
	PracticalHours                int     `gorm:"not null"`
	TutorialHours                 int     `gorm:"not null"`
	Credits                       float64 `gorm:"not null"`
	Regulation                    string  `gorm:"type:varchar(50);not null"`
	CourseType                    string  `gorm:"type:varchar(50);not null"`
	DegreeType                    string  `gorm:"type:varchar(10);not null"`
	CourseDeptID                  *int64  `gorm:"column:course_dept_id_id"`
	DefaultAdditionalLectureHours int     `gorm:"not null"`
}

func (CourseMaster) TableName() string {
	return "courseMaster_coursemaster"
}

type CourseMasterRoomPreference struct {
	ID                  int     `gorm:"primaryKey"`
	PreferenceLevel     int     `gorm:"not null"`
	PreferredFor        string  `gorm:"type:varchar(50);not null"`
	TechLevelPreference string  `gorm:"type:varchar(50);not null"`
	LabType             *string `gorm:"type:varchar(50)"`
	LabDescription      *string `gorm:"type:text"`
	CourseMasterID      int64   `gorm:"column:course_master_id_id;not null"`
	RoomID              *int64  `gorm:"column:room_id_id"`
}

func (CourseMasterRoomPreference) TableName() string {
	return "courseMaster_coursemasterroompreference"
}

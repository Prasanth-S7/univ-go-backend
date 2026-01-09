package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	UUID        uuid.UUID  `gorm:"primaryKey;type:uuid;column:uuid"`
	Password    string     `gorm:"type:varchar(128);not null"`
	LastLogin   *time.Time `gorm:"type:timestamptz"`
	IsSuperuser bool       `gorm:"not null"`
	IsStaff     bool       `gorm:"not null"`
	IsActive    bool       `gorm:"not null"`
	DateJoined  time.Time  `gorm:"type:timestamptz;not null"`
	Email       string     `gorm:"type:varchar(254);not null"`
	FirstName   string     `gorm:"type:varchar(255);not null"`
	LastName    string     `gorm:"type:varchar(255);not null"`
	PhoneNumber string     `gorm:"type:varchar(20);not null"`
	Gender      string     `gorm:"type:varchar(10);not null"`
	UserType    string     `gorm:"type:varchar(20);not null"`
}

func (User) TableName() string {
	return "authentication_user"
}

type BlockedStudent struct {
	ID    int64  `gorm:"primaryKey"`
	Email string `gorm:"type:varchar(200);not null"`
	Name  string `gorm:"type:varchar(200);not null"`
	Dept  string `gorm:"type:varchar(50);not null"`
	Year  int    `gorm:"not null"`
}

func (BlockedStudent) TableName() string {
	return "authentication_blockedstudents"
}

type ForgetPassword struct {
	ID          int64     `gorm:"primaryKey"`
	NewPassword string    `gorm:"type:varchar(255);not null"`
	Code        string    `gorm:"type:varchar(10);not null"`
	UserID      uuid.UUID `gorm:"type:uuid;column:user_id_id;not null"`
	User        User      `gorm:"foreignKey:UserID;references:UUID"`
}

func (ForgetPassword) TableName() string {
	return "authentication_forgetpassword"
}

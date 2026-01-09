package models

import (
	"encoding/json"
	"time"
)

type StudentAccessConfig struct {
	ID                  int64           `gorm:"primaryKey"`
	AllowedLoginYears   json.RawMessage `gorm:"type:jsonb;not null"`
	AllowedBookingYears json.RawMessage `gorm:"type:jsonb;not null"`
	AllowedLoginEmails  json.RawMessage `gorm:"type:jsonb;not null"`
	UpdatedAt           time.Time       `gorm:"type:timestamptz;not null"`
}

func (StudentAccessConfig) TableName() string {
	return "adminConfig_studentaccessconfig"
}

type StudentAccessConfigAllowedBookingDept struct {
	ID                    int64 `gorm:"primaryKey"`
	StudentAccessConfigID int64 `gorm:"column:studentaccessconfig_id;not null"`
	DepartmentID          int64 `gorm:"column:department_id;not null"`
}

func (StudentAccessConfigAllowedBookingDept) TableName() string {
	return "adminConfig_studentaccessconfig_allowed_booking_departments"
}

type StudentAccessConfigAllowedLoginDept struct {
	ID                    int64 `gorm:"primaryKey"`
	StudentAccessConfigID int64 `gorm:"column:studentaccessconfig_id;not null"`
	DepartmentID          int64 `gorm:"column:department_id;not null"`
}

func (StudentAccessConfigAllowedLoginDept) TableName() string {
	return "adminConfig_studentaccessconfig_allowed_login_departments"
}

package models

import (
	"time"

	"github.com/google/uuid"
)

type Department struct {
	ID              int64      `gorm:"primaryKey"`
	DeptName        string     `gorm:"type:varchar(100);not null"`
	DateEstablished *time.Time `gorm:"type:date"`
	ContactInfo     string     `gorm:"type:varchar(255);not null"`
	HodID           *uuid.UUID `gorm:"type:uuid;column:hod_id_id"`
}

func (Department) TableName() string {
	return "department_department"
}

package models

import "time"

type HostelStudent struct {
	ID     int64  `gorm:"primaryKey"`
	Email  string `gorm:"type:varchar(255);not null;column:Email"`
	RollNo string `gorm:"type:varchar(25);not null;column:\"Roll No\""`
}

func (HostelStudent) TableName() string {
	return "transport_hostelstudents"
}

type TransportLocationConfirmation struct {
	ID                int64     `gorm:"primaryKey"`
	BusNo             string    `gorm:"type:varchar(20);not null"`
	BoardingPointName string    `gorm:"type:varchar(100);not null"`
	Pincode           *string   `gorm:"type:varchar(10)"`
	Latitude          float64   `gorm:"not null"`
	Longitude         float64   `gorm:"not null"`
	Address           string    `gorm:"type:varchar(512);not null"`
	OTP               string    `gorm:"type:varchar(6);not null;column:otp"`
	CreatedAt         time.Time `gorm:"type:timestamptz;not null"`
	Confirmed         bool      `gorm:"not null"`
	UserID            int64     `gorm:"column:user_id;not null"`
}

func (TransportLocationConfirmation) TableName() string {
	return "transport_transportlocationconfirmation"
}

package models

type Room struct {
	ID             int64  `gorm:"primaryKey"`
	RoomNumber     string `gorm:"type:varchar(20);not null"`
	Block          string `gorm:"type:varchar(100);not null"`
	Description    string `gorm:"type:text;not null"`
	IsLab          bool   `gorm:"not null"`
	RoomType       string `gorm:"type:varchar(50);not null"`
	RoomMinCap     int    `gorm:"not null"`
	RoomMaxCap     int    `gorm:"not null"`
	TechLevel      string `gorm:"type:varchar(50);not null"`
	HasProjector   bool   `gorm:"not null"`
	HasAC          bool   `gorm:"column:has_ac;not null"`
	SmartBoard     bool   `gorm:"not null"`
	GreenBoard     bool   `gorm:"not null"`
	IsLcsAvailable bool   `gorm:"column:\"isLcsAvailable\";not null"`
	MaintainedByID *int64 `gorm:"column:maintained_by_id_id"`
}

func (Room) TableName() string {
	return "rooms_room"
}

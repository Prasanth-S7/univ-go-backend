package db

import (
	"fmt"
	"log"
	"time"

	"github.com/Prasanth-S7/univ-go-backend/utils"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *utils.Config) {

	sslMode := "require"

	if cfg.GoEnv == "development" {
		sslMode = "disable"
	}

	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.DbHost,
		cfg.DbPort,
		cfg.DbUser,
		cfg.DbPassword,
		cfg.DbName,
		sslMode,
	)

	gormConfig := &gorm.Config{
		PrepareStmt: false,
		Logger:      logger.Default.LogMode(logger.Silent),
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DbMaxOpenConn)
	sqlDB.SetMaxIdleConns(cfg.DbMaxIdleConn)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DbConnMaxLifeTime) * time.Minute)
	sqlDB.SetConnMaxIdleTime(time.Duration(cfg.DbConnMaxIdleTime) * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Successfully connected to the Database")

	PrintDBStats()
	go MonitorDBStats() // for monitoring the db connection stats
}

func PrintDBStats() {
	sqlDB, err := DB.DB()
	if err != nil {
		log.Println("Error getting DB instance:", err)
		return
	}

	stats := sqlDB.Stats()
	log.Printf("DB Stats - Open: %d, InUse: %d, Idle: %d, WaitCount: %d, WaitDuration: %s\n",
		stats.OpenConnections,
		stats.InUse,
		stats.Idle,
		stats.WaitCount,
		stats.WaitDuration)
}

func MonitorDBStats() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		PrintDBStats()
	}
}

func GetDBStats() map[string]interface{} {
	sqlDB, err := DB.DB()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration.String(),
		"max_open_connections": stats.MaxOpenConnections,
		"max_idle_closed":      stats.MaxIdleClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	}
}

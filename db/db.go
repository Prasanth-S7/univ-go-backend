package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	sslMode := "require" // AWS RDS requires SSL in production

	if os.Getenv("GO_ENV") == "development" {
		sslMode = "disable"
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"), // This should be your RDS Proxy endpoint
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		sslMode,
	)

	// Configure GORM with appropriate settings for RDS Proxy
	gormConfig := &gorm.Config{
		PrepareStmt: true,                                  // RDS Proxy supports prepared statements
		Logger:      logger.Default.LogMode(logger.Silent), // Adjust as needed
	}

	// Open connection
	DB, err = gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Get underlying SQL DB for connection pool configuration
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}

	// Connection Pool Configuration for 8vCPU machine with RDS Proxy
	// RDS Proxy handles connection pooling, so we optimize client-side pool

	// MaxOpenConns: For 8vCPU, a good starting point is 80-100 connections
	// RDS Proxy can handle thousands of connections and multiplex them
	sqlDB.SetMaxOpenConns(80)

	// MaxIdleConns: Keep ~50% of max open connections idle
	// This reduces connection establishment overhead
	sqlDB.SetMaxIdleConns(40)

	// ConnMaxLifetime: RDS Proxy recommends shorter lifetimes
	// 5-15 minutes is optimal to prevent stale connections
	sqlDB.SetConnMaxLifetime(10 * time.Minute)

	// ConnMaxIdleTime: Close idle connections after this duration
	// Helps RDS Proxy manage its connection pool efficiently
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// Test the connection
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Successfully connected to Aurora via RDS Proxy")

	// Print initial connection stats
	PrintDBStats()

	// Start background monitoring
	go MonitorDBStats()
}

// PrintDBStats prints current database connection pool statistics
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

// MonitorDBStats monitors database connection pool statistics every 30 seconds
func MonitorDBStats() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		PrintDBStats()
	}
}

// GetDBStats returns database connection pool statistics as a map
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

package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"),
	)

	var err2 error

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: false, // PgBouncer-safe
	})
	if err != nil {
		log.Fatal("failed to connect database:", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal(err)
	}

	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetMaxIdleConns(25)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	fmt.Println("Connected via PgBouncer")

	DB, err2 = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err2 != nil {
		log.Fatal("failed to connect database")
	}
	fmt.Println("Connection Opened to Database")
}

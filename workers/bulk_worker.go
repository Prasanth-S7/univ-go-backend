package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
)

type BulkSelection struct {
	TeacherCourseID int64  `json:"teacher_course_id"`
	Batch           string `json:"batch"`
	IsDoMoreCourse  bool   `json:"is_do_more_course"`
}

type BookingTask struct {
	StudentID  int64           `json:"student_id"`
	RequestID  string          `json:"request_id"`
	Selections []BulkSelection `json:"selections"`
}

func StartWorker() {
	fmt.Println("Starting Bulk Booking Worker...")
	go func() {
		ctx := context.Background()
		for {
			// BRPOP blocks until a generic task is available
			result, err := db.RedisClient.BRPop(ctx, 0, "booking_queue").Result()
			if err != nil {
				fmt.Println("Redis Worker Error:", err)
				time.Sleep(3 * time.Second)
				continue
			}

			if len(result) < 2 {
				continue
			}

			payload := result[1]
			processTask(ctx, payload)
		}
	}()
}

func processTask(ctx context.Context, payload string) {
	var task BookingTask
	if err := json.Unmarshal([]byte(payload), &task); err != nil {
		fmt.Printf("Failed to unmarshal task: %v\n", err)
		return
	}

	fmt.Printf("Processing request %s for student %d\n", task.RequestID, task.StudentID)

	defer func() {
		// Clean up active request lock
		// Key: user_active_requests, Field: task.StudentID (as string)
		db.RedisClient.HDel(ctx, "user_active_requests", fmt.Sprintf("%d", task.StudentID))
	}()

	// --- LOGIC MOVED FROM HANDLER ---

	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	validSelections := make([]BulkSelection, 0, len(task.Selections))
	teacherCourseIDs := make([]int64, 0, len(task.Selections))
	for _, selection := range task.Selections {
		if selection.IsDoMoreCourse {
			continue
		}
		validSelections = append(validSelections, selection)
		teacherCourseIDs = append(teacherCourseIDs, selection.TeacherCourseID)
	}

	if len(validSelections) == 0 {
		tx.Rollback()
		fmt.Println("No valid selections to process")
		return
	}

	// 1. Fetch Masters
	var masters []models.TimetableMaster
	if err := tx.Where("teacher_course_id IN ?", teacherCourseIDs).Find(&masters).Error; err != nil {
		tx.Rollback()
		fmt.Printf("Error fetching masters: %v\n", err)
		return
	}

	masterMap := make(map[string]models.TimetableMaster)
	for _, m := range masters {
		key := fmt.Sprintf("%d_%s", *m.TeacherCourseID, m.Batch)
		masterMap[key] = m
	}

	// 2. Fetch Counts
	type CountResult struct {
		TeacherCourseID int64  `gorm:"column:teacher_course_id_id"`
		Batch           string `gorm:"column:batch"`
		Count           int64  `gorm:"column:count"`
	}
	var countResults []CountResult
	if err := tx.Table("timetableMaster_studenttimetable").
		Select("teacher_course_id_id, batch, COUNT(*) as count").
		Where("teacher_course_id_id IN ? AND status = ?", teacherCourseIDs, "confirmed").
		Group("teacher_course_id_id, batch").
		Scan(&countResults).Error; err != nil {
		tx.Rollback()
		fmt.Printf("Error counting bookings: %v\n", err)
		return
	}

	countMap := make(map[string]int64)
	for _, c := range countResults {
		key := fmt.Sprintf("%d_%s", c.TeacherCourseID, c.Batch)
		countMap[key] = c.Count
	}

	// 3. Existing Bookings
	var existingBookings []models.StudentTimetable
	if err := tx.Where("student_id_id = ? AND teacher_course_id_id IN ? AND status = ?", task.StudentID, teacherCourseIDs, "confirmed").
		Find(&existingBookings).Error; err != nil {
		tx.Rollback()
		fmt.Printf("Error checking existing bookings: %v\n", err)
		return
	}

	existingCourseMap := make(map[int64]bool)
	for _, b := range existingBookings {
		existingCourseMap[b.TeacherCourseID] = true
	}

	bookingsToInsert := make([]models.StudentTimetable, 0, len(validSelections))

	for _, selection := range validSelections {
		if existingCourseMap[selection.TeacherCourseID] {
			// Skip or Fail? Handler returned error. Worker should probably just skip or log.
			// Ideally we could mark this specific item as failed.
			fmt.Printf("Skipping duplicate course %d for student %d\n", selection.TeacherCourseID, task.StudentID)
			continue
		}

		targetBatch := selection.Batch
		if targetBatch == "theory" {
			targetBatch = ""
		}

		masterKey := fmt.Sprintf("%d_%s", selection.TeacherCourseID, targetBatch)
		master, exists := masterMap[masterKey]
		if !exists {
			fmt.Printf("Master not found for %s\n", masterKey)
			continue
		}

		countKey := fmt.Sprintf("%d_%s", selection.TeacherCourseID, selection.Batch)
		currentCount := countMap[countKey]

		if int(currentCount) >= master.StudentCount {
			fmt.Printf("No slots for %s\n", countKey)
			continue
		}

		// Update map to prevent duplicates in same batch
		existingCourseMap[selection.TeacherCourseID] = true

		bookingsToInsert = append(bookingsToInsert, models.StudentTimetable{
			Status:            "rejected",
			RejectionReason:   "sorry vro",
			IsMailSent:        false,
			Batch:             selection.Batch,
			IsInternalBooking: false,
			StudentID:         task.StudentID,
			TeacherCourseID:   selection.TeacherCourseID,
			UpdatedAt:         time.Now(),
		})
	}

	if len(bookingsToInsert) > 0 {
		if err := tx.Create(&bookingsToInsert).Error; err != nil {
			tx.Rollback()
			fmt.Printf("Insert failed: %v\n", err)
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		fmt.Printf("Commit failed: %v\n", err)
		return
	}

	fmt.Printf("Successfully processed request %s. Booked %d courses.\n", task.RequestID, len(bookingsToInsert))
}

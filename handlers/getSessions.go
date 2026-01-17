package handlers

import (
	"fmt"

	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func GetSessionsHandler(c *fiber.Ctx) error {
	user := c.Locals("user").(jwt.MapClaims)

	studentIDObj, ok := user["student_id"]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "student_id not found in token",
		})
	}
	studentID := int64(studentIDObj.(float64))

	// fetching the confirmed TTs
	var confirmedTTs []models.StudentTimetable
	if err := db.DB.Where("student_id_id = ? AND status = ?", studentID, "confirmed").Find(&confirmedTTs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch student timetable"})
	}

	if len(confirmedTTs) == 0 {
		return c.JSON(fiber.Map{"data": []fiber.Map{}})
	}

	teacherCourseIDs := make([]int64, len(confirmedTTs))
	// Map to quickly find batch for a teacher course
	type StudentTTInfo struct {
		Batch string
	}
	studentTTMap := make(map[int64]StudentTTInfo)

	for i, tt := range confirmedTTs {
		teacherCourseIDs[i] = tt.TeacherCourseID
		studentTTMap[tt.TeacherCourseID] = StudentTTInfo{Batch: tt.Batch}
	}

	// 2. Fetch TeacherCourses
	var teacherCourses []models.TeacherCourse
	if err := db.DB.Where("id IN ?", teacherCourseIDs).Find(&teacherCourses).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch teacher courses"})
	}

	// 3. Collect IDs for related data
	courseIDs := make([]int64, 0)
	teacherIDs := make([]int64, 0)
	tcMap := make(map[int64]models.TeacherCourse)

	for _, tc := range teacherCourses {
		tcMap[tc.ID] = tc
		if tc.CourseID != nil {
			courseIDs = append(courseIDs, *tc.CourseID)
		}
		if tc.TeacherID != nil {
			teacherIDs = append(teacherIDs, *tc.TeacherID)
		}
	}

	// 4. Fetch Courses and CourseMasters
	var courses []models.Course
	courseMasterIDs := make([]int64, 0)
	courseMap := make(map[int64]models.Course)
	if len(courseIDs) > 0 {
		db.DB.Where("id IN ?", courseIDs).Find(&courses)
		for _, c := range courses {
			courseMap[c.ID] = c
			courseMasterIDs = append(courseMasterIDs, c.CourseMasterID)
		}
	}

	var courseMasters []models.CourseMaster
	courseMasterMap := make(map[int64]models.CourseMaster)
	if len(courseMasterIDs) > 0 {
		db.DB.Where("id IN ?", courseMasterIDs).Find(&courseMasters)
		for _, cm := range courseMasters {
			courseMasterMap[cm.ID] = cm
		}
	}

	// 5. Fetch Teachers and Users
	var teachers []models.Teacher
	teacherUUIDs := make([]string, 0)
	teacherMap := make(map[int64]models.Teacher)
	if len(teacherIDs) > 0 {
		db.DB.Where("id IN ?", teacherIDs).Find(&teachers)
		for _, t := range teachers {
			teacherMap[t.ID] = t
			if t.TeacherID != nil {
				teacherUUIDs = append(teacherUUIDs, t.TeacherID.String())
			}
		}
	}

	var users []models.User
	userMap := make(map[string]models.User) // Key as stringUUID
	if len(teacherUUIDs) > 0 {
		db.DB.Where("uuid IN ?", teacherUUIDs).Find(&users)
		for _, u := range users {
			userMap[u.UUID.String()] = u
		}
	}

	// 6. Fetch TimetableMasters (for sessions)
	var ttMasters []models.TimetableMaster
	if err := db.DB.Where("teacher_course_id IN ?", teacherCourseIDs).Find(&ttMasters).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch timetable masters"})
	}

	// Filter relevant Masters based on Batch
	relevantMasterIDs := make([]int64, 0)
	masterMap := make(map[int64]models.TimetableMaster)

	for _, m := range ttMasters {
		if m.TeacherCourseID == nil {
			continue
		}
		tcID := *m.TeacherCourseID
		studentInfo, ok := studentTTMap[tcID]
		if !ok {
			continue
		}

		// Logic:
		// If NOT batched -> Include
		// If Batched -> Include ONLY if m.Batch == studentInfo.Batch
		if !m.IsBatched || (m.IsBatched && m.Batch == studentInfo.Batch) {
			relevantMasterIDs = append(relevantMasterIDs, m.ID)
			masterMap[m.ID] = m
		}
	}

	// 7. Fetch TimetableAllotments
	var allotments []models.TimetableAllotment
	if len(relevantMasterIDs) > 0 {
		db.DB.Where("teacher_course_period_id IN ?", relevantMasterIDs).Find(&allotments)
	}

	// 8. Fetch Sessions and Venues
	sessionIDs := make([]int64, 0)
	venueIDs := make([]int64, 0)
	for _, a := range allotments {
		if a.SessionID != nil {
			sessionIDs = append(sessionIDs, *a.SessionID)
		}
		venueIDs = append(venueIDs, a.VenueID)
	}

	var sessions []models.Session
	sessionMap := make(map[int64]models.Session)
	if len(sessionIDs) > 0 {
		db.DB.Where("id IN ?", sessionIDs).Find(&sessions)
		for _, s := range sessions {
			sessionMap[s.ID] = s
		}
	}

	var rooms []models.Room
	roomMap := make(map[int64]models.Room)
	if len(venueIDs) > 0 {
		// Only fetch fields needed? GORM will fetch all unless Selected.
		// For simplicity and to avoid missing fields if struct changes, fetch standard.
		// Or use Select for optimization if desired.
		db.DB.Where("id IN ?", venueIDs).Find(&rooms)
		for _, r := range rooms {
			roomMap[r.ID] = r
		}
	}

	// 9. Construct Response
	// Group allotments by TeacherCourseID
	// We need to map Allotment -> Master -> TeacherCourseID
	allotmentsByTC := make(map[int64][]models.TimetableAllotment)
	for _, a := range allotments {
		master, ok := masterMap[a.TeacherCoursePeriodID]
		if ok && master.TeacherCourseID != nil {
			allotmentsByTC[*master.TeacherCourseID] = append(allotmentsByTC[*master.TeacherCourseID], a)
		}
	}

	responseData := []fiber.Map{}

	for _, tcID := range teacherCourseIDs {
		// Get Details
		tc, ok := tcMap[tcID]
		if !ok {
			continue
		}

		teacherName := "Unknown"
		if tc.TeacherID != nil {
			teacher, tOk := teacherMap[*tc.TeacherID]
			if tOk && teacher.TeacherID != nil {
				u, uOk := userMap[teacher.TeacherID.String()]
				if uOk {
					teacherName = fmt.Sprintf("%s %s", u.FirstName, u.LastName)
				}
			}
		}

		courseCode := "Unknown"
		if tc.CourseID != nil {
			c, cOk := courseMap[*tc.CourseID]
			if cOk {
				cm, cmOk := courseMasterMap[c.CourseMasterID]
				if cmOk {
					courseCode = cm.CourseID
				}
			}
		}

		// Sessions
		sessionList := []fiber.Map{}
		tcAllotments := allotmentsByTC[tcID]

		for _, a := range tcAllotments {
			master := masterMap[a.TeacherCoursePeriodID] // Should exist

			sObj := fiber.Map{
				"id":                    a.ID,
				"teacher_course_period": a.TeacherCoursePeriodID,
				"day":                   a.Day,
				"session_name":          a.SessionName,
				"batch":                 master.Batch,
				"is_lab":                master.IsLab,
				"is_batched":            master.IsBatched,
			}

			// Session Details
			if a.SessionID != nil {
				sess, sOk := sessionMap[*a.SessionID]
				if sOk {
					sObj["session"] = fiber.Map{
						"id":          sess.ID,
						"name":        sess.Name,
						"start_time":  sess.StartTime,
						"end_time":    sess.EndTime,
						"is_lab_time": sess.IsLabTime,
					}
				} else {
					sObj["session"] = nil
				}
			} else {
				sObj["session"] = nil
			}

			// Venue - Restricted Fields as requested
			room, rOk := roomMap[a.VenueID]
			if rOk {
				sObj["venue"] = fiber.Map{
					"id":          room.ID,
					"room_number": room.RoomNumber,
					"block":       room.Block,
				}
			} else {
				sObj["venue"] = nil
			}

			sessionList = append(sessionList, sObj)
		}

		responseData = append(responseData, fiber.Map{
			"teacher_course_id": tcID,
			"teacher_name":      teacherName,
			"course_code":       courseCode,
			"sessions":          sessionList,
			"is_do_more":        false,
		})
	}

	return c.JSON(responseData)
}

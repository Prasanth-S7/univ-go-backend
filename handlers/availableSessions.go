package handlers

import (
	"github.com/Prasanth-S7/univ-go-backend/db"
	"github.com/Prasanth-S7/univ-go-backend/models"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) AvailableSessionsHandler(c *fiber.Ctx) error {
	teacher_course_id := c.Params("teacher_course_id")
	if teacher_course_id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Session ID (Teacher Course ID) is required"})
	}

	// 1. Fetch ALL TimetableMasters for this TeacherCourseID
	var masters []models.TimetableMaster
	if err := db.DB.Select("id, is_lab, is_batched, batch, group_index, student_count").Where("teacher_course_id = ?", teacher_course_id).Find(&masters).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch timetable masters"})
	}

	if len(masters) == 0 {
		return c.JSON(fiber.Map{
			"theory_sessions": []fiber.Map{},
			"lab_sessions":    []fiber.Map{},
			"timetable_meta":  []fiber.Map{},
		})
	}

	// 2. Collect Master IDs
	masterIDs := make([]int64, len(masters))
	for i, m := range masters {
		masterIDs[i] = m.ID
	}

	// 3. Fetch ALL Allotments for these Masters
	var allotments []models.TimetableAllotment
	if err := db.DB.Where("teacher_course_period_id IN ?", masterIDs).Find(&allotments).Error; err != nil {
		// Log error but proceed with empty allotments
		allotments = []models.TimetableAllotment{}
	}

	// 4. Collect Session IDs and Venue IDs
	sessionIDs := make([]int64, 0, len(allotments))
	venueIDs := make([]int64, 0, len(allotments))
	for _, a := range allotments {
		if a.SessionID != nil {
			sessionIDs = append(sessionIDs, *a.SessionID)
		}
		venueIDs = append(venueIDs, a.VenueID)
	}

	// 5. Fetch Sessions (Batch)
	sessionMap := make(map[int64]models.Session)
	if len(sessionIDs) > 0 {
		var sessions []models.Session
		db.DB.Where("id IN ?", sessionIDs).Find(&sessions)
		for _, s := range sessions {
			sessionMap[s.ID] = s
		}
	}

	// 6. Fetch Venues (Rooms) (Batch)
	roomMap := make(map[int64]models.Room)
	deptIDs := make([]int64, 0)
	if len(venueIDs) > 0 {
		var rooms []models.Room
		db.DB.Select("id, block, room_number, description, maintained_by_id_id, is_lab, room_type, room_min_cap, room_max_cap, has_projector, has_ac, tech_level").Where("id IN ?", venueIDs).Find(&rooms)
		for _, r := range rooms {
			roomMap[r.ID] = r
			if r.MaintainedByID != nil {
				deptIDs = append(deptIDs, *r.MaintainedByID)
			}
		}
	}

	// 7. Fetch Departments (Batch)
	deptMap := make(map[int64]models.Department)
	if len(deptIDs) > 0 {
		var depts []models.Department
		db.DB.Where("id IN ?", deptIDs).Find(&depts)
		for _, d := range depts {
			deptMap[d.ID] = d
		}
	}

	// Helper to format Venue Map
	getVenueMap := func(venueID int64) fiber.Map {
		room, exists := roomMap[venueID]
		if !exists {
			return nil
		}
		return fiber.Map{
			"id":          room.ID,
			"room_number": room.RoomNumber,
			"block":       room.Block,
			"is_lab":      room.IsLab,
		}
	}

	// heavy work is being done here
	// Somehow need to optimse this

	/*
		Right now what's happening here to fetch the available slots is
		1. Counting the number of students for a teacher course id from studentTimetable table (nearly 25000 rows)
		2. Subtracting the number of students from the student count

		So if 5 subjects is there, the number of db queries it has to make is 5
		In 1 sec if 200 requests are made, it has to make 1000 db queries (5 * 25000 * 200 row scans)
	*/

	getSlotAvailability := func(id string, studentCount int, batch string) int {
		var studentTimetable []models.StudentTimetable

		if batch == "theory" {
			if err := db.DB.Where("teacher_course_id_id = ? AND status = 'confirmed'", id).Find(&studentTimetable).Error; err != nil {
				return 0
			}
			return studentCount - len(studentTimetable)
		} else {
			if err := db.DB.Where("teacher_course_id_id = ? AND status = 'confirmed' AND batch = ?", id, batch).Find(&studentTimetable).Error; err != nil {
				return 0
			}
			return studentCount - len(studentTimetable)
		}
	}

	// Group allotments by MasterID for efficient lookup
	allotmentsByMaster := make(map[int64][]models.TimetableAllotment)
	for _, a := range allotments {
		allotmentsByMaster[a.TeacherCoursePeriodID] = append(allotmentsByMaster[a.TeacherCoursePeriodID], a)
	}

	theorySessions := []fiber.Map{}
	labSessions := []fiber.Map{}
	timetableMeta := []fiber.Map{}

	// 8. Iterate over masters and construct response
	for _, m := range masters {
		// Meta info
		batch := m.Batch
		if batch == "" {
			batch = "theory"
		}
		timetableMeta = append(timetableMeta, fiber.Map{
			"id":             m.ID,
			"is_lab":         m.IsLab,
			"is_batched":     m.IsBatched,
			"batch":          batch,
			"slot_available": getSlotAvailability(teacher_course_id, m.StudentCount, batch),
			"is_available":   true,
		})

		// Get allotments for this master
		masterAllotments := allotmentsByMaster[m.ID]

		for _, allotment := range masterAllotments {
			sessionData := fiber.Map{
				"id":                    allotment.ID,
				"teacher_course_period": allotment.TeacherCoursePeriodID,
				"day":                   allotment.Day,
				"venue":                 getVenueMap(allotment.VenueID),
				"session_name":          allotment.SessionName,
			}

			// Add Session Info if valid session ID
			if allotment.SessionID != nil {
				if sess, ok := sessionMap[*allotment.SessionID]; ok {
					sessionData["session"] = fiber.Map{
						"id":          sess.ID,
						"name":        sess.Name,
						"start_time":  sess.StartTime,
						"end_time":    sess.EndTime,
						"is_lab_time": sess.IsLabTime,
					}
				}
			} else {
				sessionData["session"] = nil
			}

			if !m.IsLab {
				// THEORY
				theorySessions = append(theorySessions, fiber.Map{
					"timetable_master_info": fiber.Map{
						"id":           m.ID,
						"session_name": allotment.SessionName,
						"group_index":  m.GroupIndex,
					},
					"session_data": sessionData,
				})
			} else {
				// LAB
				found := false
				for i, ls := range labSessions {
					if ls["batch_key"] == m.Batch {
						currentSessions := ls["sessions"].([]fiber.Map)
						ls["sessions"] = append(currentSessions, sessionData)
						labSessions[i] = ls
						found = true
						break
					}
				}
				if !found {
					batchGrouping := fiber.Map{
						"batch_key": m.Batch,
						"batch_info": fiber.Map{
							"batch_name":    m.Batch,
							"is_batched":    m.IsBatched,
							"group_index":   m.GroupIndex,
							"student_count": m.StudentCount,
							"session_name":  allotment.SessionName,
						},
						"sessions": []fiber.Map{sessionData},
					}
					labSessions = append(labSessions, batchGrouping)
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"theory_sessions": theorySessions,
		"lab_sessions":    labSessions,
		"timetable_meta":  timetableMeta,
	})
}

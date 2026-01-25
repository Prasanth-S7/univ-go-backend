import { useQueryData } from "@/hooks/useQueryData";
import { studentCourseApi } from "@/services/api";
import { useQuery } from '@tanstack/react-query';
import { toast } from "sonner";
import api from "./api";

interface UseGetAvailableTeachersProps {
  selectedCourse: { id: number } | null;
}

export const useGetAvailableTeachers = ({ selectedCourse }: UseGetAvailableTeachersProps) => {
  return useQueryData<any>(
    ["available-teachers", selectedCourse?.id],
    async () => {
      if (!selectedCourse) return [];

      try {
        const response: any = await studentCourseApi.getAvailableTeachers(selectedCourse.id.toString());

        const teachersData = Array.isArray(response.data)
          ? response.data
          : response.data?.results && Array.isArray(response.data.results)
          ? response.data.results
          : [];

        if (teachersData.length === 0) {
          // console.warn("No teachers found for course:", selectedCourse.id);
          toast.warning("No teachers available for this course");
          return [];
        }

        const parsedData = teachersData.map((teacher: any) => ({
          id: teacher.id || teacher.teacher_id?.id,
          name:
            teacher.teacher_name ||
            teacher.name ||
            teacher.full_name ||
            (teacher.teacher_id
              ? `${teacher.teacher_id.first_name || ""} ${teacher.teacher_id.last_name || ""}`.trim()
              : "") ||
            teacher.staff_code ||
            "Unknown Teacher",
          department:
            teacher.dept_name ||
            teacher.dept_id?.dept_name ||
            teacher.department ||
            "",
          staff_code: teacher.staff_code || "",
          available_slots: teacher.available_slots || [],
          student_count: teacher.student_count || 0,
          current_students: teacher.current_students || 0,
          is_full: teacher.current_students >= teacher.student_count,
          teacher_course_id: teacher.id || null,
          raw_data: {
            dept_id: teacher.dept_id,
            teacher_id: teacher.teacher_id || teacher.id,
            status: teacher.status,
            expertise: teacher.expertise || teacher.teacher_specialisation,
            courses: teacher.courses,
            student_count: teacher.student_count,
            current_students: teacher.current_students,
          },
        }));
        // console.log("Parsed teachers data with enrollment info:", {
        //   count: parsedData.length,
        //   parsedData
        // });
        return parsedData;
      } catch (error: any) {
        // console.error("Error fetching teachers:", {
        //   error,
        //   response: error.response,
        //   request: error.request,
        //   config: error.config,
        // });

        if (error.response?.status === 401) {
          toast.error("Please log in again to view available teachers");
        } else if (error.response?.status === 403) {
          toast.error("You do not have permission to view teachers for this course");
        } else if (error.response?.data?.detail) {
          toast.error(error.response.data.detail);
        } else {
          toast.error("Failed to load teachers. Please try again.");
        }

        throw error;
      }
    }
  );
};

interface Session {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface TeacherCourse {
  id: number;
  course: any; // replace with appropriate type
  teacher: any; // replace with appropriate type
  sessions: Session[];
}

/**
 * @deprecated Use useFetchAllTeacherSessions instead to avoid duplicate API calls
 */
export const useFetchTeacherCourses = (
  selectedTeacher?: any,
  selectedCourse?: any
) => {
  return useQuery<TeacherCourse[]>({
    queryKey: ['teacher-courses', selectedTeacher?.id, selectedCourse?.id],
    queryFn: async () => {
      if (!selectedTeacher || !selectedCourse) return [];

      // console.warn('useFetchTeacherCourses is deprecated. Please use useFetchAllTeacherSessions instead to avoid duplicate API calls.');

      try {
        const response = await api.get(`/api/timetable/sessions/${selectedTeacher.teacher_course_id}/`);

        const sessionsData: Session[] = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
          ? response.data.results
          : [];

        if (sessionsData.length === 0) {
          toast.warning('No available time slots for this teacher and course');
          return [];
        }

        return [
          {
            id: selectedTeacher.id,
            course: selectedCourse,
            teacher: selectedTeacher,
            sessions: sessionsData,
          },
        ];
      } catch (error) {
        // console.error("Error fetching teacher-course sessions:", error);
        return [];
      }
    },
    enabled: !!selectedTeacher && !!selectedCourse,
  });
};

/**
 * Hook to fetch sessions for all teachers in a course in a single batch
 */
export const useFetchAllTeacherSessions = (
  teachers: any[] = [],
  selectedCourse?: any
) => {
  return useQuery<Record<number, any>>({
    queryKey: ['all-teacher-sessions', selectedCourse?.id, teachers.map(t => t.id).join(',')],
    queryFn: async () => {
      if (!selectedCourse || teachers.length === 0) return {};

      try {
        // Create an object to store sessions by teacher ID
        const sessionsByTeacherId: Record<number, any> = {};
        
        // Use Promise.all to make requests in parallel
        await Promise.all(
          teachers.map(teacher => 
            api.get(`/api/timetable/sessions/${teacher.teacher_course_id}/`)
              .then(response => {
                // The new API returns the grouped structure directly
                const responseData = response.data;
                
                // Store the complete response data for this teacher
                sessionsByTeacherId[teacher.id] = responseData;
                return { teacherId: teacher.id, data: responseData };
              })
              .catch(error => {
                // console.error(`Error fetching sessions for teacher ${teacher.id}:`, error);
                sessionsByTeacherId[teacher.id] = {
                  theory_sessions: [],
                  lab_sessions: [],
                  timetable_meta: []
                };
                return { teacherId: teacher.id, data: null };
              })
          )
        );

        // console.log("Fetched all teacher sessions (new format):", sessionsByTeacherId);
        return sessionsByTeacherId;
      } catch (error) {
        // console.error("Error fetching all teacher sessions:", error);
        return {};
      }
    },
    enabled: selectedCourse != null && teachers.length > 0,
  });
};
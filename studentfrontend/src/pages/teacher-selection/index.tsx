import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  AlertCircle,
  BookOpen,
  Users,
  Bookmark,
  GraduationCap,
  Building,
  Trash2,
  Plus,
  Loader2,
  Clock,
  FlaskConical,
  Monitor,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeTableGrid } from "./timetableGrid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetAvailableCourses } from "@/action/course";
import { useGetAvailableTeachers } from "@/action/teacher";
import { useFetchAllTeacherSessions } from "@/action/teacher";
import { useSaveStudentTimetable, useBookingStatus } from "@/action/timetable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStudentTimetableStatus } from "@/action/timetable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudentTimetableData } from "@/action/timetable";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { ConnectionStatusBadge } from "@/components/ui/connection-status-badge";
import ReactGa from 'react-ga4';
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";
import { createSocket } from "@/lib/wsClient";
import { formatRelativeTime } from "@/utils/time";
import { formatAvailabilityKey, isValidAvailabilityKey } from "@/utils/availability";

interface Course {
  id: number;
  course_id: number;
  course_semester: number;
  course_year: number;
  elective_type: string;
  for_dept_id: number;
  teaching_dept_id: number;
  lab_type: string;
  need_assist_teacher: boolean;
  teaching_status: string;
  course_name?: string;
  course_code?: string;
  dept_name?: string;
  // New fields for Do More courses
  is_do_more?: boolean;
  is_mandatory?: boolean;
  sessions?: Array<{
    id: number;
    session_name: string;
    day: string;
    start_time: string;
    end_time: string;
    student_count: number;
    available_slots: number;
    is_available: boolean;
  }>;
}

interface Teacher {
  id: number;
  name: string;
  department: string;
  staff_code?: string;
  teacher_name?: string;
  dept_id?: number;
  student_count?: number;
  current_students?: number;
  is_full?: boolean;
  teacher_course_id?: number;
}

interface Session {
  id: number;
  name?: string;
  day: string;
  start_time: string;
  end_time: string;
  location?: string;
  raw_data?: any;
  is_lab?: boolean;
  is_batched?: boolean;
  batch?: string;
  slot_available?: number;
  is_available?: boolean;
}

// New interfaces for the updated API response
interface TheorySession {
  timetable_master_info: {
    id: number;
    session_name: string;
    group_name: string;
    group_index: number;
    version: string;
  };
  session_data: {
    id: number;
    session: {
      id: number;
      name: string;
      start_time: string;
      end_time: string;
      is_lab_time: boolean;
    };
    venue: {
      id: number;
      room_number: string;
      block: string;
      description: string;
      is_lab: boolean;
      room_type: string;
      room_min_cap: number;
      room_max_cap: number;
    };
    day: string;
    teacher_course_period: number;
  };
}

interface LabSession {
  batch_key: string;
  batch_info: {
    batch_name: string;
    is_batched: boolean;
    group_name: string;
    group_index: number;
    student_count: number;
    session_name: string;
  };
  sessions: Array<{
    id: number;
    session: {
      id: number;
      name: string;
      start_time: string;
      end_time: string;
      is_lab_time: boolean;
    };
    venue: {
      id: number;
      room_number: string;
      block: string;
      description: string;
      is_lab: boolean;
      room_type: string;
      room_min_cap: number;
      room_max_cap: number;
    };
    day: string;
    teacher_course_period: number;
  }>;
}

interface TimetableMeta {
  id: number;
  version: string;
  is_lab: boolean;
  is_batched: boolean;
  batch: string;
  slot_available: number;
  is_available: boolean;
}

type StatusEventType = "queued" | "processing" | "success" | "rejected" | "error";

interface StatusEventPayload {
  event: StatusEventType;
  request_id?: string;
  queued_at?: string;
  timestamp?: string;
  selection_count?: number;
  total_confirmed?: number;
  confirmed_bookings?: Array<Record<string, unknown>>;
  errors?: string[];
  reason?: string;
}

interface AvailabilityUpdatePayload {
  event: string;
  updated_at?: string;
  teacher_courses?: Array<{
    teacher_course_id: number;
    batch: string;
    available_slots: number;
    student_count: number;
    is_lab?: boolean;
  }>;
}

interface TeacherSessionsResponse {
  theory_sessions: TheorySession[];
  lab_sessions: LabSession[];
  timetable_meta: TimetableMeta[];
}

interface CourseSelection {
  id?: number;
  course_id: number;
  teacher_id: number;
  teacher_course_id?: number;
  course?: Course;
  teacher?: Teacher;
  sessions?: Session[];
  day?: string;
  startTime?: string;
  endTime?: string;
  batch?: string;
  sessionIds?: number[];
  // New fields for the updated structure
  theorySessions?: TheorySession[];
  labSessions?: LabSession[];
  selectedLabBatch?: string;
}

interface TeacherCourse {
  id: number;
  course: Course;
  teacher: Teacher;
  sessions: Session[];
}

// Interface for existing timetable data
interface TimetableData {
  teacher_course_id: number;
  course_code: string;
  sessions: {
    id: number;
    session: {
      id: number;
      name: string;
      start_time: string;
      end_time: string;
      is_lab_time: boolean;
    };
    venue: {
      id: number;
      room_number: string;
      block: string;
      description: string;
      is_lab: boolean;
      room_type: string;
      room_min_cap: number;
      room_max_cap: number;
    };
    day: string;
    teacher_course_period: number;
    batch?: string;
    is_lab?: boolean;
    is_batched?: boolean;
  }[];
  is_do_more: boolean;
  do_more_name?: string;
  do_more_session_name?: string;
}

export default function CourseSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: isLoginAllowed } = useAllowedLoginStatus();

  useEffect(() => {
    if (isLoginAllowed === false) {
      clearAuthCookies();
      window.location.href = "/auth/login?reason=not-allowed";
    }
  }, [isLoginAllowed]);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [mySelections, setMySelections] = useState<CourseSelection[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedDoMoreSession, setSelectedDoMoreSession] = useState<number | null>(null);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [queueDialogData, setQueueDialogData] = useState<{ title: string, message: string } | null>(null);
  const [isOkButtonDisabled, setIsOkButtonDisabled] = useState(false);

  const [checkStatusEnabled, setCheckStatusEnabled] = useState(false);
  const [bookingSubmittedAt, setBookingSubmittedAt] = useState<number | null>(null);

  const [dialogShakeAnimation, setDialogShakeAnimation] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);

  const handleQueueDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // Always prevent dismissal - only OK button can close the dialog
      // Trigger shake animation to provide visual feedback
      setDialogShakeAnimation(true);
      setTimeout(() => setDialogShakeAnimation(false), 2000);
      return;
    } else {
      setShowQueueDialog(true);
    }
  }, []);



  useEffect(() => {
    ReactGa.send({
      hitType: "Teacher Selection Page",
      page: "/teacher-selection",
      title: "Teacher Selection App",
    });

    // Mark initial render as complete after a short delay
    const timer = setTimeout(() => {
      setIsInitialRender(false);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Enable "Check Status" button after 5 seconds of booking submission
  useEffect(() => {
    if (bookingSubmittedAt) {
      const timer = setTimeout(() => {
        setCheckStatusEnabled(true);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [bookingSubmittedAt]);

  const { data: bookingStatus, refetch: refetchBookingStatus } = useBookingStatus(checkStatusEnabled);

  const {
    data: timetableData,
    isLoading: isLoadingTimetableData,
    error: timetableError,
    refetch: refetchTimetableData,
  } = useStudentTimetableData();


  const {
    data: studentTimetableStatus,
    isLoading: isLoadingStudentTimetableStatus,
    refetch: refetchStudentTimetableStatus,
  } = useStudentTimetableStatus();

  // Handle booking status updates
  useEffect(() => {
    if (bookingStatus && !bookingStatus.pending) {
      // Processing is complete
      setIsOkButtonDisabled(false);
      setCheckStatusEnabled(false);

      if (bookingStatus.confirmed && bookingStatus.confirmed.length > 0) {
        // Refresh timetable data
        refetchTimetableData();
        refetchStudentTimetableStatus();
      }
    }
  }, [bookingStatus, refetchTimetableData, refetchStudentTimetableStatus]);

  // Fetch available courses
  const { data: courses = [], isPending: isLoadingCourses } =
    useGetAvailableCourses();

  // Fetch teachers for selected course (only for regular courses)
  const { data: teachers = [], isPending: isLoadingTeachers } =
    useGetAvailableTeachers({
      selectedCourse: selectedCourse && !selectedCourse.is_do_more ? selectedCourse : null
    });

  const teacherMap = useMemo(() => {
    const map = new Map<number, Teacher>();
    (teachers || []).forEach((teacher: Teacher) => {
      map.set(teacher.id, teacher);
    });
    return map;
  }, [teachers]);

  const getTeacherCourseId = useCallback(
    (teacherId: number) => teacherMap.get(teacherId)?.teacher_course_id,
    [teacherMap]
  );

  // Fetch all teacher sessions in one batch when teachers are loaded
  const { data: allTeacherSessions = {}, isLoading: isLoadingAllTeacherSessions } =
    useFetchAllTeacherSessions(teachers, selectedCourse);

  const { mutate: saveTimetable, isPending: isSavingTimetable } =
    useSaveStudentTimetable();

  const availabilityPath = studentTimetableStatus?.student?.availability_ws_path ?? null;

  // Define isTimetableConfirmed early so it can be used in the WebSocket useEffect
  const isTimetableConfirmed = studentTimetableStatus?.all_selected;

  // Availability WebSocket Connection - REMOVED

  // Availability WebSocket Connection - REMOVED


  // Get course selection status from the API
  const courseSelectionStatus = studentTimetableStatus?.courses || [];

  // Combine courses from available_courses API with selection status
  const combinedCourseData = useMemo(() => {
    if (!courses || courses.length === 0) return [];

    return courses.map((course: any) => {
      // Find if this course is already selected in the timetable status
      const selectionStatus = courseSelectionStatus.find((c: any) => c.course_id === course.id);

      return {
        course_id: course.id,
        course_name: course.course_name,
        course_code: course.course_code,
        selected: selectionStatus?.selected || false,
        is_do_more: course.is_do_more || false,
        is_mandatory: course.is_mandatory || false,
        sessions: course.sessions || [],
      };
    });
  }, [courses, courseSelectionStatus]);

  // Get selected and unselected courses
  const selectedCourseIds = combinedCourseData.filter((c: any) => c.selected).map((c: any) => c.course_id);
  const unselectedCourses = combinedCourseData.filter((c: any) => !c.selected);

  useEffect(() => {
    // Fetch timetable data if any courses are selected
    if (selectedCourseIds.length > 0) {
      refetchTimetableData();
    }
  }, [selectedCourseIds, refetchTimetableData]);

  // Helper function to extract possible semester and year from course code
  const extractSemesterAndYear = (courseCode: string) => {
    const yearMatch = courseCode.match(/^[A-Z]{2}(\d)/);
    const semesterMatch = courseCode.match(/^[A-Z]{2}\d(\d)/);

    return {
      year: yearMatch ? parseInt(yearMatch[1]) : null,
      semester: semesterMatch ? parseInt(semesterMatch[1]) : null
    };
  };

  // Transform existing timetable data to the format expected by TimeTableGrid
  const existingTimetableEntries = useMemo(() => {
    if (!timetableData || !Array.isArray(timetableData)) {
      return [];
    }

    return timetableData.flatMap((item: TimetableData) => {
      const { year, semester } = extractSemesterAndYear(item.course_code);

      // Handle Do More courses
      if (item.is_do_more) {
        return item.sessions.map((session) => ({
          courseId: item.teacher_course_id,
          selectionId: item.teacher_course_id,
          courseCode: item.course_code,
          courseName: item.do_more_name || item.course_code,
          teacherName: "Do More Course",
          day: session.day,
          startTime: session.session.start_time,
          endTime: session.session.end_time,
          location: "Do More Session",
          sessionName: item.do_more_session_name || session.session.name,
          hasClash: false,
          year: year,
          semester: semester,
          is_lab: false,
          is_batched: false,
          isDoMore: true,
        }));
      }

      // Handle regular courses
      return item.sessions.map((session) => ({
        courseId: item.teacher_course_id,
        selectionId: item.teacher_course_id,
        courseCode: item.course_code,
        courseName: item.course_code,
        teacherName: "",
        day: session.day,
        startTime: session.session.start_time,
        endTime: session.session.end_time,
        location: `${session.venue.room_number} (${session.venue.block})`,
        sessionName: session.session.name,
        hasClash: false,
        year: year,
        semester: semester,
        is_lab: session.is_lab ?? session.session.is_lab_time,
        is_batched: session.is_batched ?? ((session.is_lab ?? session.session.is_lab_time) && !!session.batch),
        batch: session.batch,
        isDoMore: false,
      }));
    });
  }, [timetableData]);

  // Helper: Get session groups for selected teacher from new API structure
  const getSessionGroups = (teacherId: number) => {
    const teacherData = allTeacherSessions[teacherId];
    if (!teacherData) return { theorySessions: [], labSessions: [], timetableMeta: [], hasLab: false, hasTheory: false };

    const theorySessions = teacherData.theory_sessions || [];
    const labSessions = teacherData.lab_sessions || [];
    const timetableMeta = teacherData.timetable_meta || [];

    return {
      theorySessions,
      labSessions,
      timetableMeta,
      hasLab: labSessions.length > 0,
      hasTheory: theorySessions.length > 0
    };
  };

  const resolveSlotInfo = useCallback(
    (teacherId: number, batch: string, meta?: TimetableMeta) => {
      const teacherCourseId = getTeacherCourseId(teacherId);

      if (!teacherCourseId) {
        // No teacher course ID, fall back to static metadata
        const slots = meta?.slot_available ?? 0;
        const available = meta?.is_available ?? slots > 0;
        const dataSource = meta?.slot_available !== undefined ? 'static' : 'default';

        // Log resolveSlotInfo call
        console.log('[ResolveSlotInfo] Lookup:', {
          teacherId,
          batch,
          lookupKey: 'N/A (no teacher course ID)',
          liveDataFound: false,
          liveSlots: null,
          staticSlots: meta?.slot_available ?? null,
          finalSlots: slots,
          dataSource,
        });

        return { slots, available, dataSource };
      }

      // Fall back to static metadata or default
      const slots = meta?.slot_available ?? 0;
      const available = meta?.is_available ?? slots > 0;
      const dataSource = meta?.slot_available !== undefined ? 'static' : 'default';

      return { slots, available, dataSource };
    },
    [teacherMap]
  );

  // Helper: Convert new session structure to old format for compatibility
  const convertSessionsToOldFormat = (theorySessions: TheorySession[], labSessions: LabSession[], selectedLabBatch?: string) => {
    const sessions: Session[] = [];

    // Add theory sessions
    theorySessions.forEach(ts => {
      sessions.push({
        id: ts.session_data.id,
        name: ts.session_data.session.name,
        day: ts.session_data.day,
        start_time: ts.session_data.session.start_time,
        end_time: ts.session_data.session.end_time,
        location: `${ts.session_data.venue.room_number} (${ts.session_data.venue.block})`,
        is_lab: false,
        is_batched: false,
        batch: undefined,
        raw_data: ts
      });
    });

    // Add lab sessions
    labSessions.forEach(ls => {
      // For non-batched labs, always include them
      // For batched labs, only include if selected batch matches or no batch is selected
      if (ls.batch_key === 'no-batch' || !selectedLabBatch || ls.batch_key === selectedLabBatch) {
        ls.sessions.forEach(session => {
          sessions.push({
            id: session.id,
            name: session.session.name,
            day: session.day,
            start_time: session.session.start_time,
            end_time: session.session.end_time,
            location: `${session.venue.room_number} (${session.venue.block})`,
            is_lab: true,
            is_batched: ls.batch_info.is_batched,
            batch: ls.batch_key === 'no-batch' ? undefined : ls.batch_key,
            raw_data: ls // Use the lab session container instead of individual session
          });
        });
      }
    });

    return sessions;
  };

  // Helper: Extract group index from a session
  const getSessionGroupIndex = (session: Session): number | undefined => {
    if (session.raw_data) {
      // For theory sessions
      if (session.raw_data.timetable_master_info?.group_index !== undefined) {
        return session.raw_data.timetable_master_info.group_index;
      }
      // For lab sessions - the raw_data is now the lab session container
      if (session.raw_data.batch_info?.group_index !== undefined) {
        return session.raw_data.batch_info.group_index;
      }
    }
    return undefined;
  };

  // Handler for selecting a course
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedTeacher(null);
    setSelectedDoMoreSession(null);
  };

  // Handler for selecting a teacher (reset batch selection)
  const handleSelectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSelectedBatch(null);
  };

  // Helper function to check for group-based conflicts
  // This function implements sophisticated group index conflict checking that:
  // 1. Allows selecting teachers with different group indexes even if they have the same course
  // 2. Handles theory vs lab batch conflicts properly by only checking conflicts for the selected batch
  // 3. Prevents conflicts between teachers with the same group indexes regardless of course
  // 4. Also checks conflicts with existing confirmed timetable entries based on time overlaps
  const checkGroupConflict = (teacherId: number, selectedBatch?: string) => {
    const { theorySessions, labSessions } = getSessionGroups(teacherId);

    // Get all group indexes from this teacher's sessions
    const teacherGroupIndexes = new Set<number>();

    // Add theory session group indexes (always included)
    theorySessions.forEach(ts => {
      const groupIndex = ts.timetable_master_info?.group_index;
      if (groupIndex !== undefined && groupIndex !== null) {
        teacherGroupIndexes.add(groupIndex);
      }
    });

    // Add lab session group indexes (only for the selected batch if specified)
    // This is crucial for allowing different lab batches to have different group indexes
    labSessions.forEach(ls => {
      const groupIndex = ls.batch_info?.group_index;
      if (groupIndex !== undefined && groupIndex !== null) {
        // If a specific batch is selected, only check conflicts for that batch
        if (selectedBatch) {
          if (ls.batch_key === selectedBatch) {
            teacherGroupIndexes.add(groupIndex);
          }
        } else {
          // If no batch is selected, include all lab group indexes (conservative approach)
          teacherGroupIndexes.add(groupIndex);
        }
      }
    });

    // Check if any existing selection has the same group indexes
    for (const selection of mySelections) {
      const selectionGroupIndexes = new Set<number>();

      // Add theory session group indexes from selection
      selection.theorySessions?.forEach(ts => {
        const groupIndex = ts.timetable_master_info?.group_index;
        if (groupIndex !== undefined && groupIndex !== null) {
          selectionGroupIndexes.add(groupIndex);
        }
      });

      // Add lab session group indexes from selection (only for the batch that was actually selected)
      selection.labSessions?.forEach(ls => {
        const groupIndex = ls.batch_info?.group_index;
        if (groupIndex !== undefined && groupIndex !== null) {
          // Only include group indexes for the batch that was actually selected
          if (selection.selectedLabBatch) {
            if (ls.batch_key === selection.selectedLabBatch) {
              selectionGroupIndexes.add(groupIndex);
            }
          } else {
            // If no specific batch was selected, include all lab group indexes (conservative approach)
            selectionGroupIndexes.add(groupIndex);
          }
        }
      });

      // Check for group index conflicts - if any group_index is shared, it's a conflict
      for (const groupIndex of teacherGroupIndexes) {
        if (selectionGroupIndexes.has(groupIndex)) {
          return true; // Conflict found
        }
      }
    }

    // Also check conflicts with existing confirmed timetable entries based on time overlaps
    const teacherSessions = convertSessionsToOldFormat(theorySessions, labSessions, selectedBatch || undefined);

    for (const teacherSession of teacherSessions) {
      for (const existingEntry of existingTimetableEntries) {
        // Check if sessions are on the same day and have time overlap
        if (teacherSession.day.toLowerCase() === existingEntry.day.toLowerCase()) {
          const teacherStart = teacherSession.start_time;
          const teacherEnd = teacherSession.end_time;
          const existingStart = existingEntry.startTime;
          const existingEnd = existingEntry.endTime;

          // Check for time overlap
          if (teacherStart < existingEnd && teacherEnd > existingStart) {
            return true; // Conflict found with existing timetable entry
          }
        }
      }
    }

    return false;
  };

  // Helper function to check if a teacher has the same course as existing selections
  const checkSameCourseConflict = (teacherId: number) => {
    const teacherData = allTeacherSessions[teacherId];
    if (!teacherData) return false;

    // Get the course ID from this teacher's data
    const teacherCourseId = teacherData.theory_sessions?.[0]?.session_data?.teacher_course_period ||
      teacherData.lab_sessions?.[0]?.sessions?.[0]?.teacher_course_period;

    if (!teacherCourseId) return false;

    // Check if any existing selection has the same course
    for (const selection of mySelections) {
      if (selection.teacher_course_id === teacherCourseId) {
        return true; // Same course conflict found
      }
    }

    return false;
  };

  // Helper function to check if a teacher has any conflicts
  const hasTeacherConflict = (teacherId: number, selectedBatch?: string) => {
    return checkGroupConflict(teacherId, selectedBatch) || checkSameCourseConflict(teacherId);
  };

  // Handler for removing a course from selections
  const handleRemoveCourse = (id: number) => {
    setMySelections(mySelections.filter((selection) => selection.id !== id));
    toast.success("Teacher removed from your selection");
  };

  // Helper function to check if a Do More session conflicts with existing selections
  const checkDoMoreSessionConflict = (session: any) => {
    // Check against in-progress selections
    const inProgressConflict = mySelections.some(selection => {
      return selection.sessions?.some(existingSession => {
        return (
          existingSession.day.toLowerCase() === session.day.toLowerCase() &&
          existingSession.start_time < session.end_time &&
          existingSession.end_time > session.start_time
        );
      });
    });

    // Check against confirmed timetable entries
    const confirmedConflict = existingTimetableEntries.some(existingEntry => {
      return (
        existingEntry.day.toLowerCase() === session.day.toLowerCase() &&
        existingEntry.startTime < session.end_time &&
        existingEntry.endTime > session.start_time
      );
    });

    return inProgressConflict || confirmedConflict;
  };

  // Helper function to detect conflicts (replaces the old clash detection)
  const detectConflicts = (entries: any[] = []) => {
    // This function is kept for compatibility but now uses group-based logic
    return [];
  };

  // Now define displayTimetableEntries after group conflict checking
  const displayTimetableEntries = useMemo(() => {
    // Skip heavy computation during initial render
    if (isInitialRender) {
      return [];
    }

    const entries: any[] = [];

    // Always show existing timetable entries for selected courses
    entries.push(...existingTimetableEntries);

    // If user has already created a timetable, don't show in-progress selections
    if (!isTimetableConfirmed) {
      // For users who haven't created a timetable yet, show their selections
      const selections = [...mySelections];

      const selectionEntries = selections.flatMap((selection) => {
        if (!selection.sessions || selection.sessions.length === 0) {
          return [];
        }

        return selection.sessions.map((session) => {
          const groupIndex = getSessionGroupIndex(session);
          return {
            courseId: selection.course_id,
            selectionId: selection.id || 0,
            courseCode: selection.course?.course_code || "",
            courseName: selection.course?.course_name || "",
            teacherName: selection.teacher?.name || "",
            day: session.day,
            startTime: session.start_time,
            endTime: session.end_time,
            location: session.location || "",
            sessionName: session.id.toString(),
            hasClash: false,
            is_lab: (session as any).is_lab ?? false,
            is_batched: (session as any).is_batched ?? false,
            batch: (session as any).batch,
            groupIndex: groupIndex,
          };
        });
      });

      entries.push(...selectionEntries);

      // Add entries from the selected teacher for preview
      if (selectedTeacher && selectedCourse) {
        const { theorySessions, labSessions } = getSessionGroups(selectedTeacher.id);
        const previewSessions = convertSessionsToOldFormat(theorySessions, labSessions, selectedBatch || undefined);

        if (previewSessions.length > 0) {
          const hasConflictWithSelection = mySelections.length > 0 ? hasTeacherConflict(selectedTeacher.id, selectedBatch || undefined) : false;
          const selectedTeacherEntries = previewSessions.map(session => {
            const groupIndex = getSessionGroupIndex(session);
            return {
              courseId: -1,
              selectionId: -1,
              courseCode: selectedCourse?.course_code || "Preview",
              courseName: selectedCourse?.course_name || "Preview",
              teacherName: selectedTeacher?.name || "",
              day: session.day,
              startTime: session.start_time,
              endTime: session.end_time,
              location: session.location || "",
              sessionName: session.id.toString(),
              hasClash: hasConflictWithSelection,
              isPreview: true,
              is_lab: (session as any).is_lab ?? false,
              is_batched: (session as any).is_batched ?? false,
              batch: (session as any).batch,
              groupIndex: groupIndex,
            };
          });
          entries.push(...selectedTeacherEntries);
        }
      }

      // Add Do More session preview when a Do More course is selected
      if (selectedCourse?.is_do_more && selectedDoMoreSession) {
        const selectedSession = selectedCourse.sessions?.find(s => s.id === selectedDoMoreSession);
        if (selectedSession) {
          // Check for time conflicts with existing selections
          const hasTimeConflict = mySelections.some(selection => {
            return selection.sessions?.some(existingSession => {
              return existingSession.day.toLowerCase() === selectedSession.day.toLowerCase() &&
                existingSession.start_time < selectedSession.end_time &&
                existingSession.end_time > selectedSession.start_time;
            });
          });

          entries.push({
            courseId: -1,
            selectionId: -1,
            courseCode: selectedCourse.course_code || "Do More Preview",
            courseName: selectedCourse.course_name || "Do More Preview",
            teacherName: "Do More Session",
            day: selectedSession.day,
            startTime: selectedSession.start_time,
            endTime: selectedSession.end_time,
            location: "Do More Session",
            sessionName: selectedSession.session_name,
            hasClash: hasTimeConflict,
            isPreview: true,
            is_lab: false,
            is_batched: false,
            isDoMore: true,
          });
        }
      }
    }

    return entries.map((entry) => ({
      ...entry,
      hasClash: entry.hasClash,
    }));
  }, [isInitialRender, mySelections, selectedTeacher, selectedCourse, selectedDoMoreSession, allTeacherSessions, selectedBatch, isTimetableConfirmed, existingTimetableEntries]);

  // Handler for adding a course to selections
  const handleAddCourse = () => {
    if (!selectedCourse) {
      toast.error("Please select a course");
      return;
    }

    // Handle Do More courses differently
    if (selectedCourse.is_do_more) {
      if (!selectedDoMoreSession) {
        toast.error("Please select a session for this Do More course");
        return;
      }

      const alreadySelected = mySelections.some(
        (selection) => selection.course_id === selectedCourse.course_id
      );

      if (alreadySelected) {
        toast.error("This Do More course is already selected");
        return;
      }

      // Find the selected session
      const selectedSession = selectedCourse.sessions?.find(s => s.id === selectedDoMoreSession);
      if (!selectedSession) {
        toast.error("Selected session not found");
        return;
      }

      // Create a Do More course selection with session information
      const newSelection: CourseSelection = {
        id: Date.now(),
        course_id: selectedCourse.course_id,
        teacher_id: -1, // Special ID for Do More courses
        course: selectedCourse,
        sessions: [{
          id: selectedSession.id,
          name: selectedSession.session_name,
          day: selectedSession.day,
          start_time: selectedSession.start_time,
          end_time: selectedSession.end_time,
          location: "Do More Session",
          is_lab: false,
          is_batched: false,
        }],
        sessionIds: [selectedSession.id],
      };

      setMySelections([...mySelections, newSelection]);
      toast.success("Do More course added to your selection!");
      setSelectedCourse(null);
      setSelectedDoMoreSession(null);
      return;
    }

    // Handle regular courses (existing logic)
    if (!selectedTeacher) {
      toast.error("Please select a course and teacher");
      return;
    }

    if (selectedTeacher.is_full) {
      toast.error("This teacher has reached maximum enrollment capacity");
      return;
    }

    const alreadySelected = mySelections.some(
      (selection) =>
        selection.course_id === selectedCourse.course_id &&
        selection.teacher_id === selectedTeacher.id
    );

    if (alreadySelected) {
      toast.error("This course-teacher combination is already selected");
      return;
    }

    const { theorySessions, labSessions, hasLab, hasTheory, timetableMeta } = getSessionGroups(selectedTeacher.id);

    // Check slot availability for the selected batch
    const selectedBatchSlots = getTeacherBatchSlots(selectedTeacher.id, selectedBatch || undefined);

    if (selectedBatchSlots <= 0) {
      toast.error("No slots available for the selected batch");
      return;
    }

    // Check if there are batched lab sessions that require batch selection
    const batchedLabSessions = labSessions.filter(ls => ls.batch_info.is_batched);
    const hasBatchedLabs = batchedLabSessions.length > 0;

    // If there are batched lab sessions, require batch selection
    if (hasBatchedLabs && !selectedBatch) {
      toast.error("Please select a batch for lab sessions");
      return;
    }

    // Check if the selected combination has conflicts
    const sessionsToAdd = convertSessionsToOldFormat(theorySessions, labSessions, selectedBatch || undefined);
    const hasConflict = hasTeacherConflict(selectedTeacher.id, selectedBatch || undefined);

    if (sessionsToAdd.length > 0) {
      if (hasConflict) {
        toast.error("This course-teacher combination conflicts with your existing selections!");
        return;
      }
    } else {
      toast.warning("No available time slots found for this teacher and course");
      return;
    }

    const newSelection: CourseSelection = {
      id: Date.now(),
      course_id: selectedCourse.course_id,
      teacher_id: selectedTeacher.id,
      teacher_course_id: selectedTeacher.teacher_course_id,
      course: selectedCourse,
      teacher: selectedTeacher,
      sessions: sessionsToAdd,
      sessionIds: sessionsToAdd.map(s => s.id),
      batch: selectedBatch || undefined,
      theorySessions,
      labSessions,
      selectedLabBatch: selectedBatch || undefined,
    };

    setMySelections([...mySelections, newSelection]);
    toast.success("Teachers added to your selection!");
    setSelectedCourse(null);
    setSelectedTeacher(null);
    setSelectedBatch(null);
  };

  // Check if the currently selected teacher has conflicts with existing selections
  const hasSelectedTeacherConflict = useMemo(() => {
    if (!selectedTeacher || !selectedCourse) return false;
    return hasTeacherConflict(selectedTeacher.id, selectedBatch || undefined);
  }, [selectedTeacher, selectedCourse, mySelections, allTeacherSessions, selectedBatch]);

  // Helper function to check if a specific teacher has conflicts
  const checkTeacherConflict = (teacherId: number, batch?: string) => {
    return hasTeacherConflict(teacherId, batch);
  };

  // Helper function to check slot availability for a teacher and batch
  const getTeacherBatchSlots = (teacherId: number, batch?: string) => {
    const { timetableMeta, labSessions, theorySessions } = getSessionGroups(teacherId);
    if (batch) {
      const meta = timetableMeta.find(m => m.batch === batch);
      return resolveSlotInfo(teacherId, batch, meta).slots;
    } else {
      // If there are no theory sessions but there are lab sessions with batch_key 'no-batch', check for 'no-batch'
      if (theorySessions.length === 0 && labSessions.length > 0) {
        const noBatchMeta = timetableMeta.find(m => m.batch === 'no-batch');
        if (noBatchMeta) return resolveSlotInfo(teacherId, 'no-batch', noBatchMeta).slots;
      }
      // Default to theory
      const theoryMeta = timetableMeta.find(m => m.batch === 'theory');
      return resolveSlotInfo(teacherId, 'theory', theoryMeta).slots;
    }
  };

  // Helper function to check if a teacher has any available non-conflicting options
  const hasTeacherAvailableOptions = (teacherId: number) => {
    // Check if there are any non-conflicting batch options for this teacher
    const { labSessions, timetableMeta } = getSessionGroups(teacherId);

    // Check theory availability
    const theoryMeta = timetableMeta.find(m => m.batch === 'theory');
    const theoryInfo = resolveSlotInfo(teacherId, 'theory', theoryMeta);
    const theorySlots = theoryInfo.slots;
    const theoryAvailable = theoryInfo.available;
    const theoryOk = !theoryAvailable || (theoryAvailable && theorySlots > 0 && !hasTeacherConflict(teacherId));

    // If no lab sessions, just check theory
    if (labSessions.length === 0) {
      return theoryOk;
    }

    // Check lab availability
    const labOptions = labSessions.map(ls => {
      const meta = timetableMeta.find(m => m.batch === ls.batch_key);
      const info = resolveSlotInfo(teacherId, ls.batch_key, meta);
      const slots = info.slots;
      const available = info.available;
      return {
        batch: ls.batch_key,
        hasSlots: available && slots > 0,
        noConflict: !hasTeacherConflict(teacherId, ls.batch_key)
      };
    });

    // Check if any lab option is available
    const hasAvailableLab = labOptions.some(option => option.hasSlots && option.noConflict);

    // For lab courses, if there are available batches but all would cause clashes, return false
    if (labSessions.length > 0) {
      const availableBatches = labOptions.filter(option => option.hasSlots);
      if (availableBatches.length > 0 && availableBatches.every(option => !option.noConflict)) {
        return false; // All available batches would cause clashes
      }
    }

    return theoryOk || hasAvailableLab;
  };

  const conflictingSelections = useMemo(() => detectConflicts(displayTimetableEntries), [displayTimetableEntries]);
  const hasConflicts = conflictingSelections.length > 0;
  const hasSelections = mySelections.length > 0;

  // Check if all required courses have a teacher selected
  const allCoursesSelected = useMemo(() => {
    if (!combinedCourseData || combinedCourseData.length === 0) return false;
    // Only consider regular (non-Do More) courses
    const regularCourses = combinedCourseData.filter((c: any) => !c.is_do_more);
    // If there are no regular courses, consider it as selected
    if (regularCourses.length === 0) return true;
    // For each regular course, it must be either already selected (confirmed in backend) or present in mySelections
    return regularCourses.every((course: any) =>
      course.selected || mySelections.some(sel => sel.course_id === course.course_id)
    );
  }, [combinedCourseData, mySelections]);

  // Get all mandatory Do More courses
  const mandatoryDoMoreCourses = useMemo(() => {
    return combinedCourseData.filter(
      (c: any) => c.is_do_more && c.is_mandatory
    );
  }, [combinedCourseData]);

  // Check if all mandatory Do More courses have a slot selected
  const allMandatoryDoMoreSelected = useMemo(() => {
    if (mandatoryDoMoreCourses.length === 0) return true;
    return mandatoryDoMoreCourses.every((course: any) =>
      mySelections.some(
        (sel) => sel.course_id === course.course_id && sel.sessions && sel.sessions.length > 0
      )
    );
  }, [mandatoryDoMoreCourses, mySelections]);

  const queueDialogTitle = queueDialogData?.title;

  // Function to save timetable to backend
  const handleSaveTimetable = () => {
    if (hasConflicts) {
      toast.error("Cannot save timetable with schedule clashes!");
      return;
    }

    if (mySelections.length === 0) {
      toast.error("Please select at least one course!");
      return;
    }


    const selectionsToSave: Array<{
      teacher_course_id: number;
      batch: string;
      is_do_more_course: boolean;
    } | {
      is_do_more_course: boolean;
      do_more_id: number;
      do_more_session_id: number | null;
    }> = [];
    mySelections.forEach(selection => {
      // Handle Do More courses
      if (selection.course?.is_do_more) {
        selectionsToSave.push({
          is_do_more_course: true,
          do_more_id: selection.course.id,
          do_more_session_id: selection.sessionIds?.[0] || null
        });
        return;
      }

      // Handle regular courses
      const { teacher_course_id, labSessions, selectedLabBatch } = selection;

      if (!teacher_course_id) return;

      // Check if this is a lab course with no-batch
      const hasNoBatchLab = labSessions?.some(ls => ls.batch_key === 'no-batch');

      if (hasNoBatchLab) {
        // For lab courses with no-batch, only send no-batch
        selectionsToSave.push({ teacher_course_id, batch: 'no-batch', is_do_more_course: false });
      } else if (selectedLabBatch) {
        // For lab courses with selected batch, send the selected batch
        selectionsToSave.push({ teacher_course_id, batch: selectedLabBatch, is_do_more_course: false });
      } else {
        // For theory-only courses, send theory
        selectionsToSave.push({ teacher_course_id, batch: 'theory', is_do_more_course: false });
      }
    });

    if (selectionsToSave.length === 0) {
      toast.error("Invalid selection, could not determine sessions to save.");
      return;
    }

    // Remove duplicate selections before sending
    const uniqueSelections = selectionsToSave.filter((selection, index, self) => {
      if (selection.is_do_more_course) {
        // For Do More courses, check by do_more_id
        return index === self.findIndex((s) =>
          s.is_do_more_course && 'do_more_id' in s && s.do_more_id === (selection as any).do_more_id
        );
      } else {
        // For regular courses, check by teacher_course_id and batch
        return index === self.findIndex((s) =>
          !s.is_do_more_course &&
          'teacher_course_id' in s && 'batch' in s &&
          s.teacher_course_id === (selection as any).teacher_course_id &&
          s.batch === (selection as any).batch
        );
      }
    });

    if (uniqueSelections.length === 0) {
      toast.error("No valid selections to save after deduplication.");
      return;
    }

    saveTimetable(uniqueSelections as any, {
      onSuccess: (response: any) => {
        setMySelections([]);
        setSelectedCourse(null);
        setSelectedTeacher(null);
        setSelectedBatch(null);
        setSelectedDoMoreSession(null);
        // setCurrentRequestId(response?.request_id ?? null); // Not using request ID for polling anymore
        setQueueDialogData({
          title: "Processing Request",
          message: "Stay on this page while we finalize your timetable allocation.",
        });
        setShowQueueDialog(true);
        setBookingSubmittedAt(Date.now());
        setIsOkButtonDisabled(true);
        // setAvailabilityPaused(true); // Removed
        // availabilitySocketRef.current?.close(); // Removed

        const initialEvent: StatusEventPayload | undefined = response?.queued_event;

        if (initialEvent) {
          setIsOkButtonDisabled(false);
        }
      },
      onError: (error: any) => {
        // setAvailabilityPaused(false); // Removed
        setIsOkButtonDisabled(false);
        const errorMessage = error?.response?.data?.error || "An error occurred while processing your request. Please try again.";

        // Check if there are rejected items to show in the queue dialog
        if (error?.response?.data?.rejected_items && error.response.data.rejected_items.length > 0) {
          const rejected = error.response.data.rejected_items;
          const rejectedMessages = rejected.map((item: any) => {
            // Handle regular course rejections
            if (item.teacher_course_id) {
              const courseName = item.course_name || `Course ${item.teacher_course_id}`;
              const teacherName = item.teacher_name || 'Unknown Teacher';
              return `• ${courseName} (${teacherName}, Batch: ${item.batch}): ${item.reason}`;
            }
            // Handle Do More course rejections
            else if (item.do_more_id) {
              const doMoreName = item.do_more_name || `Do More Course ${item.do_more_id}`;
              return `• ${doMoreName}: ${item.reason}`;
            }
            // Fallback for other types
            else {
              return `• ${item.reason}`;
            }
          }).join('\n');

          setQueueDialogData({
            title: "Some Selections Were Rejected",
            message: `${errorMessage}\n\n📋 Rejected Items:\n${rejectedMessages}\n\n⚠️  Please select your teachers again from first in order to avoid rejections.`
          });
          // setStatusEvents([]); // Removed
          // setCurrentRequestId(null); // Removed
          setShowQueueDialog(true);
          setMySelections([]);
          setSelectedCourse(null);
          setSelectedTeacher(null);
        } else {
          toast.error(errorMessage);
        }
      }
    });
  };

  // Render session info for a teacher
  const renderTeacherSessionInfo = (teacherId: number) => {
    const { theorySessions, labSessions, timetableMeta, hasLab, hasTheory } = getSessionGroups(teacherId);
    const teacherCourseId = getTeacherCourseId(teacherId);

    // Log component render
    console.log('[Render] Teacher session info:', {
      teacherId,
      teacherCourseId,
      hasTheory,
      hasLab,
      theorySessionCount: theorySessions.length,
      labSessionCount: labSessions.length,
    });

    return (
      <div className="space-y-2">
        {hasTheory && (() => {
          const theoryMeta = timetableMeta.find(m => m.batch === 'theory');
          const theoryInfo = resolveSlotInfo(teacherId, 'theory', theoryMeta);
          const theorySlots = theoryInfo.slots;

          return (
            <div key={`theory-${theorySlots}`} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Theory ({theorySessions.length} sessions)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={theorySlots > 0 ? "secondary" : "destructive"}
                  className="px-2 py-0.5 text-[10px] font-medium"
                >
                  {theorySlots} slots
                </Badge>
              </div>
            </div>
          );
        })()}

        {hasLab && labSessions.map(labSession => {
          const meta = timetableMeta.find(m => m.batch === labSession.batch_key);
          const labInfo = resolveSlotInfo(teacherId, labSession.batch_key, meta);
          const slotsAvailable = labInfo.slots;
          const batchDisplayName = labSession.batch_key === 'no-batch' ? `Lab (${labSession.sessions.length} sessions)` : `${labSession.batch_key} (${labSession.sessions.length} sessions)`;

          return (
            <div key={`${labSession.batch_key}-${slotsAvailable}`} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FlaskConical className="h-4 w-4" />
                <span>{batchDisplayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={slotsAvailable > 0 ? "secondary" : "destructive"}
                  className="px-2 py-0.5 text-[10px] font-medium"
                >
                  {slotsAvailable} slots
                </Badge>
              </div>
            </div >
          );
        })}
      </div >
    );
  };

  // Render a selected course in the My Selected Courses section
  const renderSelectedCourse = (
    selection: CourseSelection,
    onDelete: (id: number) => void
  ) => {
    // Check if this is a Do More course
    const isDoMore = selection.course?.is_do_more;
    const isMandatory = !!selection.course?.is_mandatory;

    // Check if this selection has any conflicts with other selections (only for regular courses)
    const hasConflict = !isDoMore && selection.teacher_id ? hasTeacherConflict(selection.teacher_id, selection.selectedLabBatch) : false;

    return (
      <Card
        key={selection.id}
        className={cn(
          "mb-3 border transition-all duration-200 shadow-sm rounded-lg flex items-center gap-3 px-3 py-2 min-h-[64px] max-h-[80px] overflow-hidden",
          isDoMore ? (isMandatory ? "border-yellow-300 bg-yellow-50/70 dark:border-yellow-600 dark:bg-yellow-900/20" : "border-blue-200 bg-blue-50/70 dark:border-blue-600 dark:bg-blue-900/20") :
            hasConflict ? "border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-900/20" : "hover:shadow-md"
        )}
      >
        <CardContent className="p-0 w-full">
          <div className="flex justify-between items-center w-full gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  isDoMore ? (isMandatory ? "bg-yellow-100 dark:bg-yellow-900/40" : "bg-blue-100 dark:bg-blue-900/40") : "bg-primary/10"
                )}>
                  {isDoMore ? (
                    <BookOpen className={cn("h-5 w-5", isMandatory ? "text-yellow-700 dark:text-yellow-100" : "text-blue-600 dark:text-blue-100")} />
                  ) : (
                    <BookOpen className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-base text-foreground">
                      {selection.course?.course_code}
                    </h3>
                    {isDoMore && (
                      <Badge variant="secondary" className={cn("text-xs font-semibold px-2 py-0.5 border shrink-0", isMandatory ? "bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-600" : "bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-600")}>
                        {isMandatory ? "Mandatory" : "Optional"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selection.course?.course_name}
                  </p>
                  {isDoMore && (
                    <p className={cn("text-xs font-medium", isMandatory ? "text-yellow-700 dark:text-yellow-100" : "text-blue-600 dark:text-blue-100")}>
                      {isMandatory ? "Mandatory Do More Course" : "Optional Do More Course"}
                    </p>
                  )}
                </div>
              </div>
              {/* Teacher & Batch Info - Only show for regular courses */}
              {!isDoMore && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Users className="h-4 w-4" />
                  <span>{selection.teacher?.name}</span>
                  {selection.batch && (
                    <Badge variant="outline" className="text-xs">Batch: {selection.batch}</Badge>
                  )}
                  {(() => {
                    const { theorySessions, labSessions } = getSessionGroups(selection.teacher_id);
                    const groupIndexes = new Set<number>();
                    // Get all unique group indexes
                    theorySessions.forEach(ts => {
                      if (ts.timetable_master_info?.group_index !== undefined) {
                        groupIndexes.add(ts.timetable_master_info.group_index);
                      }
                    });
                    labSessions.forEach(ls => {
                      if (ls.batch_info?.group_index !== undefined) {
                        groupIndexes.add(ls.batch_info.group_index);
                      }
                    });
                    // Convert to sorted array
                    const sortedIndexes = Array.from(groupIndexes).sort((a, b) => a - b);
                    return sortedIndexes.length > 0 ? (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        Group: {sortedIndexes.join(', ')}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              )}
              {/* Do More Course Info */}
              {isDoMore && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="h-4 w-4" />
                  <span>{isMandatory ? "Mandatory Do More" : "Optional Do More"}</span>
                </div>
              )}
              {/* Conflict Warning - Only for regular courses */}
              {hasConflict && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md mt-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-medium text-red-700">Group Conflict Detected!</span>
                </div>
              )}
            </div>
            {/* Remove Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => selection.id && onDelete(selection.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // If user has already created a timetable, show a different view
  // BUT keep the current view if the dialog is open (to prevent dialog from disappearing)
  if (isTimetableConfirmed && !showQueueDialog) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center">
                <GraduationCap className="h-7 w-7 mr-2 text-primary" />
                Your Timetable
              </h1>
              <ConnectionStatusBadge status="connected" />
            </div>
            <p className="text-muted-foreground ml-9">
              Your confirmed timetable for the semester
            </p>
          </div>
          <div>
            <span className="text-md font-semibold">Support:</span> <a href="mailto:helpdesk.timetable@rajalakshmi.edu.in" className=" underline">Helpdesk</a>
          </div>
        </div>

        {isLoadingTimetableData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading your timetable...</span>
          </div>
        ) : timetableError ? (
          <Card className="border-red-200">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <h3 className="font-medium text-red-700">
                Error loading timetable
              </h3>
              <p className="text-red-600 text-sm mt-1">
                There was an error loading your timetable data.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetchTimetableData()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <TimeTableGrid selections={displayTimetableEntries || []} />

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center text-green-800">
                  <Check className="h-5 w-5 mr-2" />
                  <span className="font-medium">Timetable Confirmed</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Your timetable has been successfully created and confirmed. No
                  further changes can be made.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }


  // Original course selection interface for users who haven't created a timetable yet
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center">
              <GraduationCap className="h-7 w-7 mr-2 text-primary" />
              Teacher Selection
            </h1>
            <ConnectionStatusBadge status="connected" />
          </div>
          <p className="text-muted-foreground ml-9">
            Choose your Teachers for the upcoming semester
          </p>
        </div>
        <div>
          <span className="text-md font-semibold">Support:</span> <a href="mailto:helpdesk.timetable@rajalakshmi.edu.in" className=" underline">Helpdesk</a>
        </div>
      </div>

      {/* Info Note for Group Selection Strategy */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-blue-500 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-800">Important Instructions:</span>
          <ul className="list-decimal ml-5 mt-1 text-sm text-blue-800 space-y-1">
            <li>Choose your courses based on <b>group</b> (start from Group 1 and proceed in order).</li>
            <li>You can't select conflicting groups, i.e., you can choose <b>only one course from a group</b>.</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Timetable Grid */}
        <div className="lg:col-span-3">
          <TimeTableGrid selections={displayTimetableEntries || []} />
        </div>

        {/* Selection Panel */}
        <div className="space-y-4 lg:col-span-1 p-4">
          {/* Course Selection */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <Select
                  disabled={
                    isTimetableConfirmed
                  }
                  value={selectedCourse?.course_id?.toString() || ""}
                  onValueChange={(value) => {
                    const course = combinedCourseData.find(
                      (c: any) => c.course_id.toString() === value
                    );
                    if (course && !course.selected) {
                      // Convert the course selection status object to Course interface sdjfsdkjfh
                      const courseObj: Course = {
                        id: course.course_id,
                        course_id: course.course_id,
                        course_semester: 0,
                        course_year: 0,
                        elective_type: "",
                        for_dept_id: 0,
                        teaching_dept_id: 0,
                        lab_type: "",
                        need_assist_teacher: false,
                        teaching_status: "",
                        course_name: course.course_name,
                        course_code: course.course_code,
                        // New fields for Do More courses
                        is_do_more: course.is_do_more,
                        is_mandatory: course.is_mandatory,
                        sessions: course.sessions,
                      };
                      handleSelectCourse(courseObj);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a course">
                      {selectedCourse &&
                        `${selectedCourse.course_name} (${selectedCourse.course_code})`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {combinedCourseData.map((course: any) => (
                      <SelectItem
                        key={course.course_id}
                        value={course.course_id.toString()}
                        disabled={
                          course.selected ||
                          mySelections.some(
                            (s) => s.course?.course_id === course.course_id
                          )
                        }
                        className={cn(
                          course.is_do_more && ""
                        )}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {course.is_do_more && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0",
                                course.is_mandatory
                                  ? "bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-600"
                                  : "bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-600"
                              )}>
                                {course.is_mandatory ? "Mandatory" : "Optional"}
                              </span>
                            )}
                            <span className="">
                              {course.course_name} ({course.course_code})
                            </span>
                          </div>
                          <div className="flex flex-col items-end min-w-[60px]">
                            {course.is_do_more && (
                              <span className={cn(
                                "text-[10px] font-medium mt-0.5",
                                course.is_mandatory
                                  ? "text-yellow-700 dark:text-yellow-200"
                                  : "text-blue-700 dark:text-blue-200"
                              )}>
                                Do More
                              </span>
                            )}
                            {course.selected && (
                              <span className="text-muted-foreground text-xs">- Already Selected</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TooltipTrigger>
              {isTimetableConfirmed && (
                <TooltipContent>
                  <p>You have already created timetable</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Teachers Section */}
          {selectedCourse && (
            <ScrollArea className="h-[550px] rounded-md border">
              <div className="border-b bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {selectedCourse.is_do_more ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        Available Slots
                      </>
                    ) : (
                      <>
                        <Users className="h-5 w-5 mr-2 text-primary" />
                        Available Teachers
                      </>
                    )}
                  </div>
                  {isLoadingAllTeacherSessions && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      <span>Loading slots</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                {selectedCourse.is_do_more ? (
                  // Do More course slots display
                  <div className="space-y-4">
                    <div className="text-center py-6">
                      <div className="flex items-center justify-center mb-3">
                        <BookOpen className="h-8 w-8 text-blue-500 mr-2" />
                        <h3 className="text-lg font-semibold text-blue-800">
                          {selectedCourse.course_name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedCourse.is_mandatory ? "Mandatory Do More Course" : "Optional Do More Course"}
                      </p>

                      {/* Actual Do More sessions from API */}
                      <div className="space-y-3">
                        {selectedCourse.sessions && selectedCourse.sessions.length > 0 ? (
                          selectedCourse.sessions.map((session) => {
                            // Check if this session conflicts with existing selections
                            const hasTimeConflict = checkDoMoreSessionConflict(session);
                            const isSessionDisabled = !session.is_available || hasTimeConflict;
                            const isMandatory = !!selectedCourse.is_mandatory;
                            return (
                              <Card
                                key={session.id}
                                className={cn(
                                  "transition-all duration-200 flex items-center justify-between gap-3 px-3 py-2 min-h-[64px] max-h-[80px] overflow-hidden border cursor-pointer shadow-sm rounded-lg",
                                  isSessionDisabled && "opacity-60 cursor-not-allowed",
                                  selectedDoMoreSession === session.id && (isMandatory ? "border-yellow-400 ring-2 ring-yellow-300 dark:border-yellow-600 dark:ring-yellow-700" : "border-blue-400 ring-2 ring-blue-300 dark:border-blue-600 dark:ring-blue-700"),
                                  hasTimeConflict && "border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-900/20",
                                  isMandatory ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-blue-50 dark:bg-blue-900/20"
                                )}
                                style={{ boxShadow: selectedDoMoreSession === session.id ? '0 2px 8px 0 rgba(0,0,0,0.06)' : undefined }}
                                onClick={() => {
                                  if (!isSessionDisabled) {
                                    setSelectedDoMoreSession(selectedDoMoreSession === session.id ? null : session.id);
                                  }
                                }}
                              >
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 min-w-0">
                                    <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                                    <h4 className="font-semibold text-sm truncate max-w-[120px]" title={session.session_name}>{session.session_name}</h4>
                                    <span className={cn(
                                      "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0",
                                      isMandatory ? "bg-yellow-200 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-600" : "bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-600"
                                    )}>
                                      {isMandatory ? "Mandatory" : "Optional"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{session.day.charAt(0).toUpperCase() + session.day.slice(1)}</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{session.start_time} - {session.end_time}</span>
                                    {hasTimeConflict && (
                                      <span className="text-red-600 font-medium ml-2">Clashes with schedule</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 min-w-[60px]">
                                  {selectedDoMoreSession === session.id && (
                                    <Check className="h-4 w-4 text-white bg-blue-500 rounded-full p-0.5 mb-1" />
                                  )}
                                  <Badge
                                    variant={isSessionDisabled ? "destructive" : "default"}
                                    className={cn(
                                      isSessionDisabled ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" : isMandatory ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100" : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100",
                                      "text-xs px-2 py-0.5"
                                    )}
                                  >
                                    {session.available_slots} slots
                                  </Badge>
                                </div>
                              </Card>
                            );
                          })
                        ) : (
                          <div className="text-center py-6 text-muted-foreground">
                            <AlertCircle className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
                            <p className="text-sm">No sessions available for this Do More course</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center gap-2 text-blue-800">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Do More Course Information</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          Do More courses are additional learning opportunities. Select a slot that fits your schedule.
                        </p>
                      </div>
                    </div>
                  </div>
                ) :
                  <>
                    {isLoadingTeachers ? (
                      <div className="space-y-3">
                        <div className="h-16 rounded-md bg-muted animate-pulse" />
                        <div className="h-16 rounded-md bg-muted animate-pulse" />
                      </div>
                    ) : teachers.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <AlertCircle className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
                        No teachers available for this course
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teachers.map((teacher) => {
                          const hasTeacherSessions = allTeacherSessions[teacher.id];

                          const { labSessions, timetableMeta, hasTheory, hasLab } = getSessionGroups(teacher.id);
                          const theoryMeta = timetableMeta.find(m => m.batch === 'theory');
                          const theoryInfo = resolveSlotInfo(teacher.id, 'theory', theoryMeta);
                          const isTheoryAvailable = theoryInfo.available;
                          const theorySlots = theoryInfo.slots;

                          const batchedLabs = labSessions.filter(ls => ls.batch_info.is_batched);
                          const hasBatchedLabs = batchedLabs.length > 0;

                          const hasNonBatchedLab = labSessions.some(ls => ls.batch_key === 'no-batch');
                          const nonBatchedMeta = timetableMeta.find(m => m.batch === 'no-batch');
                          const nonBatchedInfo = resolveSlotInfo(teacher.id, 'no-batch', nonBatchedMeta);
                          const isNonBatchedLabAvailable = nonBatchedInfo.available;
                          const nonBatchedLabSlots = nonBatchedInfo.slots;

                          const batchedLabSlots = batchedLabs.map(lab => {
                            const meta = timetableMeta.find(m => m.batch === lab.batch_key);
                            const info = resolveSlotInfo(teacher.id, lab.batch_key, meta);
                            return {
                              batch: lab.batch_key,
                              slots: info.slots,
                              available: info.available
                            };
                          });

                          let isTeacherSelectable = false;
                          if (hasTheory || hasLab) {
                            const theoryOk = !hasTheory || (isTheoryAvailable && theorySlots > 0);
                            const nonBatchedOk = !hasNonBatchedLab || (isNonBatchedLabAvailable && nonBatchedLabSlots > 0);
                            const batchedOk = !hasBatchedLabs || batchedLabSlots.some(batch => batch.available && batch.slots > 0);
                            isTeacherSelectable = theoryOk && nonBatchedOk && batchedOk;
                          }

                          const isEffectivelyFull = !isTeacherSelectable;
                          const availableBatches = batchedLabSlots.filter(batch => batch.available && batch.slots > 0).map(batch => batch.batch);

                          // Check if this teacher is already selected
                          const alreadySelected = mySelections.find(sel => sel.teacher_id === teacher.id);

                          // Check if this teacher has any available non-clashing options
                          const hasAvailableOptions = hasTeacherAvailableOptions(teacher.id);

                          // Check if all batch options would cause clashes
                          const allBatchesClash = (() => {
                            if (!hasLab) return false; // Only check for lab courses

                            // Check if all available batches would cause clashes
                            const availableBatches = batchedLabSlots.filter(batch => batch.available && batch.slots > 0).map(batch => batch.batch);

                            if (availableBatches.length === 0) return false; // No batches available anyway

                            // Check if all available batches would cause clashes
                            return availableBatches.every(batch => checkTeacherConflict(teacher.id, batch));
                          })();

                          return (
                            <Card
                              key={teacher.id}
                              className={cn(
                                "p-3 border transition-all duration-200",
                                selectedTeacher?.id === teacher.id
                                  ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                                  : "hover:shadow-md",
                                isEffectivelyFull
                                  ? "opacity-60 cursor-not-allowed bg-muted/30"
                                  : !hasAvailableOptions || allBatchesClash
                                    ? "opacity-80 cursor-not-allowed border-red-300 bg-red-50/30"
                                    : "cursor-pointer hover:border-primary/30"
                              )}
                              onClick={() => {
                                if (selectedTeacher?.id === teacher.id) {
                                  setSelectedTeacher(null);
                                  setSelectedBatch(null);
                                } else if (!isEffectivelyFull && hasAvailableOptions && !allBatchesClash) {
                                  setSelectedTeacher(teacher);
                                  setSelectedBatch(null);
                                }
                              }}
                            >
                              <div className="flex flex-col space-y-3">
                                {/* Teacher Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                                        {teacher.name}
                                      </h3>
                                      <p className="text-xs text-muted-foreground leading-tight">
                                        {teacher.department}
                                      </p>
                                      {(() => {
                                        const { theorySessions, labSessions } = getSessionGroups(teacher.id);
                                        const groupIndexes = new Set<number>();

                                        // Get all unique group indexes
                                        theorySessions.forEach(ts => {
                                          if (ts.timetable_master_info?.group_index !== undefined) {
                                            groupIndexes.add(ts.timetable_master_info.group_index);
                                          }
                                        });

                                        labSessions.forEach(ls => {
                                          if (ls.batch_info?.group_index !== undefined) {
                                            groupIndexes.add(ls.batch_info.group_index);
                                          }
                                        });

                                        // Convert to sorted array
                                        const sortedIndexes = Array.from(groupIndexes).sort((a, b) => a - b);

                                        return sortedIndexes.length > 0 ? (
                                          <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] text-muted-foreground">Group:</span>
                                            <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-semibold">
                                              {sortedIndexes.join(', ')}
                                            </span>
                                          </div>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>
                                  {selectedTeacher?.id === teacher.id && (
                                    <div className="bg-primary/10 rounded-full p-1.5">
                                      <Check className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                  )}
                                </div>

                                {/* Clash Warning */}
                                {selectedTeacher?.id !== teacher.id && (!hasAvailableOptions || allBatchesClash) && (
                                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-medium text-red-700">
                                      {isEffectivelyFull ? "All slots are full" :
                                        allBatchesClash ? "All options clash with schedule" :
                                          "All options clash with schedule"}
                                    </span>
                                  </div>
                                )}

                                {/* Session & Batch Info */}
                                {selectedTeacher?.id !== teacher.id && hasTeacherSessions && (
                                  <div className="pt-2 border-t">
                                    {renderTeacherSessionInfo(teacher.id)}
                                  </div>
                                )}

                                {/* Batch Selection for Selected Teacher */}
                                {selectedTeacher?.id === teacher.id && (
                                  <div className="space-y-3 pt-3 border-t">
                                    {hasTeacherSessions && renderTeacherSessionInfo(teacher.id)}

                                    {availableBatches.length > 0 && !alreadySelected && (
                                      <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Select Lab Batch</label>

                                        {/* Check if all batches would cause clashes */}
                                        {availableBatches.every(batch => checkTeacherConflict(teacher.id, batch)) && (
                                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                            <span className="text-xs font-medium text-red-700">All batch options clash with schedule</span>
                                          </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                          {availableBatches.map(batch => {
                                            const meta = timetableMeta.find(m => m.batch === batch);
                                            const slotInfo = resolveSlotInfo(teacher.id, batch, meta);
                                            const isBatchAvailable = slotInfo.available;
                                            const batchSlots = slotInfo.slots;
                                            const wouldCauseClash = checkTeacherConflict(teacher.id, batch);
                                            const hasSlots = batchSlots > 0;

                                            return (
                                              <label
                                                key={batch}
                                                className={cn(
                                                  "flex items-center gap-2 px-2 py-1 rounded-md border text-xs cursor-pointer transition-all",
                                                  selectedBatch === batch
                                                    ? "border-primary bg-primary/10"
                                                    : "border-gray-200 hover:border-primary/50",
                                                  (!isBatchAvailable || !hasSlots) && "opacity-50 cursor-not-allowed",
                                                  wouldCauseClash && "border-red-300 bg-red-50/50"
                                                )}
                                                onClick={e => e.stopPropagation()}
                                              >
                                                <input
                                                  type="radio"
                                                  name="batch-picker"
                                                  value={batch}
                                                  disabled={!isBatchAvailable || !hasSlots || wouldCauseClash}
                                                  checked={selectedBatch === batch}
                                                  onChange={e => { e.stopPropagation(); setSelectedBatch(batch); }}
                                                  className="h-3.5 w-3.5"
                                                />
                                                <span className={cn(wouldCauseClash && "text-red-600")}>
                                                  {batch} ({batchSlots} slots)
                                                </span>
                                                {wouldCauseClash && (
                                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                                )}
                                              </label>
                                            );
                                          })}
                                        </div>
                                        {selectedBatch && selectedTeacher && checkTeacherConflict(selectedTeacher.id, selectedBatch) && (
                                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                            <span className="text-xs font-medium text-red-700">Selected batch causes schedule clash</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>}
              </div>
            </ScrollArea>
          )}

          {/* Submit Button */}
          <Button
            className="w-full h-12 shadow-md"
            disabled={
              !selectedCourse ||
              (selectedCourse.is_do_more ? !selectedDoMoreSession : (!selectedTeacher || hasSelectedTeacherConflict || (selectedTeacher && getTeacherBatchSlots(selectedTeacher.id, selectedBatch || undefined) <= 0)))
            }
            onClick={handleAddCourse}
          >
            <div className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              {selectedCourse?.is_do_more ?
                (selectedDoMoreSession ? "Add Do More Course" : "Select a Slot") :
                hasSelectedTeacherConflict ? "No Available Options" :
                  (selectedTeacher && getTeacherBatchSlots(selectedTeacher.id, selectedBatch || undefined) <= 0) ? "No Slots Available" : "Select Teacher"}
            </div>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full h-12"
                disabled={
                  !hasSelections ||
                  hasConflicts ||
                  isSavingTimetable ||
                  !allCoursesSelected ||
                  !allMandatoryDoMoreSelected // <-- Add this check
                }
              >
                {isSavingTimetable ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  !allCoursesSelected || !allMandatoryDoMoreSelected
                    ? "Select a teacher/slot for all required courses"
                    : "Confirm Timetable"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Timetables once created cannot
                  be modified.
                  {hasConflicts && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center text-red-800">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="font-medium">
                          Warning: Schedule clashes detected!
                        </span>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        Please resolve all schedule conflicts before saving your
                        timetable.
                      </p>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSaveTimetable}
                  disabled={hasConflicts || isSavingTimetable}
                >
                  {isSavingTimetable ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Timetable"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Selected Courses */}
      <Card className="border-primary/20 border-dashed">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center">
            <Bookmark className="h-5 w-5 mr-2 text-primary" />
            My Selected Courses
            {hasConflicts && (
              <div className="ml-2 flex items-center text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Clashes Detected</span>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Courses and teachers you have selected for the upcoming semester
            {hasConflicts && (
              <span className="text-red-600 block mt-1">
                Please resolve schedule conflicts before confirming your
                timetable.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {mySelections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="mx-auto h-8 w-8 mb-3 text-muted-foreground" />
              <h3 className="font-medium">
                You haven't selected any courses yet
              </h3>
              <p className="text-sm mt-1">
                Select courses and teachers from the list above to add them here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {mySelections.map((selection) =>
                renderSelectedCourse(selection, handleRemoveCourse)
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showQueueDialog} onOpenChange={handleQueueDialogOpenChange}>
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            // Prevent Escape key dismissal when processing
            if (isOkButtonDisabled) {
              e.preventDefault();
              setDialogShakeAnimation(true);
              setTimeout(() => setDialogShakeAnimation(false), 2000);
            }
          }}
          className={cn(
            "transition-transform duration-200 max-h-[90vh]",
            dialogShakeAnimation && "animate-shake"
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{queueDialogTitle}</AlertDialogTitle>
            {/* <ScrollArea className="w-full h-[320px]"> */}
            <AlertDialogDescription className="whitespace-pre-line">
              {/* Connection Status Badge */}

              <ScrollArea className="h-[320px] w-full">
                {bookingStatus ? (
                  <div className="space-y-3">
                    {/* Pending Status */}
                    {bookingStatus.pending && (
                      <div className="rounded-md border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-semibold">Processing your request...</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Please wait while we process your booking.
                        </p>
                      </div>
                    )}

                    {/* Confirmed Bookings */}
                    {bookingStatus.confirmed && bookingStatus.confirmed.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-green-600 dark:text-green-400">
                          ✓ Confirmed Bookings ({bookingStatus.confirmed.length})
                        </h3>
                        {bookingStatus.confirmed.map((item: any) => (
                          <div key={item.id} className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg p-3 shadow-sm">
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">📚</span>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{item.course_name || `Course ${item.teacher_course_id}`}</p>
                                  <p className="text-xs text-muted-foreground">Teacher: {item.teacher_name || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-7">
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                  {item.batch}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rejected Bookings */}
                    {bookingStatus.rejected && bookingStatus.rejected.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-red-600 dark:text-red-400">
                          ❌ Rejected Bookings ({bookingStatus.rejected.length})
                        </h3>
                        {bookingStatus.rejected.map((item: any) => (
                          <div key={item.id} className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-sm">
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">📚</span>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{item.course_name || `Course ${item.teacher_course_id}`}</p>
                                  <p className="text-xs text-muted-foreground">Teacher: {item.teacher_name || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-400 pl-7">
                                Reason: {item.rejection_reason}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-7">
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded">
                                  {item.batch}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No results yet */}
                    {!bookingStatus.pending && (!bookingStatus.confirmed || bookingStatus.confirmed.length === 0) && (!bookingStatus.rejected || bookingStatus.rejected.length === 0) && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        <p>No booking results yet.</p>
                        <p className="text-xs mt-1">Click "Refresh" to check status.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-line">
                    {queueDialogData?.message}
                  </div>
                )}
              </ScrollArea>
            </AlertDialogDescription>
            {/* </ScrollArea> */}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => {
                refetchBookingStatus();
              }}
              disabled={!checkStatusEnabled}
              variant="outline"
              className={cn(
                !checkStatusEnabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {checkStatusEnabled ? "Refresh" : `Wait ${Math.max(0, 5 - Math.floor((Date.now() - (bookingSubmittedAt || 0)) / 1000))}s`}
            </Button>
            <AlertDialogAction
              onClick={() => {
                // OK button directly closes the dialog without triggering shake animation
                if (!isOkButtonDisabled) {
                  setShowQueueDialog(false);
                  setQueueDialogData(null);
                  setIsOkButtonDisabled(false);
                }
              }}
              disabled={isOkButtonDisabled}
              className={cn(
                isOkButtonDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {isOkButtonDisabled ? "Processing..." : "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
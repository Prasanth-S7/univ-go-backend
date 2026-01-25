// src/hooks/useSaveStudentTimetable.ts
import { useMutation } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from './api';

interface SelectionPayload {
  teacher_course_id: number;
  batch: string;
}

export const saveStudentTimetable = async (selections: SelectionPayload[]) => {
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error('selections must be a non-empty array');
  }

  const response = await api.post('/api/timetable/student/add/bulk/', {
    selections: selections,
  });

  return response.data;
};

export const useSaveStudentTimetable = () => {
  return useMutation({
    mutationFn: saveStudentTimetable,
    onSuccess: () => { },
    onError: (error: any) => {
      // console.error('Error saving timetable:', error);
      const errorResponseMessage = error?.response?.data?.error || 'Failed to save timetable'
      let finalErrorMessage = errorResponseMessage;

      if (error?.response?.data?.rejected_items) {
        const rejected = error.response.data.rejected_items;
        const rejectedMessages = rejected.map((item: any) => {
          // Handle regular course rejections
          if (item.teacher_course_id) {
            const courseName = item.course_name || `Course ${item.teacher_course_id}`;
            const teacherName = item.teacher_name || 'Unknown Teacher';
            return `${courseName} (${teacherName}, Batch: ${item.batch}): ${item.reason}`;
          }
          // Handle Do More course rejections
          else if (item.do_more_id) {
            const doMoreName = item.do_more_name || `Do More Course ${item.do_more_id}`;
            return `${doMoreName}: ${item.reason}`;
          }
          // Fallback for other types
          else {
            return `${item.reason}`;
          }
        }).join(', ');
        finalErrorMessage = `${errorResponseMessage}. Rejections: ${rejectedMessages}`;
      }

      toast.error(finalErrorMessage);
    },
  });
};

export const fetchStudentTimetableStatus = async () => {
  const response = await api.get('/api/timetable/student/status/');
  return response.data;
};

export const useStudentTimetableStatus = () => {
  return useQuery({
    queryKey: ['studentTimetableStatus'],
    queryFn: fetchStudentTimetableStatus,
  });
};

export const fetchStudentTimetableData = async () => {
  const response = await api.get('/api/timetable/student/sessions/');
  return response.data;
};

export const useStudentTimetableData = () => {
  return useQuery({
    queryKey: ['studentTimetableData'],
    queryFn: fetchStudentTimetableData,
    enabled: false,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const fetchBookingStatus = async () => {
  const response = await api.get('/api/timetable/status/');
  return response.data;
};

export const useBookingStatus = (enabled: boolean = false) => {
  return useQuery({
    queryKey: ['bookingStatus'],
    queryFn: fetchBookingStatus,
    enabled,
    refetchInterval: enabled ? 2000 : false, // Poll every 2 seconds when enabled
    retry: false,
  });
};
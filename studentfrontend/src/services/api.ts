import api from "@/action/api";
import axios from "axios";

export const studentProfileApi = {
  getProfile: async () => {
    return api.get('/api/auth/profile/');
  },

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
  }) => api.post('/api/auth/profile/update/', data),

  updatePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/api/auth/change-password/', data),

  getAcademicInfo: async () => {
    try {
      return await api.get('/api/students/academic-info/');
    } catch {
      return { data: {} };
    }
  },
};

export const dashboardApi = {
  getSummary: () => api.get('/api/dashboard/summary/'),
  getTodayClasses: () => api.get('/api/dashboard/today-classes/'),
  getNotifications: () => api.get('/api/dashboard/notifications/'),
  markNotificationAsRead: (id: number) => api.post(`/api/dashboard/notifications/${id}/read/`),
};

export const studentCourseApi = {
  getAvailableCourses: async () => {
    try {
      return await api.get('/api/student-courses/courses/available_courses/');
    } catch (error) {
      throw error;
    }
  },

  getMyCourseSelections: async () => {
    try {
      return await api.get('/api/student-courses/courses/');
    } catch {
      return { data: [] };
    }
  },

  getCourseDetails: async (courseId: number) => {
    try {
      return await api.get(`/api/courses/${courseId}/`);
    } catch (error) {
      throw error;
    }
  },

  getAvailableTeachers: async (courseId: string) => {
    try {
      try {
        return await api.get(`/api/student-courses/courses/available_teachers/`, {
          params: { course_id: courseId },
        });
      } catch {
        const teacherCourses = await api.get(`/api/teacher-courses/teacher/${courseId}/`);
        const teacherPromises = teacherCourses.data.map((tc: any) =>
          api.get(`/api/teacher/${tc.teacher_id}/`)
        );
        const teacherResponses = await Promise.all(teacherPromises);
        const teachers = teacherResponses.map(response => response.data);
        return { data: teachers };
      }
    } catch (error) {
      throw error;
    }
  },

  getAvailableSlots: async (courseId: string, teacherId: string) => {
    const endpoints = [
      `/api/student-courses/courses/available_slots/?course_id=${courseId}&teacher_id=${teacherId}`,
      `/api/student-courses/courses/filtered_slots/?course_id=${courseId}&teacher_id=${teacherId}`,
      `/api/timetable/timetables/?course_id=${courseId}&teacher_id=${teacherId}`,
      `/api/slot/`,
    ];

    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        if (endpoint === '/api/slot/') {
          return {
            data: {
              warning: "Using generic slots as fallback. Time conflicts may not be detected.",
              slots: response.data,
            },
          };
        }
        return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  },

  createCourseSelection: async (data: { course_id: number; teacher_id: number; slot_id: number }) => {
    try {
      return await api.post('/api/student-courses/courses/', data);
    } catch (error) {
      throw error;
    }
  },

  deleteCourseSelection: async (id: number) => {
    try {
      return await api.delete(`/api/student-courses/courses/${id}/`);
    } catch (error) {
      throw error;
    }
  },

  selectCourse: async (id: number) => {
    try {
      return await api.post(`/api/student-courses/courses/enroll/${id}/`);
    } catch (error) {
      throw error;
    }
  },

  dropCourse: async (id: number) => {
    try {
      return await api.post(`/api/student-courses/courses/drop/${id}/`);
    } catch (error) {
      throw error;
    }
  },

  getDepartments: async () => {
    try {
      return await api.get('/api/department/');
    } catch {
      return { data: [] };
    }
  },
};

export const timetableApi = {
  getFreeRoomsToday: async () => {
    return api.get('/api/timetable/free-rooms-today/');
  },
};

export const studentNotesApi = {
  getNotes: async () => api.get('/api/students/notes/'),
  createNote: async (data: { title: string; content?: string }) => api.post('/api/students/notes/', data),
  updateNote: async (id: number, data: { title?: string; content?: string; is_completed?: boolean }) => api.patch(`/api/students/notes/${id}/`, data),
  deleteNote: async (id: number) => api.delete(`/api/students/notes/${id}/`),
};

export const forgotPasswordApi = {
  requestReset: (data: { email: string; password: string }) =>
    api.post('/api/auth/forgot-password/', data),
  verifyReset: (email: string, token: string) =>
    api.get('/api/auth/forgot-password/', { params: { email, token } }),
};

export const transportApi = {
  requestLocation: async (data: { latitude: number; longitude: number; address: string; bus_no: string; boarding_point_name?: string; pincode: string }) =>
    api.post('/api/transport/request/', data),
  confirmOtp: async (data: { id: number; otp: string }) =>
    api.post('/api/transport/confirm/', data),
  getExistingLocation: async () =>
    api.get('/api/transport/get/'),
  deleteUnconfirmedLocation: async () =>
    api.delete('/api/transport/delete/'),
  getAddress: async (lat: number, lng: number) => {
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    return axios.get(url); // Use plain axios, not the shared api instance
  },
};

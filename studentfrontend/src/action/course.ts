import { useQueryData } from "@/hooks/useQueryData";
import api from "./api";

export const useGetAvailableCourses = () => {
  return useQueryData<any>(
    ['available-courses'],
    async () => {
      try {
        const response = await api.get('/api/student-courses/courses/available_courses/');
        return response.data; // Return only the data, not the full response object
      } catch (error) {
        // console.error('Error fetching available courses:', error);
        return null;
      }
    }
  );
};

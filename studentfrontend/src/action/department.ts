import { useQueryData } from "@/hooks/useQueryData";
import { studentCourseApi } from "@/services/api";

export const useGetDepartments = () => {
  return useQueryData<any>(
    ["departments"],
    async () => {
      try {
        const response = await studentCourseApi.getDepartments();
        const data = Array.isArray(response.data) ? response.data : [];

        return data.map((dept: any) => ({
          id: dept.id,
          name: dept.dept_name || dept.name,
        }));
      } catch (error) {
        // console.error("Error fetching departments:", error);
        return [];
      }
    },
  );
};

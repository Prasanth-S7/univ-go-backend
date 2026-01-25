import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueryData } from './useQueryData';
import api from '@/action/api';
import { useMutationData } from './useMutationData';
import axios from 'axios';
import { clearAuthCookies } from '@/services/auth';

export interface User {
  id?: number | string;
  student_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string;
  phone_number?: string;
  department?: string;
  avatar?: string;
  role?: string;
  user_type?: string;
}

export interface ProfileResponse {
  user: User;
  student?: {
    id: number;
    batch: number;
    current_semester: number;
    year: number;
    roll_no: string | null;
    student_type: string;
    degree_type: string;
    department?: {
      id: number;
      dept_name: string;
      date_established: string;
      contact_info: string;
    };
  };
  is_login_allowed?: boolean;
  teacher?: {
    id: number;
    staff_code: string;
    teacher_role: string;
    teacher_specialisation: string;
    teacher_working_hours: number;
    department?: {
      id: number;
      dept_name: string;
      date_established: string;
      contact_info: string;
    };
  };
}

/**
 * Hook to check if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export function useIsAuthenticated() {
  const { data: user, isPending } = useCurrentUser();
  
  // Consider the user authenticated if user data exists
  const isAuthenticated = !!user;
  
  return { isAuthenticated, isPending };
}


export const useCurrentUser = () => {
  return useQueryData<ProfileResponse | null>(
    ['currentUser'],
    async () => {
      try {
        const response = await api.get('/api/auth/profile/');
        
        if (response.data && response.data.data) {
          if(!response.data.data.is_login_allowed) clearAuthCookies();
          // console.log("Profile", )

          return response.data.data as ProfileResponse;
        }

        throw new Error('Invalid server response');
      } catch (error) {
        // If server request fails, user is not authenticated
        return null;
      }
    },
    true,
    {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
}

/**
 * Hook to handle user logout
 * @returns Logout function
 */
export const useLogout = (onSuccess?: () => void) => {
  return useMutationData(
    ['logout'],
    async () => {
      try {
        // Send logout request to clear server-side cookies
        const response = await api.post('/api/auth/logout/');
        
        return {
          status: response.status,
          data: response.data.message || 'Logout successful',
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          return {
            status: error.response.status,
            data: error.response.data.message || 'Logout failed',
          };
        }
        throw error;
      }
    },
    'currentUser',
    onSuccess
  );
};

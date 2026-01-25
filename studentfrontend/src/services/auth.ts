import api from "@/action/api";
import { useMutationData } from "@/hooks/useMutationData";
import axios from "axios";
import { useQueryData } from "@/hooks/useQueryData";

export interface LoginRequest {
  email: string;
  password: string;
}

export const useLogin = (onSuccess?: (result: any) => void) => {
  return useMutationData(
    ['login'],
    async (data: LoginRequest) => {
      try {
        const response = await api.post('/api/auth/login/', data);
        return {
          status: response.status,
          data: response.data.message || 'Login successful',
          user_type: response.data.user_type,
          code: response.data.code,
          detail: response.data.detail,
          block_warning: response.data.block_warning,
          remaining_attempts: response.data.remaining_attempts,
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          return {
            status: error.response.status,
            data: error.response.data.message || 'Login failed',
            code: error.response.data.code,
            detail: error.response.data.detail,
            block_warning: error.response.data.block_warning,
            remaining_attempts: error.response.data.remaining_attempts,
          };
        }
        throw error;
      }
    },
    'currentUser',
    onSuccess
  );
};

export const clearAuthCookies = async () => {
  try {
    // Make a request to the logout endpoint to clear server-side cookies
    await api.post('/api/auth/logout/');
  } catch (error) {
    console.error('Failed to clear auth cookies:', error);
  }
};

export const useCsrfToken = () => {
  return useQueryData(
    ['csrf_token'],
    async () => {
      try {
        const response = await api.get('/api/auth/csrf_token/');
        return response.data;
      } catch (error) {
        return null;
      }
    }
  )
}

export const checkAllowedLoginStatus = async () => {
  const response = await api.get('/api/auth/allowed-login-status/');
  return response.data.is_login_allowed;
};

export const useAllowedLoginStatus = () => {
  return useQueryData<boolean>(
    ['allowed-login-status'],
    async () => {
      try {
        const response = await api.get('/api/auth/allowed-login-status/');
        return response.data.is_login_allowed;
      } catch (error) {
        return false;
      }
    },
    true,
    {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};
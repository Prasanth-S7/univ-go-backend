// import React, { createContext, useContext, useEffect, useState } from 'react';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'sonner';

// export interface User {
//   id?: number | string;
//   student_id?: string;
//   email: string;
//   first_name: string;
//   last_name: string;
//   gender?: string;
//   phone_number?: string;
//   department?: string;
//   role?: string;
//   user_type?: string;
// }

// interface AuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   isLoading: boolean;
//   error: Error | null;
//   login: (email: string, password: string) => Promise<void>;
//   logout: () => Promise<void>;
//   refreshUserData: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
//   children 
// }) => {
//   // Initialize user from localStorage if available
//   const storedUserJson = localStorage.getItem('user');
//   const storedUser = storedUserJson ? JSON.parse(storedUserJson) : null;
  
//   const [user, setUser] = useState<User | null>(storedUser);
//   const [error, setError] = useState<Error | null>(null);
//   const queryClient = useQueryClient();
//   const navigate = useNavigate();

//   const {
//     data,
//     isLoading,
//     refetch
//   } = useQuery({
//     queryKey: ['currentUser'],
//     queryFn: async () => {
//       // If there's no token, don't even try to fetch the profile
//       const token = localStorage.getItem('token');
//       if (!token) {
//         // Clear user state if no token exists
//         return null;
//       }
      
//       try {
//         const response = await authService.getCurrentUser();
//         if (response && response.data) {
//           // Extract user data based on response structure
//           let userData: any = null;
          
//           if (response.data.data && response.data.data.user) {
//             // Structure: { data: { user: {...}, student: {...} } }
//             userData = response.data.data.user;
            
//             // Add student ID if available
//             if (userData && response.data.data.student) {
//               userData.student_id = userData?.email || '';
//               // Add any other needed student properties
//               userData.department = response.data.data.student.department?.dept_name || '';
//             }
//           } else if (response.data.user) {
//             // Structure: { user: {...}, student: {...} }
//             userData = response.data.user;
            
//             // Add student ID if available
//             if (userData && response.data.student) {
//               userData.student_id = userData?.email || '';
//               // Add any other needed student properties
//               userData.department = response.data.student.department?.dept_name || '';
//             }
//           } else {
//             // Assume direct user object with possibly nested data
//             userData = response.data;
            
//             // Ensure required fields exist
//             if (userData) {
//               userData.first_name = userData?.first_name || '';
//               userData.last_name = userData?.last_name || '';
//               userData.email = userData?.email || userData?.id || '';
//             }
//           }
          
//           // Make sure we have minimal required user data
//           if (userData && (!userData.first_name && !userData.last_name && !userData.email && !userData.id)) {
//             throw new Error('Invalid user data received');
//           }
          
//           // Store user data in localStorage for offline/fallback access
//           if (userData) {
//           localStorage.setItem('user', JSON.stringify(userData));
//           }
          
//           return userData;
//         }
//         return null;
//       } catch (error) {
//         console.error('Error fetching current user:', error);
        
//         // If API fails but we have stored user data, use that
//         if (storedUser) {
//           return storedUser;
//         }
        
//         setError(error as Error);
//         return null;
//       }
//     },
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     retry: 1,
//     refetchOnWindowFocus: false,
//     enabled: !!localStorage.getItem('token'), // Only run query if token exists
//   });

//   useEffect(() => {
//     if (data) {
//       setUser(data);
//       setError(null);
//     } else if (data === null && !storedUser) {
//       // Only set user to null if data is null AND there's no stored user
//       setUser(null);
//     }
//   }, [data]);

//   const login = async (email: string, password: string) => {
//     try {
//       setError(null);
//       const response = await authService.login({ email, password });
      
//       console.log('Login response:', response.data);
      
//       // Extract user data from response
//       let userData: any = null;
      
//       if (response.data.data && response.data.data.user) {
//         // Structure: { data: { user: {...}, student: {...} } }
//         userData = response.data.data.user;
        
//         // Add student ID if available
//         if (userData && response.data.data.student) {
//           userData.student_id = userData?.email || '';
//           // Add any other needed student properties
//           userData.department = response.data.data.student.department?.dept_name || '';
//         }
//       } else if (response.data.user) {
//         // Structure: { user: {...}, student: {...} }
//         userData = response.data.user;
        
//         // Add student ID if available
//         if (userData && response.data.student) {
//           userData.student_id = userData?.email || '';
//           // Add any other needed student properties
//           userData.department = response.data.student.department?.dept_name || '';
//         }
//       } else if (response.data.id) {
//         // Case: Direct user object
//         userData = response.data;
        
//         // Ensure required fields exist
//         if (userData) {
//           userData.first_name = userData?.first_name || '';
//           userData.last_name = userData?.last_name || '';
//           userData.email = userData?.email || userData?.id || '';
//         }
//       }
      
//       if (userData) {
//         // Set user directly to avoid waiting for refetch
//         setUser(userData);
        
//         // Also store in queryClient cache
//         queryClient.setQueryData(['currentUser'], userData);
        
//         // Still refresh user data in background
//         refetch();
        
//         // Navigate to dashboard after successful login
//         navigate('/dashboard');
        
//         toast.success('Login successful!');
//       } else {
//         // If no user data found, try to refetch
//         const result = await refetch();
//         if (result.data) {
//           navigate('/dashboard');
//           toast.success('Login successful!');
//         } else {
//           throw new Error('Could not retrieve user information');
//         }
//       }
//     } catch (err) {
//       setError(err as Error);
//       toast.error('Login failed. Please check your credentials.');
//       throw err;
//     }
//   };

//   const logout = async () => {
//     try {
//       await authService.logout();
      
//       // Clear data regardless of API success
//       setUser(null);
//       queryClient.clear(); 
      
//       // Redirect to login page
//       navigate('/auth/login');
      
//       toast.success('Logged out successfully');
//     } catch (err) {
//       console.error('Error during logout:', err);
      
//       // Still clear user data and redirect even on error
//       setUser(null);
//       queryClient.clear();
//       navigate('/auth/login');
      
//       toast.error('Logout encountered an error, but you have been signed out');
//     }
//   };
  
//   const refreshUserData = () => {
//     refetch();
//   };

//   const value = {
//     user,
//     isAuthenticated: !!user,
//     isLoading,
//     error,
//     login,
//     logout,
//     refreshUserData
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }; 
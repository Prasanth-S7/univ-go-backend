import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import LoginPage from './pages/auth/login';
import DashboardPage from './pages/dashboard';
import CourseSelectionPage from './pages/teacher-selection';
import CourseDetailPage from './pages/teacher-selection/course-detail';
import TimetablePage from './pages/timetable';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';
import Layout from './components/global/layout';
import { ErrorBoundary } from './components/global/error-boundary';
import { QueryErrorBoundary } from './components/global/query-error';
import { ErrorProvider } from './contexts/error-context';
// import { AuthProvider } from './contexts/auth-context';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/protected-route';
import { ThemeProvider } from './components/provider/theme-provider';
import { useEffect } from 'react';
import ReactGa from 'react-ga4';
import FreeRoomsPage from './pages/free-rooms';
import NotesPage from './pages/notes';
import ForgotPassword from './pages/auth/forgot-password';
import VerifyReset from './pages/auth/verify-reset';
import TransportPage from './pages/transport';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
    },
  },
});

function App() {
  useEffect(() => {
    ReactGa.send({
      hitType: "Main Page",
      page: "/",
      title: "Teacher Selection App",
    });
  }, []);

  return (
    <ErrorBoundary>
      <ErrorProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <QueryClientProvider client={queryClient}>
            <Router>
              {/* <AuthProvider> */}
                <Routes>
                  {/* Auth routes - only accessible if NOT logged in */}
                  <Route path="/auth/login" element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  } />
                  <Route path="/auth/forgot-password" element={
                    <PublicOnlyRoute>
                      <ForgotPassword />
                    </PublicOnlyRoute>
                  } />
                  <Route path="/auth/verify-reset" element={
                    <PublicOnlyRoute>
                      <VerifyReset />
                    </PublicOnlyRoute>
                  } />
                  {/* Redirect old login path to new one for backward compatibility */}
                  <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="teacher-selection" element={<CourseSelectionPage />} />
                    <Route path="teacher-selection/:courseId" element={<CourseDetailPage />} />
                    <Route path="timetable" element={<TimetablePage />} />
                    <Route path="free-rooms" element={<FreeRoomsPage />} />

                    <Route path="notes" element={<NotesPage />} />
                    <Route path="transport" element={<TransportPage />} />
                    {/* <Route path="profile" element={<ProfilePage />} /> */}
                    {/* <Route path="settings" element={<SettingsPage />} /> */}
                  </Route>
                  
                  {/* Catch all route - redirect to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              {/* </AuthProvider> */}
            </Router>
            <Toaster position="top-right" />
            <QueryErrorBoundary />
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;

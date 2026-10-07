import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/pages/auth/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { NotFoundPage } from '@/pages/auth/NotFoundPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagement } from '@/pages/admin/UserManagement';
import { CourseManagement } from '@/pages/admin/CourseManagement';
import { VenueManagement } from '@/pages/admin/VenueManagement';
import { RegistryManager } from '@/components/admin/RegistryManager';
import { ProfilePage } from '@/pages/auth/ProfilePage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { LecturerDashboard } from '@/pages/lecturer/LecturerDashboard';
import { LecturerCourses } from '@/pages/lecturer/LecturerCourses';
import { LecturerSessions } from '@/pages/lecturer/LecturerSessions';
import { LecturerReports } from '@/pages/lecturer/LecturerReports';
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { StudentCourses } from '@/pages/student/StudentCourses';
import { StudentCheckIn } from '@/pages/student/StudentCheckIn';
import { StudentHistory } from '@/pages/student/StudentHistory';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/" replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'lecturer') return <Navigate to="/lecturer/dashboard" replace />;
  if (user?.role === 'student') return <Navigate to="/student/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/signup" element={<SignupPage />} />

      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin']}><CourseManagement /></ProtectedRoute>} />
      <Route path="/admin/venues" element={<ProtectedRoute allowedRoles={['admin']}><VenueManagement /></ProtectedRoute>} />
      <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['admin']}><RegistryManager key="classes" kind="class-groups" /></ProtectedRoute>} />
      <Route path="/admin/enrollments" element={<ProtectedRoute allowedRoles={['admin']}><RegistryManager key="enrollments" kind="enrollments" /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><LecturerReports /></ProtectedRoute>} />
      <Route path="/admin/reports/:sessionId" element={<ProtectedRoute allowedRoles={['admin']}><LecturerReports /></ProtectedRoute>} />

      <Route path="/lecturer/dashboard" element={<ProtectedRoute allowedRoles={['lecturer']}><LecturerDashboard /></ProtectedRoute>} />
      <Route path="/lecturer/courses" element={<ProtectedRoute allowedRoles={['lecturer']}><LecturerCourses /></ProtectedRoute>} />
      <Route path="/lecturer/sessions" element={<ProtectedRoute allowedRoles={['lecturer']}><LecturerSessions /></ProtectedRoute>} />
      <Route path="/lecturer/reports" element={<ProtectedRoute allowedRoles={['lecturer']}><LecturerReports /></ProtectedRoute>} />
      <Route path="/lecturer/reports/:sessionId" element={<ProtectedRoute allowedRoles={['lecturer']}><LecturerReports /></ProtectedRoute>} />

      <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/courses" element={<ProtectedRoute allowedRoles={['student']}><StudentCourses /></ProtectedRoute>} />
      <Route path="/student/check-in" element={<ProtectedRoute allowedRoles={['student']}><StudentCheckIn /></ProtectedRoute>} />
      <Route path="/student/history" element={<ProtectedRoute allowedRoles={['student']}><StudentHistory /></ProtectedRoute>} />

      <Route path="/dashboard" element={<RoleRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

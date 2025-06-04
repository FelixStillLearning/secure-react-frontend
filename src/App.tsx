import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './components/notifications/NotificationSystem';
import ProtectedRoute from './components/security/ProtectedRoute';
import { UserRole } from './types/auth.types';

// Import pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard pages
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Patient pages
import PatientProfile from './pages/patient/PatientProfile';
import BookAppointment from './pages/patient/BookAppointment';
import AppointmentHistory from './pages/patient/AppointmentHistory';

// Doctor pages
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import PatientList from './pages/doctor/PatientList';

// Admin pages
import UserManagement from './pages/admin/UserManagement';
import SecurityLogs from './pages/admin/SecurityLogs';

// Error pages
import NotFoundPage from './pages/error/NotFoundPage';
import UnauthorizedPage from './pages/error/UnauthorizedPage';
import ServerErrorPage from './pages/error/ServerErrorPage';

// Layout components
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Error Boundary
import ErrorBoundary from './components/common/ErrorBoundary';

// Global styles and security
import './styles/globals.css';
import { SecurityUtils } from './utils/SecurityUtils';

// Initialize security on app start
SecurityUtils.initializeSecurity();

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Public/Guest Routes */}
              <Route
                path="/login"
                element={
                  <ProtectedRoute guestOnly requireAuth={false}>
                    <AuthLayout>
                      <LoginPage />
                    </AuthLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute guestOnly requireAuth={false}>
                    <AuthLayout>
                      <RegisterPage />
                    </AuthLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <ProtectedRoute guestOnly requireAuth={false}>
                    <AuthLayout>
                      <ForgotPasswordPage />
                    </AuthLayout>
                  </ProtectedRoute>
                }
              />

              {/* Patient Routes */}
              <Route
                path="/patient/dashboard"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.PATIENT]}>
                    <MainLayout>
                      <PatientDashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/profile"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.PATIENT]}>
                    <MainLayout>
                      <PatientProfile />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/book-appointment"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.PATIENT]}>
                    <MainLayout>
                      <BookAppointment />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient/appointments"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.PATIENT]}>
                    <MainLayout>
                      <AppointmentHistory />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Doctor Routes */}
              <Route
                path="/doctor/dashboard"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.DOCTOR]}>
                    <MainLayout>
                      <DoctorDashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/schedule"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.DOCTOR]}>
                    <MainLayout>
                      <DoctorSchedule />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/patients"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.DOCTOR]}>
                    <MainLayout>
                      <PatientList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                    <MainLayout>
                      <AdminDashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                    <MainLayout>
                      <UserManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/security-logs"
                element={
                  <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                    <MainLayout>
                      <SecurityLogs />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Error Pages */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/server-error" element={<ServerErrorPage />} />

              {/* Default Redirects */}
              <Route
                path="/"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Navigate to="/login" replace />
                  </ProtectedRoute>
                }
              />

              {/* 404 Page */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;

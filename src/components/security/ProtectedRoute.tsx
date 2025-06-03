import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/security';
import { UserRole } from '../../types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireAuth?: boolean;
  guestOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requireAuth = true,
  guestOnly = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log route access attempts for security auditing
    SecurityUtils.logSecurityEvent({
      event: 'route_access_attempt',
      data: {
        path: location.pathname,
        userRole: user?.role,
        isAuthenticated,
        requiredRoles,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: 'client-side' // Will be logged on backend
      }
    });
  }, [location.pathname, user?.role, isAuthenticated, requiredRoles]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Guest-only routes (login, register)
  if (guestOnly && isAuthenticated) {
    const redirectPath = user?.role === 'ADMIN' ? '/admin/dashboard' :
                        user?.role === 'DOCTOR' ? '/doctor/dashboard' :
                        '/patient/dashboard';
    
    SecurityUtils.logSecurityEvent({
      event: 'guest_route_access_denied',
      data: {
        path: location.pathname,
        userRole: user?.role,
        redirectTo: redirectPath
      }
    });

    return <Navigate to={redirectPath} replace />;
  }

  // Protected routes requiring authentication
  if (requireAuth && !isAuthenticated) {
    SecurityUtils.logSecurityEvent({
      event: 'unauthenticated_access_denied',
      data: {
        path: location.pathname,
        attemptedAccess: new Date().toISOString()
      }
    });

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (isAuthenticated && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.includes(user?.role as UserRole);
    
    if (!hasRequiredRole) {
      SecurityUtils.logSecurityEvent({
        event: 'unauthorized_role_access',
        data: {
          path: location.pathname,
          userRole: user?.role,
          requiredRoles,
          severity: 'HIGH'
        }
      });

      // Redirect to appropriate dashboard based on user role
      const redirectPath = user?.role === 'ADMIN' ? '/admin/dashboard' :
                          user?.role === 'DOCTOR' ? '/doctor/dashboard' :
                          '/patient/dashboard';

      return <Navigate to={redirectPath} replace />;
    }
  }

  // Additional security checks
  useEffect(() => {
    // Check for session tampering
    if (isAuthenticated && !SecurityUtils.validateSession()) {
      SecurityUtils.logSecurityEvent({
        event: 'session_tampering_detected',
        data: {
          path: location.pathname,
          userRole: user?.role,
          severity: 'CRITICAL'
        }
      });
      
      // Force logout on session tampering
      window.location.href = '/login';
      return;
    }

    // Update user activity
    if (isAuthenticated) {
      SecurityUtils.updateUserActivity();
    }
  }, [isAuthenticated, user, location.pathname]);

  return <>{children}</>;
};

export default ProtectedRoute;

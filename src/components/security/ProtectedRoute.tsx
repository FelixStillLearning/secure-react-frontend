import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
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
  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Log route access attempts for security auditing
    SecurityUtils.logSecurityEvent({
      action: 'route_access_attempt',
      success: true,
      details: {
        path: location.pathname,
        userRole: user?.role,
        isAuthenticated,
        requiredRoles,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: 'client-side' // Will be logged on backend
      },
      userId: user?.id
    });

    // Check for session tampering
    if (isAuthenticated && !SecurityUtils.validateSession()) {
      SecurityUtils.logSecurityEvent({
        action: 'session_tampering_detected',
        success: false,
        details: {
          path: location.pathname,
          userRole: user?.role,
          severity: 'CRITICAL'
        },
        userId: user?.id
      });
      
      // Force logout on session tampering
      window.location.href = '/login';
      return;
    }

    // Update user activity
    if (isAuthenticated) {
      SecurityUtils.updateUserActivity();
    }  }, [location.pathname, user?.role, isAuthenticated, requiredRoles, user?.id]);

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
    const redirectPath = user?.role === UserRole.ADMIN ? '/admin/dashboard' :
                        user?.role === UserRole.DOCTOR ? '/doctor/dashboard' :
                        '/patient/dashboard';
    
    SecurityUtils.logSecurityEvent({
      action: 'guest_route_access_denied',
      success: false,
      details: {
        path: location.pathname,
        userRole: user?.role,
        redirectTo: redirectPath
      },
      userId: user?.id
    });

    return <Navigate to={redirectPath} replace />;
  }
  // Protected routes requiring authentication
  if (requireAuth && !isAuthenticated) {
    SecurityUtils.logSecurityEvent({
      action: 'unauthenticated_access_denied',
      success: false,
      details: {
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
        action: 'unauthorized_role_access',
        success: false,
        details: {
          path: location.pathname,
          userRole: user?.role,
          requiredRoles,
          severity: 'HIGH'
        },
        userId: user?.id
      });

      // Redirect to appropriate dashboard based on user role
      const redirectPath = user?.role === UserRole.ADMIN ? '/admin/dashboard' :
                          user?.role === UserRole.DOCTOR ? '/doctor/dashboard' :
                          '/patient/dashboard';      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

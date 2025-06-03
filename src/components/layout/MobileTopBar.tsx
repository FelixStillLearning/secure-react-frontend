import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole as AuthUserRole } from '../../context/AuthContext';
import { UserRole } from '../../types/auth.types';

interface MobileTopBarProps {
  pageTitle?: string;
  showBackButton?: boolean;
  notificationCount?: number;
  onMenuToggle?: () => void;
  showSearch?: boolean;
  emergencyMode?: boolean;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({
  pageTitle,
  showBackButton = false,
  notificationCount = 0,
  onMenuToggle,
  showSearch = false,
  emergencyMode = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  const handleBack = () => {
    navigate(-1);
  };

  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    if (pathSegments.length > 2) {
      // Show role and current page
      const role = pathSegments[0];
      const currentPage = pathSegments[pathSegments.length - 1];
      
      breadcrumbs.push({
        label: role.charAt(0).toUpperCase() + role.slice(1),
        href: `/${role}/dashboard`,
      });
      
      if (currentPage !== 'dashboard') {
        breadcrumbs.push({
          label: currentPage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          href: location.pathname,
        });
      }
    }
    
    return breadcrumbs;
  };
  const breadcrumbs = generateBreadcrumbs();

  // Convert AuthContext UserRole to auth.types UserRole
  const convertUserRole = (authRole: AuthUserRole): UserRole => {
    switch (authRole) {
      case AuthUserRole.PATIENT:
        return 'PATIENT';
      case AuthUserRole.DOCTOR:
        return 'DOCTOR';
      case AuthUserRole.ADMIN:
        return 'ADMIN';
      default:
        return 'PATIENT';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800 border-red-200';
      case 'DOCTOR': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PATIENT': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Emergency Banner */}
      {emergencyMode && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-medium text-center md:hidden">
          <span className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Emergency Mode Active
          </span>
        </div>
      )}

      {/* Main Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 md:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Left Section */}
          <div className="flex items-center flex-1 min-w-0">
            {showBackButton ? (
              <button
                onClick={handleBack}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={onMenuToggle}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* Logo and Title */}
            <div className="flex items-center min-w-0 flex-1">
              <Link to={`/${user?.role?.toLowerCase()}/dashboard`} className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </Link>
              
              <div className="min-w-0 flex-1">
                {pageTitle ? (
                  <h1 className="text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-gray-900 truncate">MedSecure</span>
                    {breadcrumbs.length > 0 && (
                      <div className="flex items-center text-xs text-gray-500 truncate">
                        {breadcrumbs.map((crumb, index) => (
                          <React.Fragment key={crumb.href}>
                            <span className="truncate">{crumb.label}</span>
                            {index < breadcrumbs.length - 1 && (
                              <svg className="w-3 h-3 mx-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Search */}
            {showSearch && (
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}            {/* Emergency Button */}
            {(user?.role === AuthUserRole.PATIENT || user?.role === AuthUserRole.DOCTOR) && (
              <button
                onClick={() => navigate('/emergency')}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM7 7h5m0 0l-5-5v5z" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>

            {/* User Avatar */}
            <Link
              to={`/${user?.role?.toLowerCase()}/profile`}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
            >              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                {user?.username ? getInitials(user.username) : 'U'}
              </div>              {user?.role && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(convertUserRole(user.role))}`}>
                  {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search Input */}
        {showSearchInput && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onBlur={() => setShowSearchInput(false)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Safe area padding for devices with top notch */}
      <div className="h-[env(safe-area-inset-top)] bg-white md:hidden" />
    </>
  );
};

export default MobileTopBar;

import React, { useState, useEffect } from 'react';
import { useAuth, UserRole as AuthUserRole } from '../../context/AuthContext';
import { UserRole } from '../../types/auth.types';
import { useLocation } from 'react-router-dom';
import MobileTopBar from './MobileTopBar';
import MobileBottomTabs from './MobileBottomTabs';
import HamburgerMenu from './HamburgerMenu';
import FloatingActionButton from './FloatingActionButton';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  showBackButton?: boolean;
  showSearch?: boolean;
  emergencyMode?: boolean;
}

// Convert AuthContext UserRole to auth.types UserRole
const convertUserRole = (authRole: AuthUserRole): UserRole => {
  switch (authRole) {
    case AuthUserRole.PATIENT:
      return UserRole.PATIENT;
    case AuthUserRole.DOCTOR:
      return UserRole.DOCTOR;
    case AuthUserRole.ADMIN:
      return UserRole.ADMIN;
    default:
      return UserRole.PATIENT; // Default to PATIENT if role is unknown
  }
};

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  pageTitle,
  showBackButton = false,
  showSearch = false,
  emergencyMode = false,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notificationCount] = useState(3); // Placeholder
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  // Determine if current route should show mobile navigation
  const shouldShowMobileNav = () => {
    const hiddenRoutes = ['/login', '/register', '/forgot-password', '/verify-email'];
    return !hiddenRoutes.includes(location.pathname);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-sm font-medium text-center z-50">
          <span className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            You're offline. Some features may not be available.
          </span>
        </div>
      )}

      {/* Mobile Layout (< 640px) */}
      <div className="md:hidden">
        {shouldShowMobileNav() && (
          <>
            {/* Mobile Top Bar */}
            <MobileTopBar
              pageTitle={pageTitle}
              showBackButton={showBackButton}
              notificationCount={notificationCount}
              onMenuToggle={handleMenuToggle}
              showSearch={showSearch}
              emergencyMode={emergencyMode}
            />

            {/* Hamburger Menu */}
            <HamburgerMenu
              isOpen={isMenuOpen}
              onClose={handleMenuClose}
              appVersion="1.0.0"
            />
          </>
        )}

        {/* Main Content */}
        <main className={`
          ${shouldShowMobileNav() ? 'pt-16 pb-20' : ''} 
          ${!isOnline ? 'pt-12' : ''}
          min-h-screen
        `}>
          <div className="px-4 py-6">
            {children}
          </div>
        </main>        {/* Mobile Bottom Navigation */}
        {shouldShowMobileNav() && user && (
          <MobileBottomTabs
            userRole={convertUserRole(user.role)}
            notificationCount={notificationCount}
          />
        )}

        {/* Floating Action Button for Mobile */}
        {shouldShowMobileNav() && user && (
          <FloatingActionButton userRole={convertUserRole(user.role)} />
        )}
      </div>

      {/* Tablet Layout (640px - 1024px) */}
      <div className="hidden md:block lg:hidden">
        {/* Top Navigation Bar */}
        <Navbar />

        <div className="flex">          {/* Collapsible Side Navigation */}
          <div className="w-64 flex-shrink-0">
            <Sidebar userRole={user?.role ? convertUserRole(user.role) : UserRole.PATIENT} />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-screen">
            <main className="flex-1 p-6">
              <div className="max-w-6xl mx-auto">
                {/* Page Header for Tablet */}
                {pageTitle && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                      {showSearch && (
                        <div className="relative w-64">
                          <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>

      {/* Desktop Layout (> 1024px) */}
      <div className="hidden lg:block">
        {/* Full Desktop Navigation */}
        <Navbar />

        <div className="flex">          {/* Full Sidebar */}
          <Sidebar userRole={user?.role ? convertUserRole(user.role) : UserRole.PATIENT} />

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto">
                {/* Page Header for Desktop */}
                {pageTitle && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                        {showBackButton && (
                          <nav className="mt-2">
                            <ol className="flex items-center space-x-2 text-sm text-gray-500">
                              <li>
                                <a href={`/${user?.role?.toLowerCase()}/dashboard`} className="hover:text-gray-700">
                                  Dashboard
                                </a>
                              </li>
                              <li>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </li>
                              <li className="text-gray-900">{pageTitle}</li>
                            </ol>
                          </nav>
                        )}
                      </div>
                      {showSearch && (
                        <div className="relative w-96">
                          <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      {shouldShowMobileNav() && user && (
        <div className="md:hidden">
          {/* Emergency FAB for patients and doctors */}
          {(user.role === AuthUserRole.PATIENT || user.role === AuthUserRole.DOCTOR) && (
            <button
              onClick={() => window.location.href = '/emergency'}
              className="fixed bottom-20 right-4 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors z-30 flex items-center justify-center"
              style={{ 
                touchAction: 'manipulation',
                transform: 'translateZ(0)', // Optimize for mobile
              }}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponsiveLayout;

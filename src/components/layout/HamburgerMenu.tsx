import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole as AuthUserRole } from '../../context/AuthContext';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion?: string;
}

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ReactNode;
  action?: () => void;
  badge?: number;
  divider?: boolean;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ 
  isOpen, 
  onClose, 
  appVersion = "1.0.0" 
}) => {  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // No conversion needed as we're comparing with enum values directly

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Log security event
      console.log('User logout initiated:', {
        userId: user?.id,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      await logout();
      onClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
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

  const mainMenuItems: MenuItem[] = [
    {
      name: 'Help & Support',
      href: '/help-support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Privacy & Security',
      href: '/privacy-security',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      name: 'App Settings',
      href: '/app-settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: 'About',
      href: '/about',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      divider: true,
    },
  ];
  const quickActions: MenuItem[] = [
    ...(user?.role === AuthUserRole.PATIENT ? [
      {
        name: 'Emergency Contact',
        action: () => {
          navigate('/emergency');
          onClose();
        },
        icon: (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        name: 'Book Appointment',
        href: '/patient/book-appointment',
        icon: (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
      },    ] : []),
    ...(user?.role === AuthUserRole.DOCTOR ? [
      {
        name: 'Emergency Patients',
        href: '/doctor/emergency-patients',
        icon: (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        ),
      },
      {
        name: 'Schedule Management',
        href: '/doctor/schedule',
        icon: (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },    ] : []),
    ...(user?.role === AuthUserRole.ADMIN ? [
      {
        name: 'System Monitor',
        href: '/admin/system-monitor',
        icon: (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        name: 'Security Audit',
        href: '/admin/security-audit',
        icon: (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
    ] : []),
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" />
      
      {/* Menu */}
      <div
        ref={menuRef}
        className={`
          fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="bg-blue-600 px-6 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
            {/* User Profile Summary */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg font-semibold">
                {user.username ? getInitials(user.username) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.username || 'User'}</p>
                <p className="text-blue-100 text-sm truncate">{user.email}</p>
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full border bg-white text-gray-800`}>
                  {user.role?.charAt(0) + user.role?.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="space-y-1">
                {quickActions.map((item, index) => (
                  <React.Fragment key={item.name}>
                    {item.href ? (
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
                        style={{ touchAction: 'manipulation' }}
                      >
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <button
                        onClick={item.action}
                        className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left min-h-[44px]"
                        style={{ touchAction: 'manipulation' }}
                      >
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Main Menu */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="space-y-1">
              {mainMenuItems.map((item, index) => (
                <React.Fragment key={item.name}>
                  {item.href ? (
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  ) : (
                    <button
                      onClick={item.action}
                      className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left min-h-[44px]"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </button>
                  )}
                  {item.divider && <hr className="my-2 border-gray-200" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* App Info */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>MedSecure v{appVersion}</p>
              <p>© 2024 MedSecure Inc.</p>
              <button
                onClick={() => {
                  // Check for updates
                  onClose();
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Check for Updates
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Logout */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 min-h-[44px] font-medium"
            style={{ touchAction: 'manipulation' }}
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </>
            )}
          </button>
        </div>

        {/* Safe area padding */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
};

export default HamburgerMenu;

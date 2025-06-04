import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types/auth.types';

interface FloatingActionButtonProps {
  userRole: UserRole;
}

interface ActionItem {
  name: string;
  href?: string;
  action?: () => void;
  icon: React.ReactNode;
  color: string;
  urgent?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const getActions = (role: UserRole): ActionItem[] => {
    switch (role) {
      case UserRole.PATIENT:
        return [
          {
            name: 'Emergency',
            action: () => navigate('/emergency'),
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            ),
            color: 'bg-red-600 hover:bg-red-700',
            urgent: true,
          },
          {
            name: 'Book Appointment',
            href: '/patient/book-appointment',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ),
            color: 'bg-blue-600 hover:bg-blue-700',
          },
          {
            name: 'Quick Message',
            href: '/patient/messages/new',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
            color: 'bg-green-600 hover:bg-green-700',
          },        ];

      case UserRole.DOCTOR:
        return [
          {
            name: 'Emergency Patients',
            href: '/doctor/emergency-patients',
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            ),
            color: 'bg-red-600 hover:bg-red-700',
            urgent: true,
          },
          {
            name: 'Add Note',
            href: '/doctor/patients/add-note',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ),
            color: 'bg-blue-600 hover:bg-blue-700',
          },
          {
            name: 'Quick Schedule',
            href: '/doctor/schedule/quick-add',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: 'bg-green-600 hover:bg-green-700',
          },        ];

      case UserRole.ADMIN:
        return [
          {
            name: 'System Alert',
            href: '/admin/system-alerts',
            icon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ),
            color: 'bg-orange-600 hover:bg-orange-700',
            urgent: true,
          },
          {
            name: 'Add User',
            href: '/admin/users/add',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            ),
            color: 'bg-blue-600 hover:bg-blue-700',
          },
          {
            name: 'Quick Report',
            href: '/admin/reports/quick-generate',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            color: 'bg-green-600 hover:bg-green-700',
          },
        ];

      default:
        return [];
    }
  };

  const actions = getActions(userRole);

  const handleMainButtonClick = () => {
    if (actions.length === 1) {
      // If only one action, execute it directly
      const action = actions[0];
      if (action.href) {
        navigate(action.href);
      } else if (action.action) {
        action.action();
      }
    } else {
      // Toggle action menu
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action: ActionItem) => {
    if (action.href) {
      navigate(action.href);
    } else if (action.action) {
      action.action();
    }
    setIsOpen(false);
  };

  if (actions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-30 md:hidden">
      {/* Action Menu */}
      {isOpen && actions.length > 1 && (
        <div className="absolute bottom-16 right-0 space-y-3 mb-2">
          {actions.slice().reverse().map((action, index) => (
            <div
              key={action.name}
              className={`transform transition-all duration-200 ease-out`}
              style={{
                transform: `translateY(${isOpen ? 0 : 20}px)`,
                opacity: isOpen ? 1 : 0,
                transitionDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center space-x-3">
                {/* Action Label */}
                <div className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                  {action.name}
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => handleActionClick(action)}
                  className={`
                    w-12 h-12 rounded-full text-white shadow-lg active:scale-95 transition-all duration-200
                    ${action.color}
                    ${action.urgent ? 'animate-pulse' : ''}
                  `}
                  style={{ touchAction: 'manipulation' }}
                >
                  {action.icon}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainButtonClick}
        className={`
          w-14 h-14 rounded-full text-white shadow-lg active:scale-95 transition-all duration-200
          ${actions.length === 1 ? actions[0].color : 'bg-blue-600 hover:bg-blue-700'}
          ${actions.some(a => a.urgent) ? 'animate-pulse' : ''}
        `}
        style={{ touchAction: 'manipulation' }}
      >
        {actions.length === 1 ? (
          actions[0].icon
        ) : (
          <svg 
            className={`w-8 h-8 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </button>

      {/* Backdrop for closing menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingActionButton;

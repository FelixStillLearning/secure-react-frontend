import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastNotificationProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onRemove }) => {
  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.duration !== 0) {
        const timer = setTimeout(() => {
          onRemove(toast.id);
        }, toast.duration || 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [toasts, onRemove]);

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-600 text-white border-green-600';
      case 'error':
        return 'bg-red-600 text-white border-red-600';
      case 'warning':
        return 'bg-orange-600 text-white border-orange-600';
      case 'info':
      default:
        return 'bg-blue-600 text-white border-blue-600';
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 left-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`
            transform transition-all duration-300 ease-in-out pointer-events-auto
            ${getToastStyles(toast.type)}
            rounded-lg shadow-lg border-l-4 p-4
            animate-in slide-in-from-top-2
          `}
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: 'backwards',
          }}
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              {getIcon(toast.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-relaxed">
                {toast.message}
              </p>
              
              {/* Action Button */}
              {toast.action && (
                <div className="mt-3">
                  <button
                    onClick={toast.action.onClick}
                    className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          {toast.duration && toast.duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-20 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-white bg-opacity-40 transition-all ease-linear"
                style={{
                  width: '100%',
                  animation: `toast-progress ${toast.duration}ms linear forwards`,
                }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add the keyframes animation via style tag */}
      <style>
        {`
          @keyframes toast-progress {
            from { width: 100%; }
            to { width: 0%; }
          }
          
          @keyframes animate-in {
            from {
              opacity: 0;
              transform: translateY(-100%) translateX(-50%);
            }
            to {
              opacity: 1;
              transform: translateY(0) translateX(0);
            }
          }
          
          .animate-in {
            animation: animate-in 0.3s ease-out;
          }
          
          .slide-in-from-top-2 {
            transform: translateY(-0.5rem);
          }
        `}
      </style>
    </div>,
    document.body
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'success' });

  const error = (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'error' });

  const warning = (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'warning' });

  const info = (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'info' });

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastNotification toasts={toasts} onRemove={removeToast} />,
  };
};

export default ToastNotification;

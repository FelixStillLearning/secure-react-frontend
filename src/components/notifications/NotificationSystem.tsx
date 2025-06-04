import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
import apiClient from '../../api/axios.config';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const checkForNewNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications/new');
      if (response.data.length > 0) {
        setNotifications(prev => [...response.data, ...prev]);
      }
    } catch (error) {
      console.error('Failed to check for new notifications:', error);
    }
  };

  const setupWebSocketConnection = useCallback(() => {
    // WebSocket setup for real-time notifications would go here
    // For now, we'll simulate with periodic checks
    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      setupWebSocketConnection();
    }
  }, [user, setupWebSocketConnection]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);    // Log notification creation
    SecurityUtils.logSecurityEvent({
      action: 'notification_created',
      success: true,
      details: { 
        notificationType: notification.type,
        title: notification.title 
      },
      userId: user?.id
    });
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      await apiClient.delete('/notifications/all');
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  if (!isOpen) return null;
  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      info: 'fa-info-circle',
      success: 'fa-check-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-times-circle'
    };
    return icons[type] || 'fa-bell';
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="notification-actions">
          {unreadCount > 0 && (
            <button className="mark-all-read" onClick={markAllAsRead}>
              Mark all read
            </button>
          )}
          <button className="close-dropdown" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <i className="fas fa-bell-slash"></i>
            <p>No notifications</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.type} ${!notification.read ? 'unread' : ''}`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="notification-icon">
                <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
              </div>
              <div className="notification-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <div className="notification-meta">
                  <span className="timestamp">{formatTimeAgo(notification.timestamp)}</span>
                  {notification.actionUrl && notification.actionText && (
                    <a href={notification.actionUrl} className="notification-action">
                      {notification.actionText}
                    </a>
                  )}
                </div>
              </div>
              <div className="notification-controls">
                <button
                  className="remove-notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  title="Remove notification"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 10 && (
        <div className="notification-footer">
          <a href="/notifications" className="view-all">
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
};

interface ToastNotificationProps {
  notification: Notification;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-notification ${notification.type}`}>
      <div className="toast-icon">
        <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 
                            notification.type === 'error' ? 'fa-times-circle' :
                            notification.type === 'warning' ? 'fa-exclamation-triangle' :
                            'fa-info-circle'}`}></i>
      </div>
      <div className="toast-content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
      </div>
      <button className="toast-close" onClick={onClose}>
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

interface ToastContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onRemove }) => {
  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

// Hook for creating common notification types
export const useNotificationHelpers = () => {
  const { addNotification } = useNotifications();

  const showSuccess = (title: string, message: string, actionUrl?: string, actionText?: string) => {
    addNotification({ type: 'success', title, message, actionUrl, actionText });
  };

  const showError = (title: string, message: string, actionUrl?: string, actionText?: string) => {
    addNotification({ type: 'error', title, message, actionUrl, actionText });
  };

  const showWarning = (title: string, message: string, actionUrl?: string, actionText?: string) => {
    addNotification({ type: 'warning', title, message, actionUrl, actionText });
  };

  const showInfo = (title: string, message: string, actionUrl?: string, actionText?: string) => {
    addNotification({ type: 'info', title, message, actionUrl, actionText });
  };

  return { showSuccess, showError, showWarning, showInfo };
};

export default NotificationContext;

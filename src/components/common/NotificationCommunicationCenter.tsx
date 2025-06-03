import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../notifications/NotificationSystem';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';

// Enhanced notification interface for communication center
interface ExtendedNotification {
  id: string;
  type: 'appointment' | 'message' | 'system' | 'security' | 'billing' | 'review' | 'info' | 'success' | 'warning' | 'error';
  category: 'appointments' | 'messages' | 'system' | 'security' | 'billing' | 'reviews';
  title: string;
  message: string;
  content?: string; // Full content for expandable view
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
  sender?: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

interface MessageComposer {
  isOpen: boolean;
  recipient?: {
    id: string;
    name: string;
    role: string;
  };
  subject?: string;
  replyTo?: string;
}

interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    categories: string[];
  };
  sms: {
    enabled: boolean;
    number?: string;
    urgentOnly: boolean;
  };
  push: {
    enabled: boolean;
    categories: string[];
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: string[];
  };
  emergencyOverride: boolean;
}

const NotificationCommunicationCenter: React.FC = () => {
  const { user } = useAuth();
  const { notifications: basicNotifications, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  
  // State management
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<ExtendedNotification | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [messageComposer, setMessageComposer] = useState<MessageComposer>({ isOpen: false });
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: { enabled: true, frequency: 'immediate', categories: [] },
    sms: { enabled: false, urgentOnly: true },
    push: { enabled: true, categories: [] },
    doNotDisturb: { enabled: false, startTime: '22:00', endTime: '08:00', days: [] },
    emergencyOverride: true
  });
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Load enhanced notifications
  useEffect(() => {
    loadEnhancedNotifications();
    loadNotificationPreferences();
  }, [user]);

  const loadEnhancedNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/enhanced');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load enhanced notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const saveNotificationPreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await api.put('/notifications/preferences', newPreferences);
      setPreferences(newPreferences);
      
      // Log security event
      securityUtils.logSecurityEvent({
        type: 'NOTIFICATION_SETTINGS',
        details: { action: 'preferences_updated' },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  };

  // Category definitions based on user role
  const getAvailableCategories = () => {
    const baseCategories = [
      { id: 'all', label: 'All Notifications', icon: 'fa-bell' },
      { id: 'messages', label: 'Messages', icon: 'fa-envelope' },
      { id: 'system', label: 'System', icon: 'fa-cog' },
      { id: 'security', label: 'Security', icon: 'fa-shield-alt' }
    ];

    const roleSpecificCategories = {
      patient: [
        { id: 'appointments', label: 'Appointments', icon: 'fa-calendar' },
        { id: 'billing', label: 'Billing', icon: 'fa-credit-card' },
        { id: 'reviews', label: 'Reviews', icon: 'fa-star' }
      ],
      doctor: [
        { id: 'appointments', label: 'Appointments', icon: 'fa-calendar' },
        { id: 'reviews', label: 'Reviews', icon: 'fa-star' }
      ],
      admin: [
        { id: 'billing', label: 'Billing', icon: 'fa-credit-card' },
        { id: 'reviews', label: 'Reviews', icon: 'fa-star' }
      ]
    };

    return [...baseCategories, ...(roleSpecificCategories[user?.role as keyof typeof roleSpecificCategories] || [])];
  };

  // Filter notifications based on category and search
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.sender?.name.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, selectedCategory, searchQuery]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: ExtendedNotification) => {
    setSelectedNotification(notification);
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (selectedNotification?.id === id) {
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const sendMessage = async (messageData: {
    recipientId: string;
    subject: string;
    content: string;
    priority: string;
    attachments?: File[];
  }) => {
    try {
      setSendingMessage(true);
      const formData = new FormData();
      formData.append('recipientId', messageData.recipientId);
      formData.append('subject', messageData.subject);
      formData.append('content', messageData.content);
      formData.append('priority', messageData.priority);
      
      messageData.attachments?.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessageComposer({ isOpen: false });
      
      // Log security event
      securityUtils.logSecurityEvent({
        type: 'MESSAGE_SENT',
        details: { 
          action: 'message_sent',
          recipientId: messageData.recipientId,
          subject: messageData.subject
        },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getNotificationIcon = (notification: ExtendedNotification) => {
    const iconMap = {
      appointment: 'fa-calendar',
      message: 'fa-envelope',
      system: 'fa-cog',
      security: 'fa-shield-alt',
      billing: 'fa-credit-card',
      review: 'fa-star',
      info: 'fa-info-circle',
      success: 'fa-check-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-times-circle'
    };
    return iconMap[notification.type] || 'fa-bell';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    };
    return colorMap[priority as keyof typeof colorMap] || 'text-gray-500';
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

  const getRoleBasedActions = (notification: ExtendedNotification) => {
    const actions = [];

    if (user?.role === 'patient') {
      if (notification.category === 'appointments') {
        actions.push(
          { label: 'Confirm', action: () => {}, icon: 'fa-check', variant: 'success' },
          { label: 'Reschedule', action: () => {}, icon: 'fa-calendar-alt', variant: 'primary' }
        );
      }
      if (notification.category === 'messages') {
        actions.push(
          { label: 'Reply', action: () => {}, icon: 'fa-reply', variant: 'primary' }
        );
      }
    }

    if (user?.role === 'doctor') {
      if (notification.category === 'appointments') {
        actions.push(
          { label: 'Approve', action: () => {}, icon: 'fa-check', variant: 'success' },
          { label: 'Reschedule', action: () => {}, icon: 'fa-calendar-alt', variant: 'warning' }
        );
      }
    }

    if (user?.role === 'admin') {
      actions.push(
        { label: 'Review', action: () => {}, icon: 'fa-eye', variant: 'primary' },
        { label: 'Resolve', action: () => {}, icon: 'fa-check', variant: 'success' }
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="notification-communication-center bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Notifications & Messages
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMessageComposer({ isOpen: true })}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              New Message
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setShowPreferences(true)}
              className="text-gray-600 hover:text-gray-800 p-2 rounded-md hover:bg-gray-100"
              title="Notification Preferences"
            >
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {getAvailableCategories().map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className={`fas ${category.icon} mr-2`}></i>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-96">
        {/* Notification List */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <i className="fas fa-bell-slash text-4xl mb-4"></i>
              <p>No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  } ${selectedNotification?.id === notification.id ? 'bg-blue-100' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      notification.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                      notification.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <i className={`fas ${getNotificationIcon(notification)} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          {notification.priority === 'urgent' && (
                            <i className="fas fa-exclamation-circle text-red-500 text-xs"></i>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {notification.message}
                      </p>
                      {notification.sender && (
                        <p className="text-xs text-gray-500 mt-1">
                          From: {notification.sender.name} ({notification.sender.role})
                        </p>
                      )}
                      {notification.attachments && notification.attachments.length > 0 && (
                        <div className="flex items-center mt-2">
                          <i className="fas fa-paperclip text-xs text-gray-400 mr-1"></i>
                          <span className="text-xs text-gray-500">
                            {notification.attachments.length} attachment(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Details */}
        <div className="w-1/2 overflow-y-auto">
          {selectedNotification ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPriorityColor(selectedNotification.priority)} bg-current bg-opacity-10`}>
                    <i className={`fas ${getNotificationIcon(selectedNotification)}`}></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedNotification.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatTimeAgo(selectedNotification.timestamp)} • {selectedNotification.priority} priority
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => deleteNotification(selectedNotification.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete notification"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              {selectedNotification.sender && (
                <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-md">
                  {selectedNotification.sender.avatar ? (
                    <img
                      src={selectedNotification.sender.avatar}
                      alt={selectedNotification.sender.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <i className="fas fa-user text-gray-600 text-sm"></i>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedNotification.sender.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedNotification.sender.role}
                    </p>
                  </div>
                </div>
              )}

              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedNotification.content || selectedNotification.message}
                </p>
              </div>

              {selectedNotification.attachments && selectedNotification.attachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Attachments</h4>
                  <div className="space-y-2">
                    {selectedNotification.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                        <div className="flex items-center space-x-3">
                          <i className="fas fa-file text-gray-400"></i>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(1)} KB • {attachment.type}
                            </p>
                          </div>
                        </div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role-based Actions */}
              <div className="flex flex-wrap gap-2">
                {getRoleBasedActions(selectedNotification).map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      action.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                      action.variant === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                      action.variant === 'warning' ? 'bg-yellow-600 text-white hover:bg-yellow-700' :
                      'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    <i className={`fas ${action.icon} mr-2`}></i>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <i className="fas fa-envelope-open text-4xl mb-4"></i>
              <p>Select a notification to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Composer Modal */}
      {messageComposer.isOpen && (
        <MessageComposerModal
          isOpen={messageComposer.isOpen}
          onClose={() => setMessageComposer({ isOpen: false })}
          onSend={sendMessage}
          initialRecipient={messageComposer.recipient}
          initialSubject={messageComposer.subject}
          replyTo={messageComposer.replyTo}
          isSending={sendingMessage}
        />
      )}

      {/* Notification Preferences Modal */}
      {showPreferences && (
        <NotificationPreferencesModal
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
          preferences={preferences}
          onSave={saveNotificationPreferences}
        />
      )}
    </div>
  );
};

// Message Composer Modal Component
interface MessageComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (messageData: any) => void;
  initialRecipient?: { id: string; name: string; role: string };
  initialSubject?: string;
  replyTo?: string;
  isSending: boolean;
}

const MessageComposerModal: React.FC<MessageComposerModalProps> = ({
  isOpen,
  onClose,
  onSend,
  initialRecipient,
  initialSubject,
  replyTo,
  isSending
}) => {
  const [formData, setFormData] = useState({
    recipientId: initialRecipient?.id || '',
    subject: initialSubject || '',
    content: '',
    priority: 'medium',
    attachments: [] as File[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(e.target.files!)]
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {replyTo ? 'Reply to Message' : 'New Message'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient
              </label>
              <input
                type="text"
                value={formData.recipientId}
                onChange={(e) => setFormData(prev => ({ ...prev, recipientId: e.target.value }))}
                placeholder="Enter recipient ID or search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter subject..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your message..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-gray-600">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          attachments: prev.attachments.filter((_, i) => i !== index)
                        }))}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-2"></i>
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Notification Preferences Modal Component
interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
}

const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSave
}) => {
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleSave = () => {
    onSave(localPreferences);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Notification Preferences
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="space-y-6">
            {/* Email Preferences */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Email Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localPreferences.email.enabled}
                    onChange={(e) => setLocalPreferences(prev => ({
                      ...prev,
                      email: { ...prev.email, enabled: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable email notifications</span>
                </label>
                
                {localPreferences.email.enabled && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={localPreferences.email.frequency}
                      onChange={(e) => setLocalPreferences(prev => ({
                        ...prev,
                        email: { ...prev.email, frequency: e.target.value as any }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly digest</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* SMS Preferences */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">SMS Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localPreferences.sms.enabled}
                    onChange={(e) => setLocalPreferences(prev => ({
                      ...prev,
                      sms: { ...prev.sms, enabled: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable SMS notifications</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localPreferences.sms.urgentOnly}
                    onChange={(e) => setLocalPreferences(prev => ({
                      ...prev,
                      sms: { ...prev.sms, urgentOnly: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Urgent notifications only</span>
                </label>
              </div>
            </div>

            {/* Push Preferences */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Push Notifications</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localPreferences.push.enabled}
                  onChange={(e) => setLocalPreferences(prev => ({
                    ...prev,
                    push: { ...prev.push, enabled: e.target.checked }
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable push notifications</span>
              </label>
            </div>

            {/* Do Not Disturb */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Do Not Disturb</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={localPreferences.doNotDisturb.enabled}
                    onChange={(e) => setLocalPreferences(prev => ({
                      ...prev,
                      doNotDisturb: { ...prev.doNotDisturb, enabled: e.target.checked }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable quiet hours</span>
                </label>
                
                {localPreferences.doNotDisturb.enabled && (
                  <div className="ml-6 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={localPreferences.doNotDisturb.startTime}
                        onChange={(e) => setLocalPreferences(prev => ({
                          ...prev,
                          doNotDisturb: { ...prev.doNotDisturb, startTime: e.target.value }
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={localPreferences.doNotDisturb.endTime}
                        onChange={(e) => setLocalPreferences(prev => ({
                          ...prev,
                          doNotDisturb: { ...prev.doNotDisturb, endTime: e.target.value }
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Override */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localPreferences.emergencyOverride}
                  onChange={(e) => setLocalPreferences(prev => ({
                    ...prev,
                    emergencyOverride: e.target.checked
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Allow emergency notifications to override all settings
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCommunicationCenter;

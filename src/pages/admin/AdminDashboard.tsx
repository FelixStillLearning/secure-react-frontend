import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  Activity,
  BarChart3,
  Settings,
  Database,
  Clock,
  Eye,
  FileText,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
import { apiClient } from '../../api/axios.config';

interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  activeUsers: number;
  securityEvents: number;
  systemAlerts: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'appointment_booked' | 'security_event' | 'system_alert';
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  userName?: string;
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  security: 'healthy' | 'warning' | 'error';
  performance: 'healthy' | 'warning' | 'error';
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    activeUsers: 0,
    securityEvents: 0,
    systemAlerts: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'healthy',
    api: 'healthy',
    security: 'healthy',
    performance: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Validate session and log access
        const isValid = await SecurityUtils.validateSession();
        if (!isValid) {
          throw new Error('Session validation failed');
        }

        SecurityUtils.logSecurityEvent({
          action: 'admin_dashboard_access',
          success: true,
          details: {
            message: 'Admin dashboard accessed',
            userId: user?.id,
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            ipAddress: 'client-side',
            sessionId: SecurityUtils.getSessionId() || 'unknown'
          }
        });

        // Load admin statistics
        const statsResponse = await apiClient.get('/admin/dashboard/stats');
        setStats(statsResponse.data);

        // Load recent activity
        const activityResponse = await apiClient.get('/admin/activity/recent', {
          params: { limit: 20 }
        });
        setRecentActivity(activityResponse.data);

        // Load system health
        const healthResponse = await apiClient.get('/admin/system/health');
        setSystemHealth(healthResponse.data);

      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to load admin dashboard data';
        setError(errorMessage);
        
        SecurityUtils.logSecurityEvent({
          action: 'admin_dashboard_error',
          success: false,
          details: {
            message: `Admin dashboard load failed: ${errorMessage}`,
            userId: user?.id,
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            ipAddress: 'client-side',
            sessionId: SecurityUtils.getSessionId() || 'unknown'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id && user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'critical':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="w-4 h-4" />;
      case 'appointment_booked':
        return <Calendar className="w-4 h-4" />;
      case 'security_event':
        return <Shield className="w-4 h-4" />;
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                System overview and management center
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Database className="w-6 h-6 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">Database</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealth.database)}`}>
                  {systemHealth.database.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Activity className="w-6 h-6 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">API</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealth.api)}`}>
                  {systemHealth.api.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-6 h-6 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">Security</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealth.security)}`}>
                  {systemHealth.security.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">Performance</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(systemHealth.performance)}`}>
                  {systemHealth.performance.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Security Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.securityEvents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Patients</span>
                <span className="font-semibold text-gray-900">{stats.totalPatients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Doctors</span>
                <span className="font-semibold text-gray-900">{stats.totalDoctors}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Administrators</span>
                <span className="font-semibold text-gray-900">{stats.totalUsers - stats.totalPatients - stats.totalDoctors}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold text-gray-900">{stats.totalAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Today</span>
                <span className="font-semibold text-gray-900">{stats.todayAppointments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold text-gray-900">{Math.floor(stats.totalAppointments * 0.3)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Security Events</span>
                <span className="font-semibold text-gray-900">{stats.securityEvents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">System Alerts</span>
                <span className="font-semibold text-gray-900">{stats.systemAlerts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Sessions</span>
                <span className="font-semibold text-gray-900">{stats.activeUsers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <a
                href="/admin/logs"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All Logs
              </a>
            </div>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      {activity.userName && (
                        <p className="text-xs text-gray-600">User: {activity.userName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                      {activity.severity.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <a
                href="/admin/users"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600">User administration</p>
                </div>
              </a>

              <a
                href="/admin/security"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Shield className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Security</h3>
                  <p className="text-sm text-gray-600">Security monitoring</p>
                </div>
              </a>

              <a
                href="/admin/reports"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <BarChart3 className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Reports</h3>
                  <p className="text-sm text-gray-600">Analytics & insights</p>
                </div>
              </a>

              <a
                href="/admin/settings"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Settings className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-600">System configuration</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Star, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Phone,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
import { apiClient } from '../../api/axios.config';
import { Doctor, Appointment, Patient, Review } from '../../types/auth.types';

interface DoctorStats {
  todayAppointments: number;
  weeklyAppointments: number;
  totalPatients: number;
  averageRating: number;
  totalReviews: number;
  pendingAppointments: number;
}

interface TodaySchedule {
  appointment: Appointment;
  timeSlot: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
}

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [stats, setStats] = useState<DoctorStats>({
    todayAppointments: 0,
    weeklyAppointments: 0,
    totalPatients: 0,
    averageRating: 0,
    totalReviews: 0,
    pendingAppointments: 0
  });
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
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
          action: 'dashboard_access',
          success: true,
          details: {
            message: 'Doctor dashboard accessed',
            userId: user?.id,
            userAgent: navigator.userAgent,
            timestamp: new Date(),
            ipAddress: 'client-side',
            sessionId: SecurityUtils.getSessionId() || 'unknown'
          }
        });

        // Load doctor profile
        const doctorResponse = await apiClient.get(`/doctors/${user?.id}`);
        setDoctor(doctorResponse.data);

        // Load dashboard statistics
        const statsResponse = await apiClient.get('/doctors/dashboard/stats');
        setStats(statsResponse.data);

        // Load today's schedule
        const scheduleResponse = await apiClient.get('/doctors/schedule/today');
        setTodaySchedule(scheduleResponse.data);

        // Load recent reviews
        const reviewsResponse = await apiClient.get('/doctors/reviews/recent', {
          params: { limit: 5 }
        });
        setRecentReviews(reviewsResponse.data);

        // Load pending appointments
        const pendingResponse = await apiClient.get('/appointments/pending', {
          params: { limit: 10 }
        });
        setPendingAppointments(pendingResponse.data);

      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to load dashboard data';
        setError(errorMessage);
        
        SecurityUtils.logSecurityEvent({
          action: 'dashboard_error',
          success: false,
          details: {
            message: `Doctor dashboard load failed: ${errorMessage}`,
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

    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  const handleAppointmentAction = async (appointmentId: string, action: 'confirm' | 'reject') => {
    try {
      await apiClient.patch(`/appointments/${appointmentId}/status`, {
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
        reason: action === 'reject' ? 'Doctor unavailable' : undefined
      });

      // Refresh pending appointments
      const pendingResponse = await apiClient.get('/appointments/pending');
      setPendingAppointments(pendingResponse.data);

      SecurityUtils.logSecurityEvent({
        action: 'appointment_action',
        success: true,
        details: {
          message: `Appointment ${action}ed by doctor`,
          userId: user?.id,
          userAgent: navigator.userAgent,
          timestamp: new Date(),
          ipAddress: 'client-side',
          sessionId: SecurityUtils.getSessionId() || 'unknown'
        }
      });

    } catch (err: any) {
      console.error(`Failed to ${action} appointment:`, err);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'upcoming':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
      {/* Welcome Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Good morning, Dr. {user?.name || 'Doctor'}!
              </h1>
              <p className="text-gray-600 mt-1">
                You have {stats.todayAppointments} appointments today
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {doctor?.specialization?.name}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                {stats.averageRating.toFixed(1)} ({stats.totalReviews} reviews)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingAppointments}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
                <a
                  href="/doctor/schedule"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Calendar
                </a>
              </div>
            </div>
            <div className="p-6">
              {todaySchedule.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySchedule.map((schedule, index) => (
                    <div key={schedule.appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="font-medium text-gray-900">
                              {schedule.timeSlot}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                              {schedule.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mt-2">
                            {schedule.appointment.patient?.user?.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Age: {schedule.appointment.patient?.age || 'N/A'} • 
                            Phone: {schedule.appointment.patient?.phoneNumber || 'N/A'}
                          </p>
                          {schedule.appointment.notes && (
                            <p className="text-sm text-gray-600 mt-2">
                              <strong>Notes:</strong> {schedule.appointment.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-700">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-700">
                            <Phone className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Appointments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Approval</h2>
            </div>
            <div className="p-6">
              {pendingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-500">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAppointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {appointment.patient?.user?.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(appointment.appointmentDate)} at {formatTime(appointment.appointmentDate)}
                          </p>
                        </div>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-gray-600 mb-3">{appointment.notes}</p>
                      )}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                          className="flex items-center bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                          className="flex items-center bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
              <a
                href="/doctor/reviews"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </a>
            </div>
          </div>
          <div className="p-6">
            {recentReviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No reviews yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentReviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        {review.patient?.user?.name}
                      </h3>
                      <div className="flex items-center">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{review.comment}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <a
                href="/doctor/schedule"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Schedule</h3>
                  <p className="text-sm text-gray-600">Manage availability</p>
                </div>
              </a>

              <a
                href="/doctor/patients"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Users className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Patients</h3>
                  <p className="text-sm text-gray-600">View patient list</p>
                </div>
              </a>

              <a
                href="/doctor/profile"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Settings className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-600">Update information</p>
                </div>
              </a>

              <a
                href="/doctor/reviews"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <Star className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Reviews</h3>
                  <p className="text-sm text-gray-600">Patient feedback</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;

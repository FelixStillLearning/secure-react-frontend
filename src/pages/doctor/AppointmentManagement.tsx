import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';
import { Appointment, Patient } from '../../types/auth.types';

interface AppointmentWithPatient extends Appointment {
  patient: Patient;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  appointments: AppointmentWithPatient[];
}

const DoctorAppointmentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'today'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [appointments, filters]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctors/appointments');
      setAppointments(response.data);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS',
        details: { action: 'view_doctor_appointments', appointmentCount: response.data.length },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...appointments];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === filters.status);
    }

    // Date range filter
    const today = new Date();
    if (filters.dateRange === 'today') {
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.appointmentDate);
        return appointmentDate.toDateString() === today.toDateString();
      });
    } else if (filters.dateRange === 'week') {
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.appointmentDate);
        return appointmentDate >= today && appointmentDate <= nextWeek;
      });
    }

    // Sort by date
    filtered.sort((a, b) => 
      new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
    );

    setFilteredAppointments(filtered);
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes) updateData.doctorNotes = notes;

      await api.patch(`/appointments/${appointmentId}`, updateData);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_MODIFICATION',
        details: { action: 'update_appointment_status', appointmentId, newStatus: status },
        severity: 'medium',
        userId: user?.id
      });
      
      loadAppointments();
      setShowAppointmentModal(false);
    } catch (error) {
      console.error('Failed to update appointment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      scheduled: 'status-scheduled',
      confirmed: 'status-confirmed',
      in_progress: 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      no_show: 'status-no-show'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status.toLowerCase()] || 'status-default'}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTodaysAppointments = () => {
    const today = new Date();
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      return appointmentDate.toDateString() === today.toDateString();
    }).sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      const dayAppointments = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.appointmentDate);
        return appointmentDate.toDateString() === current.toDateString();
      });
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        appointments: dayAppointments
      });
      
      current.setDate(current.getDate() + 1);
      if (days.length > 42) break; // Safety limit
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading appointments...</p>
      </div>
    );
  }

  const todaysAppointments = getTodaysAppointments();
  const calendarDays = generateCalendarDays();

  return (
    <div className="doctor-appointment-management">
      <div className="page-header">
        <h1>Appointment Management</h1>
        <div className="view-controls">
          <button 
            className={viewMode === 'today' ? 'active' : ''}
            onClick={() => setViewMode('today')}
          >
            <i className="fas fa-clock"></i>
            Today
          </button>
          <button 
            className={viewMode === 'calendar' ? 'active' : ''}
            onClick={() => setViewMode('calendar')}
          >
            <i className="fas fa-calendar"></i>
            Calendar
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <i className="fas fa-list"></i>
            List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        {viewMode === 'list' && (
          <div className="filter-group">
            <label>Date Range:</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
            </select>
          </div>
        )}
      </div>

      {/* Today's Schedule View */}
      {viewMode === 'today' && (
        <div className="todays-schedule">
          <div className="schedule-header">
            <h2>Today's Schedule - {new Date().toLocaleDateString()}</h2>
            <div className="schedule-stats">
              <div className="stat-item">
                <span className="stat-number">{todaysAppointments.length}</span>
                <span className="stat-label">Total Appointments</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {todaysAppointments.filter(a => a.status === 'completed').length}
                </span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {todaysAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}
                </span>
                <span className="stat-label">Upcoming</span>
              </div>
            </div>
          </div>

          <div className="timeline-schedule">
            {todaysAppointments.length === 0 ? (
              <div className="no-appointments">
                <i className="fas fa-calendar-check"></i>
                <h3>No appointments today</h3>
                <p>You have a free day!</p>
              </div>
            ) : (
              todaysAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`timeline-appointment ${appointment.status}`}
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setShowAppointmentModal(true);
                  }}
                >
                  <div className="appointment-time">
                    {formatTime(appointment.appointmentDate)}
                  </div>
                  <div className="appointment-content">
                    <div className="patient-info">
                      <h4>{appointment.patient.firstName} {appointment.patient.lastName}</h4>
                      <p>Age: {appointment.patient.dateOfBirth ? 
                        new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear() : 'N/A'}</p>
                      {appointment.patient.phoneNumber && (
                        <p>Phone: {appointment.patient.phoneNumber}</p>
                      )}
                    </div>
                    <div className="appointment-details">
                      {getStatusBadge(appointment.status)}
                      {appointment.appointmentType && (
                        <span className="appointment-type">{appointment.appointmentType}</span>
                      )}
                    </div>
                  </div>
                  {appointment.notes && (
                    <div className="appointment-notes">
                      <i className="fas fa-sticky-note"></i>
                      {appointment.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="calendar-view">
          <div className="calendar-header">
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <h2>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday-header">{day}</div>
              ))}
            </div>
            <div className="calendar-days">
              {calendarDays.map((day, index) => (
                <div 
                  key={index} 
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${
                    day.date.toDateString() === new Date().toDateString() ? 'today' : ''
                  }`}
                >
                  <div className="day-number">{day.date.getDate()}</div>
                  <div className="day-appointments">
                    {day.appointments.slice(0, 3).map((appointment) => (
                      <div 
                        key={appointment.id}
                        className={`mini-appointment ${appointment.status}`}
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentModal(true);
                        }}
                      >
                        <span className="appointment-time">
                          {formatTime(appointment.appointmentDate)}
                        </span>
                        <span className="patient-name">
                          {appointment.patient.firstName} {appointment.patient.lastName}
                        </span>
                      </div>
                    ))}
                    {day.appointments.length > 3 && (
                      <div className="more-appointments">
                        +{day.appointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="list-view">
          <div className="appointments-list">
            {filteredAppointments.length === 0 ? (
              <div className="no-appointments">
                <i className="fas fa-calendar-times"></i>
                <h3>No appointments found</h3>
                <p>No appointments match your current filters.</p>
              </div>
            ) : (
              filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`appointment-card ${appointment.status}`}
                  onClick={() => {
                    setSelectedAppointment(appointment);
                    setShowAppointmentModal(true);
                  }}
                >
                  <div className="appointment-header">
                    <div className="patient-info">
                      <h3>{appointment.patient.firstName} {appointment.patient.lastName}</h3>
                      <p>{appointment.patient.phoneNumber}</p>
                    </div>
                    <div className="appointment-status">
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>

                  <div className="appointment-details">
                    <div className="appointment-time">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{formatDateTime(appointment.appointmentDate)}</span>
                    </div>
                    {appointment.appointmentType && (
                      <div className="appointment-type">
                        <i className="fas fa-stethoscope"></i>
                        <span>{appointment.appointmentType}</span>
                      </div>
                    )}
                  </div>

                  {appointment.notes && (
                    <div className="appointment-notes">
                      <i className="fas fa-sticky-note"></i>
                      <span>{appointment.notes}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal-content appointment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Appointment Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAppointmentModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="appointment-details-modal">
                <div className="patient-section">
                  <h3>Patient Information</h3>
                  <div className="patient-details">
                    <p><strong>Name:</strong> {selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}</p>
                    <p><strong>Phone:</strong> {selectedAppointment.patient.phoneNumber}</p>
                    <p><strong>Email:</strong> {selectedAppointment.patient.user?.email}</p>
                    {selectedAppointment.patient.dateOfBirth && (
                      <p><strong>Age:</strong> {new Date().getFullYear() - new Date(selectedAppointment.patient.dateOfBirth).getFullYear()} years</p>
                    )}
                    {selectedAppointment.patient.gender && (
                      <p><strong>Gender:</strong> {selectedAppointment.patient.gender}</p>
                    )}
                    {selectedAppointment.patient.allergies && (
                      <p><strong>Allergies:</strong> {selectedAppointment.patient.allergies}</p>
                    )}
                  </div>
                </div>

                <div className="appointment-section">
                  <h3>Appointment Information</h3>
                  <div className="appointment-info">
                    <p><strong>Date & Time:</strong> {formatDateTime(selectedAppointment.appointmentDate)}</p>
                    <p><strong>Status:</strong> {getStatusBadge(selectedAppointment.status)}</p>
                    {selectedAppointment.appointmentType && (
                      <p><strong>Type:</strong> {selectedAppointment.appointmentType}</p>
                    )}
                    {selectedAppointment.notes && (
                      <p><strong>Patient Notes:</strong> {selectedAppointment.notes}</p>
                    )}
                    {selectedAppointment.doctorNotes && (
                      <p><strong>Doctor Notes:</strong> {selectedAppointment.doctorNotes}</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="appointment-actions">
                  {selectedAppointment.status === 'scheduled' && (
                    <>
                      <button
                        className="btn btn-success"
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                      >
                        <i className="fas fa-check"></i>
                        Confirm
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in_progress')}
                      >
                        <i className="fas fa-play"></i>
                        Start Consultation
                      </button>
                    </>
                  )}
                  
                  {selectedAppointment.status === 'confirmed' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in_progress')}
                    >
                      <i className="fas fa-play"></i>
                      Start Consultation
                    </button>
                  )}

                  {selectedAppointment.status === 'in_progress' && (
                    <button
                      className="btn btn-success"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed', 'Consultation completed')}
                    >
                      <i className="fas fa-check-circle"></i>
                      Complete
                    </button>
                  )}

                  {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed') && (
                    <button
                      className="btn btn-warning"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'no_show')}
                    >
                      <i className="fas fa-user-times"></i>
                      Mark No Show
                    </button>
                  )}

                  <button
                    className="btn btn-danger"
                    onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                  >
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentManagementPage;

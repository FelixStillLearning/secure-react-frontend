import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';
import { Appointment, Doctor, Review } from '../../types/auth.types';

interface AppointmentWithDoctor extends Appointment {
  doctor: Doctor;
}

interface AppointmentFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  doctorId: string;
}

const AppointmentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDoctor[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDoctor | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [filters, setFilters] = useState<AppointmentFilters>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    doctorId: ''
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
      const response = await api.get('/patients/appointments/history');
      setAppointments(response.data);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS',
        details: { action: 'view_appointment_history', appointmentCount: response.data.length },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to load appointments:', error);
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS_ERROR',
        details: { action: 'load_appointment_history', error: error.message },
        severity: 'medium',
        userId: user?.id
      });
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
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(appointment => 
        new Date(appointment.appointmentDate) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(appointment => 
        new Date(appointment.appointmentDate) <= toDate
      );
    }

    // Doctor filter
    if (filters.doctorId) {
      filtered = filtered.filter(appointment => appointment.doctor.id === filters.doctorId);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => 
      new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
    );

    setFilteredAppointments(filtered);
  };

  const handleAppointmentClick = (appointment: AppointmentWithDoctor) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
    
    securityUtils.logSecurityEvent({
      type: 'DATA_ACCESS',
      details: { action: 'view_appointment_details', appointmentId: appointment.id },
      severity: 'low',
      userId: user?.id
    });
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await api.patch(`/appointments/${appointmentId}/cancel`);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_MODIFICATION',
        details: { action: 'cancel_appointment', appointmentId },
        severity: 'medium',
        userId: user?.id
      });
      
      loadAppointments();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    }
  };

  const handleRescheduleAppointment = (appointmentId: string) => {
    // Navigate to booking page with reschedule mode
    window.location.href = `/book-appointment?reschedule=${appointmentId}`;
  };

  const handleLeaveReview = (appointment: AppointmentWithDoctor) => {
    setSelectedAppointment(appointment);
    setShowReviewModal(true);
    setReviewData({ rating: 5, comment: '' });
  };

  const submitReview = async () => {
    if (!selectedAppointment) return;

    try {
      const sanitizedData = {
        rating: Math.max(1, Math.min(5, reviewData.rating)),
        comment: securityUtils.sanitizeInput(reviewData.comment),
        appointmentId: selectedAppointment.id,
        doctorId: selectedAppointment.doctor.id
      };

      await api.post('/reviews', sanitizedData);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_CREATION',
        details: { 
          action: 'create_review', 
          appointmentId: selectedAppointment.id,
          doctorId: selectedAppointment.doctor.id,
          rating: sanitizedData.rating
        },
        severity: 'low',
        userId: user?.id
      });

      setShowReviewModal(false);
      loadAppointments();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      scheduled: 'status-scheduled',
      confirmed: 'status-confirmed',
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const handleFilterChange = (key: keyof AppointmentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      doctorId: ''
    });
  };

  const canCancelAppointment = (appointment: AppointmentWithDoctor) => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    return (
      (appointment.status === 'scheduled' || appointment.status === 'confirmed') &&
      hoursDiff > 24 // Can cancel if more than 24 hours away
    );
  };

  const canReschedule = (appointment: AppointmentWithDoctor) => {
    return canCancelAppointment(appointment);
  };

  const canLeaveReview = (appointment: AppointmentWithDoctor) => {
    return appointment.status === 'completed' && !appointment.hasReview;
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading appointment history...</p>
      </div>
    );
  }

  const uniqueDoctors = Array.from(
    new Set(appointments.map(a => a.doctor.id))
  ).map(id => appointments.find(a => a.doctor.id === id)?.doctor).filter(Boolean);

  return (
    <div className="appointment-history-page">
      <div className="page-header">
        <h1>Appointment History</h1>
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-number">{appointments.length}</span>
            <span className="stat-label">Total Appointments</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{appointments.filter(a => a.status === 'completed').length}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length}</span>
            <span className="stat-label">Upcoming</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{appointments.filter(a => a.status === 'cancelled').length}</span>
            <span className="stat-label">Cancelled</span>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-controls">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          <select
            value={filters.doctorId}
            onChange={(e) => handleFilterChange('doctorId', e.target.value)}
          >
            <option value="">All Doctors</option>
            {uniqueDoctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.name} - {doctor.specialization}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            placeholder="From date"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            placeholder="To date"
          />

          <button className="clear-filters" onClick={clearFilters}>
            <i className="fas fa-times"></i>
            Clear
          </button>
        </div>
      </div>

      <div className="appointments-list">
        {filteredAppointments.length === 0 ? (
          <div className="no-appointments">
            <i className="fas fa-calendar-times"></i>
            <h3>No appointments found</h3>
            <p>
              {filters.status !== 'all' || filters.dateFrom || filters.dateTo || filters.doctorId
                ? 'Try adjusting your filters'
                : 'You have no appointment history yet'
              }
            </p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div 
              key={appointment.id} 
              className={`appointment-card ${appointment.status}`}
              onClick={() => handleAppointmentClick(appointment)}
            >
              <div className="appointment-header">
                <div className="doctor-info">
                  <div className="doctor-avatar">
                    <i className="fas fa-user-md"></i>
                  </div>
                  <div className="doctor-details">
                    <h3>Dr. {appointment.doctor.name}</h3>
                    <p>{appointment.doctor.specialization}</p>
                    {appointment.doctor.hospital && (
                      <p className="hospital">{appointment.doctor.hospital}</p>
                    )}
                  </div>
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
                {appointment.notes && (
                  <div className="appointment-notes">
                    <i className="fas fa-sticky-note"></i>
                    <span>{appointment.notes}</span>
                  </div>
                )}
              </div>

              <div className="appointment-actions">
                {canCancelAppointment(appointment) && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelAppointment(appointment.id);
                    }}
                  >
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                )}
                {canReschedule(appointment) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRescheduleAppointment(appointment.id);
                    }}
                  >
                    <i className="fas fa-calendar-alt"></i>
                    Reschedule
                  </button>
                )}
                {canLeaveReview(appointment) && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveReview(appointment);
                    }}
                  >
                    <i className="fas fa-star"></i>
                    Review
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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
                <div className="doctor-section">
                  <div className="doctor-avatar large">
                    <i className="fas fa-user-md"></i>
                  </div>
                  <div className="doctor-info">
                    <h3>Dr. {selectedAppointment.doctor.name}</h3>
                    <p>{selectedAppointment.doctor.specialization}</p>
                    {selectedAppointment.doctor.hospital && (
                      <p className="hospital">{selectedAppointment.doctor.hospital}</p>
                    )}
                    {selectedAppointment.doctor.education && (
                      <p className="education">{selectedAppointment.doctor.education}</p>
                    )}
                  </div>
                </div>

                <div className="appointment-info">
                  <div className="info-item">
                    <label>Status:</label>
                    {getStatusBadge(selectedAppointment.status)}
                  </div>
                  <div className="info-item">
                    <label>Date & Time:</label>
                    <span>{formatDateTime(selectedAppointment.appointmentDate)}</span>
                  </div>
                  {selectedAppointment.appointmentType && (
                    <div className="info-item">
                      <label>Type:</label>
                      <span>{selectedAppointment.appointmentType}</span>
                    </div>
                  )}
                  {selectedAppointment.notes && (
                    <div className="info-item">
                      <label>Notes:</label>
                      <span>{selectedAppointment.notes}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <label>Appointment ID:</label>
                    <span>{selectedAppointment.id}</span>
                  </div>
                </div>

                {selectedAppointment.prescription && (
                  <div className="prescription-section">
                    <h4>Prescription</h4>
                    <div className="prescription-content">
                      {selectedAppointment.prescription}
                    </div>
                  </div>
                )}

                {selectedAppointment.diagnosis && (
                  <div className="diagnosis-section">
                    <h4>Diagnosis</h4>
                    <div className="diagnosis-content">
                      {selectedAppointment.diagnosis}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedAppointment && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Leave a Review</h2>
              <button 
                className="modal-close"
                onClick={() => setShowReviewModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="review-form">
                <div className="doctor-info">
                  <h3>Dr. {selectedAppointment.doctor.name}</h3>
                  <p>{selectedAppointment.doctor.specialization}</p>
                  <p>Appointment: {formatDateTime(selectedAppointment.appointmentDate)}</p>
                </div>

                <div className="rating-section">
                  <label>Rating:</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star ${star <= reviewData.rating ? 'active' : ''}`}
                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                      >
                        <i className="fas fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="comment-section">
                  <label htmlFor="review-comment">Comment (optional):</label>
                  <textarea
                    id="review-comment"
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    placeholder="Share your experience with this doctor..."
                    rows={4}
                    maxLength={500}
                  />
                  <small>{reviewData.comment.length}/500 characters</small>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={submitReview}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentHistoryPage;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
import apiClient from '../../api/axios.config';
import { DoctorSchedule } from '../../types/auth.types';

interface ScheduleFormData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  maxPatients: number;
}

const DoctorSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
    maxPatients: 10
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/doctors/schedule');
      setSchedules(response.data);
    } catch (error: any) {
      console.error('Failed to load schedules:', error);
      SecurityUtils.logSecurityEvent({
        action: 'load_doctor_schedules_error',
        success: false,
        details: { error: error.message },
        userId: user?.id
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (formData.maxPatients < 1 || formData.maxPatients > 50) {
      newErrors.maxPatients = 'Max patients must be between 1 and 50';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;    try {
      const sanitizedData = {
        ...formData,
        startTime: SecurityUtils.sanitizeInput(formData.startTime),
        endTime: SecurityUtils.sanitizeInput(formData.endTime),
        maxPatients: Math.max(1, Math.min(50, formData.maxPatients))
      };

      if (editingSchedule) {
        await apiClient.put(`/doctors/schedule/${editingSchedule.id}`, sanitizedData);
        SecurityUtils.logSecurityEvent({
          action: 'update_doctor_schedule',
          success: true,
          details: { scheduleId: editingSchedule.id },
          userId: user?.id
        });
      } else {
        await apiClient.post('/doctors/schedule', sanitizedData);
        SecurityUtils.logSecurityEvent({
          action: 'create_doctor_schedule',
          success: true,
          details: { dayOfWeek: sanitizedData.dayOfWeek },
          userId: user?.id
        });
      }

      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (error: any) {
      console.error('Failed to save schedule:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to save schedule' });
    }
  };

  const handleEdit = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isAvailable: schedule.isAvailable,
      maxPatients: schedule.maxPatients
    });
    setShowForm(true);
  };
  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await apiClient.delete(`/doctors/schedule/${scheduleId}`);
      SecurityUtils.logSecurityEvent({
        action: 'delete_doctor_schedule',
        success: true,
        details: { scheduleId },
        userId: user?.id
      });
      loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const toggleAvailability = async (scheduleId: string, isAvailable: boolean) => {
    try {
      await apiClient.patch(`/doctors/schedule/${scheduleId}/availability`, { isAvailable });
      SecurityUtils.logSecurityEvent({
        action: 'toggle_schedule_availability',
        success: true,
        details: { scheduleId, isAvailable },
        userId: user?.id
      });
      loadSchedules();
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
      maxPatients: 10
    });
    setErrors({});
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSchedule(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading schedule...</p>
      </div>
    );
  }

  return (
    <div className="doctor-schedule-page">
      <div className="page-header">
        <h1>Manage Schedule</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <i className="fas fa-plus"></i>
          Add Schedule
        </button>
      </div>

      {showForm && (
        <div className="schedule-form-container">
          <div className="form-card">
            <h3>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dayOfWeek">Day of Week</label>
                  <select
                    id="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    className={errors.dayOfWeek ? 'error' : ''}
                  >
                    {daysOfWeek.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                  {errors.dayOfWeek && <span className="error-text">{errors.dayOfWeek}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="startTime">Start Time</label>
                  <input
                    type="time"
                    id="startTime"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className={errors.startTime ? 'error' : ''}
                  />
                  {errors.startTime && <span className="error-text">{errors.startTime}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">End Time</label>
                  <input
                    type="time"
                    id="endTime"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className={errors.endTime ? 'error' : ''}
                  />
                  {errors.endTime && <span className="error-text">{errors.endTime}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="maxPatients">Max Patients</label>
                  <input
                    type="number"
                    id="maxPatients"
                    min="1"
                    max="50"
                    value={formData.maxPatients}
                    onChange={(e) => setFormData({ ...formData, maxPatients: parseInt(e.target.value) })}
                    className={errors.maxPatients ? 'error' : ''}
                  />
                  {errors.maxPatients && <span className="error-text">{errors.maxPatients}</span>}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    />
                    Available for appointments
                  </label>
                </div>
              </div>

              {errors.submit && <div className="error-message">{errors.submit}</div>}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="schedules-grid">
        {schedules.length === 0 ? (
          <div className="no-schedules">
            <i className="fas fa-calendar-times"></i>
            <h3>No schedules set</h3>
            <p>Add your first schedule to start accepting appointments</p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div key={schedule.id} className={`schedule-card ${!schedule.isAvailable ? 'unavailable' : ''}`}>
              <div className="schedule-header">
                <h4>{daysOfWeek[schedule.dayOfWeek]}</h4>
                <div className="schedule-actions">
                  <button
                    className={`availability-toggle ${schedule.isAvailable ? 'available' : 'unavailable'}`}
                    onClick={() => toggleAvailability(schedule.id, !schedule.isAvailable)}
                    title={schedule.isAvailable ? 'Disable' : 'Enable'}
                  >
                    <i className={`fas ${schedule.isAvailable ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                  </button>
                  <button
                    className="btn-icon edit"
                    onClick={() => handleEdit(schedule)}
                    title="Edit schedule"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDelete(schedule.id)}
                    title="Delete schedule"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="schedule-details">
                <div className="time-range">
                  <i className="fas fa-clock"></i>
                  <span>{schedule.startTime} - {schedule.endTime}</span>
                </div>
                <div className="max-patients">
                  <i className="fas fa-users"></i>
                  <span>Max {schedule.maxPatients} patients</span>
                </div>
                <div className="status">
                  <span className={`status-badge ${schedule.isAvailable ? 'available' : 'unavailable'}`}>
                    {schedule.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorSchedulePage;

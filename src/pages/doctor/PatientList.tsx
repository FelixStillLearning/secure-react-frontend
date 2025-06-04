import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditLogger } from '../../utils/security';
import { apiClient } from '../../api/axios.config';
import { Patient, Appointment } from '../../types/auth.types';

interface PatientFilters {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PatientWithStats extends Patient {
  totalAppointments: number;
  lastAppointment?: Date;
  upcomingAppointments: number;
}

const PatientListPage: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithStats[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [filters, setFilters] = useState<PatientFilters>({
    search: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [patients, filters]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/doctors/patients');
      setPatients(response.data);    } catch (error) {
      console.error('Failed to load patients:', error);
      auditLogger({
        type: 'DATA_ACCESS_ERROR',
        details: { action: 'load_doctor_patients', error: error.message },
        severity: 'medium',
        userId: user?.id
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...patients];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.email.toLowerCase().includes(searchTerm) ||
        patient.phone?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      const now = new Date();
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(patient => patient.upcomingAppointments > 0);
          break;
        case 'inactive':
          filtered = filtered.filter(patient => patient.upcomingAppointments === 0);
          break;
        case 'new':
          filtered = filtered.filter(patient => patient.totalAppointments === 0);
          break;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = a.lastAppointment || new Date(0);
          bValue = b.lastAppointment || new Date(0);
          break;
        case 'appointments':
          aValue = a.totalAppointments;
          bValue = b.totalAppointments;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPatients(filtered);
  };

  const handlePatientClick = async (patient: PatientWithStats) => {
    try {
      setSelectedPatient(patient);
      setShowPatientModal(true);
      
      // Load patient appointments
      const response = await api.get(`/doctors/patients/${patient.id}/appointments`);
      setPatientAppointments(response.data);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS',
        details: { action: 'view_patient_details', patientId: patient.id },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to load patient details:', error);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (patient: PatientWithStats) => {
    if (patient.totalAppointments === 0) {
      return <span className="status-badge new">New Patient</span>;
    }
    if (patient.upcomingAppointments > 0) {
      return <span className="status-badge active">Active</span>;
    }
    return <span className="status-badge inactive">Inactive</span>;
  };

  const handleFilterChange = (key: keyof PatientFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading patients...</p>
      </div>
    );
  }

  return (
    <div className="patient-list-page">
      <div className="page-header">
        <h1>My Patients</h1>
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-number">{patients.length}</span>
            <span className="stat-label">Total Patients</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{patients.filter(p => p.upcomingAppointments > 0).length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{patients.filter(p => p.totalAppointments === 0).length}</span>
            <span className="stat-label">New</span>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search patients by name, email, or phone..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All Patients</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="new">New Patients</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Last Visit</option>
            <option value="appointments">Sort by Appointments</option>
          </select>

          <button
            className={`sort-order ${filters.sortOrder}`}
            onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <i className={`fas fa-sort-amount-${filters.sortOrder === 'asc' ? 'up' : 'down'}`}></i>
          </button>

          <button className="clear-filters" onClick={clearFilters}>
            <i className="fas fa-times"></i>
            Clear
          </button>
        </div>
      </div>

      <div className="patients-grid">
        {filteredPatients.length === 0 ? (
          <div className="no-patients">
            <i className="fas fa-user-friends"></i>
            <h3>No patients found</h3>
            <p>
              {filters.search || filters.status !== 'all' 
                ? 'Try adjusting your filters'
                : 'You have no patients yet'
              }
            </p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div 
              key={patient.id} 
              className="patient-card"
              onClick={() => handlePatientClick(patient)}
            >
              <div className="patient-avatar">
                <i className="fas fa-user"></i>
              </div>
              
              <div className="patient-info">
                <h3>{patient.name}</h3>
                <p className="patient-email">{patient.email}</p>
                {patient.phone && <p className="patient-phone">{patient.phone}</p>}
                
                <div className="patient-stats">
                  <div className="stat">
                    <i className="fas fa-calendar-check"></i>
                    <span>{patient.totalAppointments} appointments</span>
                  </div>
                  <div className="stat">
                    <i className="fas fa-clock"></i>
                    <span>Last visit: {formatDate(patient.lastAppointment)}</span>
                  </div>
                  {patient.upcomingAppointments > 0 && (
                    <div className="stat upcoming">
                      <i className="fas fa-calendar-plus"></i>
                      <span>{patient.upcomingAppointments} upcoming</span>
                    </div>
                  )}
                </div>

                <div className="patient-status">
                  {getStatusBadge(patient)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showPatientModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowPatientModal(false)}>
          <div className="modal-content patient-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Patient Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowPatientModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="patient-details">
                <div className="patient-basic-info">
                  <div className="patient-avatar large">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="patient-info">
                    <h3>{selectedPatient.name}</h3>
                    <p>{selectedPatient.email}</p>
                    {selectedPatient.phone && <p>{selectedPatient.phone}</p>}
                    {getStatusBadge(selectedPatient)}
                  </div>
                </div>

                <div className="patient-summary">
                  <div className="summary-stat">
                    <i className="fas fa-calendar-check"></i>
                    <div>
                      <span className="number">{selectedPatient.totalAppointments}</span>
                      <span className="label">Total Appointments</span>
                    </div>
                  </div>
                  <div className="summary-stat">
                    <i className="fas fa-calendar-plus"></i>
                    <div>
                      <span className="number">{selectedPatient.upcomingAppointments}</span>
                      <span className="label">Upcoming</span>
                    </div>
                  </div>
                  <div className="summary-stat">
                    <i className="fas fa-clock"></i>
                    <div>
                      <span className="number">{formatDate(selectedPatient.lastAppointment)}</span>
                      <span className="label">Last Visit</span>
                    </div>
                  </div>
                </div>

                <div className="appointments-section">
                  <h4>Recent Appointments</h4>
                  {patientAppointments.length === 0 ? (
                    <p>No appointments found</p>
                  ) : (
                    <div className="appointments-list">
                      {patientAppointments.slice(0, 5).map((appointment) => (
                        <div key={appointment.id} className="appointment-item">
                          <div className="appointment-date">
                            <i className="fas fa-calendar"></i>
                            <span>{formatDateTime(appointment.appointmentDate)}</span>
                          </div>
                          <div className="appointment-status">
                            <span className={`status-badge ${appointment.status.toLowerCase()}`}>
                              {appointment.status}
                            </span>
                          </div>
                          {appointment.notes && (
                            <div className="appointment-notes">
                              <i className="fas fa-sticky-note"></i>
                              <span>{appointment.notes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientListPage;

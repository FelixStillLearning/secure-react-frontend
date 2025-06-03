import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';
import { Doctor, Specialization } from '../../types/auth.types';

interface DoctorSearchFilters {
  search: string;
  specialization: string;
  location: string;
  rating: number;
  experience: number;
  consultationFee: { min: number; max: number };
  availability: string;
  languages: string;
  gender: string;
}

interface DoctorWithDetails extends Doctor {
  averageRating: number;
  totalReviews: number;
  nextAvailableSlot?: string;
  distance?: number;
}

const DoctorSearchPage: React.FC = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorWithDetails[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorWithDetails[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithDetails | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [filters, setFilters] = useState<DoctorSearchFilters>({
    search: '',
    specialization: '',
    location: '',
    rating: 0,
    experience: 0,
    consultationFee: { min: 0, max: 1000000 },
    availability: '',
    languages: '',
    gender: ''
  });

  useEffect(() => {
    loadDoctors();
    loadSpecializations();
    loadFavorites();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [doctors, filters, sortBy]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctors/search');
      setDoctors(response.data);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS',
        details: { action: 'search_doctors', resultCount: response.data.length },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecializations = async () => {
    try {
      const response = await api.get('/specializations');
      setSpecializations(response.data);
    } catch (error) {
      console.error('Failed to load specializations:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await api.get('/patients/favorite-doctors');
      setFavoriteIds(response.data.map((fav: any) => fav.doctorId));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...doctors];

    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(doctor =>
        `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchLower) ||
        doctor.specialization?.name.toLowerCase().includes(searchLower) ||
        doctor.bio?.toLowerCase().includes(searchLower) ||
        doctor.hospitalAffiliation?.toLowerCase().includes(searchLower)
      );
    }

    // Apply specialization filter
    if (filters.specialization) {
      filtered = filtered.filter(doctor => doctor.specialization?.id === filters.specialization);
    }

    // Apply rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(doctor => doctor.averageRating >= filters.rating);
    }

    // Apply experience filter
    if (filters.experience > 0) {
      filtered = filtered.filter(doctor => doctor.experience >= filters.experience);
    }

    // Apply consultation fee filter
    filtered = filtered.filter(doctor => 
      doctor.consultationFee >= filters.consultationFee.min &&
      doctor.consultationFee <= filters.consultationFee.max
    );

    // Apply languages filter
    if (filters.languages) {
      filtered = filtered.filter(doctor => 
        doctor.languages?.toLowerCase().includes(filters.languages.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'experience':
        filtered.sort((a, b) => b.experience - a.experience);
        break;
      case 'fee_low':
        filtered.sort((a, b) => a.consultationFee - b.consultationFee);
        break;
      case 'fee_high':
        filtered.sort((a, b) => b.consultationFee - a.consultationFee);
        break;
      case 'reviews':
        filtered.sort((a, b) => b.totalReviews - a.totalReviews);
        break;
      default: // relevance
        // Keep original order for relevance
        break;
    }

    setFilteredDoctors(filtered);
  };

  const toggleFavorite = async (doctorId: string) => {
    try {
      const isFavorite = favoriteIds.includes(doctorId);
      
      if (isFavorite) {
        await api.delete(`/patients/favorite-doctors/${doctorId}`);
        setFavoriteIds(favoriteIds.filter(id => id !== doctorId));
      } else {
        await api.post('/patients/favorite-doctors', { doctorId });
        setFavoriteIds([...favoriteIds, doctorId]);
      }

      securityUtils.logSecurityEvent({
        type: 'DATA_MODIFICATION',
        details: { 
          action: isFavorite ? 'remove_favorite_doctor' : 'add_favorite_doctor',
          doctorId 
        },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      specialization: '',
      location: '',
      rating: 0,
      experience: 0,
      consultationFee: { min: 0, max: 1000000 },
      availability: '',
      languages: '',
      gender: ''
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fas fa-star ${i <= rating ? 'filled' : 'empty'}`}
        />
      );
    }
    return stars;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading doctors...</p>
      </div>
    );
  }

  return (
    <div className="doctor-search-page">
      <div className="page-header">
        <h1>Find a Doctor</h1>
        <div className="search-stats">
          <span>{filteredDoctors.length} doctors found</span>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="main-search">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search by doctor name, specialization, or hospital..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="main-search-input"
          />
          <button className="search-btn">
            <i className="fas fa-search"></i>
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        <div className="filter-chips">
          {specializations.slice(0, 6).map(spec => (
            <button
              key={spec.id}
              className={`filter-chip ${filters.specialization === spec.id ? 'active' : ''}`}
              onClick={() => setFilters({
                ...filters, 
                specialization: filters.specialization === spec.id ? '' : spec.id
              })}
            >
              {spec.name}
            </button>
          ))}
        </div>
        
        <button 
          className="advanced-filters-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <i className="fas fa-filter"></i>
          {showFilters ? 'Hide Filters' : 'More Filters'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Specialization</label>
              <select
                value={filters.specialization}
                onChange={(e) => setFilters({...filters, specialization: e.target.value})}
              >
                <option value="">All Specializations</option>
                {specializations.map(spec => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Minimum Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({...filters, rating: Number(e.target.value)})}
              >
                <option value={0}>Any Rating</option>
                <option value={4}>4+ Stars</option>
                <option value={3}>3+ Stars</option>
                <option value={2}>2+ Stars</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Experience (Years)</label>
              <select
                value={filters.experience}
                onChange={(e) => setFilters({...filters, experience: Number(e.target.value)})}
              >
                <option value={0}>Any Experience</option>
                <option value={5}>5+ Years</option>
                <option value={10}>10+ Years</option>
                <option value={15}>15+ Years</option>
                <option value={20}>20+ Years</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Languages</label>
              <input
                type="text"
                placeholder="e.g., English, Indonesian"
                value={filters.languages}
                onChange={(e) => setFilters({...filters, languages: e.target.value})}
              />
            </div>

            <div className="filter-group consultation-fee">
              <label>Consultation Fee Range</label>
              <div className="fee-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.consultationFee.min}
                  onChange={(e) => setFilters({
                    ...filters, 
                    consultationFee: {
                      ...filters.consultationFee,
                      min: Number(e.target.value) || 0
                    }
                  })}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.consultationFee.max}
                  onChange={(e) => setFilters({
                    ...filters, 
                    consultationFee: {
                      ...filters.consultationFee,
                      max: Number(e.target.value) || 1000000
                    }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={resetFilters}>
              <i className="fas fa-undo"></i>
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Controls */}
      <div className="results-controls">
        <div className="sort-controls">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviewed</option>
            <option value="experience">Most Experienced</option>
            <option value="fee_low">Lowest Fee</option>
            <option value="fee_high">Highest Fee</option>
          </select>
        </div>

        <div className="view-controls">
          <button 
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
          >
            <i className="fas fa-th"></i>
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            <i className="fas fa-list"></i>
          </button>
        </div>
      </div>

      {/* Results */}
      <div className={`doctors-results ${viewMode}`}>
        {filteredDoctors.length === 0 ? (
          <div className="no-results">
            <i className="fas fa-search"></i>
            <h3>No doctors found</h3>
            <p>Try adjusting your search criteria or filters</p>
          </div>
        ) : (
          filteredDoctors.map((doctor) => (
            <div key={doctor.id} className="doctor-card">
              <div className="doctor-image">
                {doctor.profileImageUrl ? (
                  <img src={doctor.profileImageUrl} alt={`Dr. ${doctor.firstName} ${doctor.lastName}`} />
                ) : (
                  <i className="fas fa-user-md"></i>
                )}
                <button 
                  className={`favorite-btn ${favoriteIds.includes(doctor.id) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(doctor.id);
                  }}
                >
                  <i className={favoriteIds.includes(doctor.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                </button>
              </div>

              <div className="doctor-info">
                <div className="doctor-header">
                  <h3>Dr. {doctor.firstName} {doctor.lastName}</h3>
                  {doctor.verified && (
                    <span className="verified-badge">
                      <i className="fas fa-check-circle"></i>
                      Verified
                    </span>
                  )}
                </div>

                <p className="specialization">{doctor.specialization?.name}</p>
                
                <div className="rating">
                  <div className="stars">
                    {renderStars(Math.round(doctor.averageRating))}
                  </div>
                  <span className="rating-text">
                    {doctor.averageRating.toFixed(1)} ({doctor.totalReviews} reviews)
                  </span>
                </div>

                <div className="doctor-details">
                  <div className="detail-item">
                    <i className="fas fa-briefcase"></i>
                    <span>{doctor.experience} years experience</span>
                  </div>
                  
                  {doctor.hospitalAffiliation && (
                    <div className="detail-item">
                      <i className="fas fa-hospital"></i>
                      <span>{doctor.hospitalAffiliation}</span>
                    </div>
                  )}

                  {doctor.languages && (
                    <div className="detail-item">
                      <i className="fas fa-language"></i>
                      <span>{doctor.languages}</span>
                    </div>
                  )}

                  <div className="detail-item consultation-fee">
                    <i className="fas fa-money-bill-wave"></i>
                    <span>{formatCurrency(doctor.consultationFee)}</span>
                  </div>
                </div>

                {doctor.bio && (
                  <p className="doctor-bio">{doctor.bio}</p>
                )}

                {doctor.nextAvailableSlot && (
                  <div className="availability">
                    <i className="fas fa-clock"></i>
                    <span>Next available: {new Date(doctor.nextAvailableSlot).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="doctor-actions">
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    setSelectedDoctor(doctor);
                    setShowDoctorModal(true);
                  }}
                >
                  <i className="fas fa-eye"></i>
                  View Profile
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = `/book-appointment?doctorId=${doctor.id}`}
                >
                  <i className="fas fa-calendar-plus"></i>
                  Book Appointment
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Doctor Profile Modal */}
      {showDoctorModal && selectedDoctor && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal-content doctor-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Doctor Profile</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDoctorModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="doctor-profile-header">
                <div className="profile-image">
                  {selectedDoctor.profileImageUrl ? (
                    <img src={selectedDoctor.profileImageUrl} alt={`Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`} />
                  ) : (
                    <i className="fas fa-user-md"></i>
                  )}
                </div>
                <div className="profile-info">
                  <h3>Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}</h3>
                  <p className="specialization">{selectedDoctor.specialization?.name}</p>
                  <div className="rating">
                    <div className="stars">
                      {renderStars(Math.round(selectedDoctor.averageRating))}
                    </div>
                    <span>{selectedDoctor.averageRating.toFixed(1)} ({selectedDoctor.totalReviews} reviews)</span>
                  </div>
                  {selectedDoctor.verified && (
                    <span className="verified-badge">
                      <i className="fas fa-check-circle"></i>
                      Verified Doctor
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-sections">
                <div className="section">
                  <h4>Professional Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Experience:</label>
                      <span>{selectedDoctor.experience} years</span>
                    </div>
                    <div className="info-item">
                      <label>Medical License:</label>
                      <span>{selectedDoctor.medicalLicenseNumber}</span>
                    </div>
                    <div className="info-item">
                      <label>Consultation Fee:</label>
                      <span>{formatCurrency(selectedDoctor.consultationFee)}</span>
                    </div>
                    {selectedDoctor.hospitalAffiliation && (
                      <div className="info-item">
                        <label>Hospital/Clinic:</label>
                        <span>{selectedDoctor.hospitalAffiliation}</span>
                      </div>
                    )}
                    {selectedDoctor.languages && (
                      <div className="info-item">
                        <label>Languages:</label>
                        <span>{selectedDoctor.languages}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDoctor.education && (
                  <div className="section">
                    <h4>Education & Qualifications</h4>
                    <p>{selectedDoctor.education}</p>
                  </div>
                )}

                {selectedDoctor.bio && (
                  <div className="section">
                    <h4>About</h4>
                    <p>{selectedDoctor.bio}</p>
                  </div>
                )}

                {selectedDoctor.services && (
                  <div className="section">
                    <h4>Services Offered</h4>
                    <p>{selectedDoctor.services}</p>
                  </div>
                )}

                {selectedDoctor.officeAddress && (
                  <div className="section">
                    <h4>Practice Location</h4>
                    <p>{selectedDoctor.officeAddress}</p>
                  </div>
                )}

                {selectedDoctor.workingHours && (
                  <div className="section">
                    <h4>Working Hours</h4>
                    <div className="working-hours">
                      {Object.entries(selectedDoctor.workingHours).map(([day, hours]) => (
                        <div key={day} className="schedule-day">
                          <span className="day">{day.charAt(0).toUpperCase() + day.slice(1)}:</span>
                          <span className="hours">
                            {hours.available 
                              ? `${hours.start} - ${hours.end}`
                              : 'Closed'
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => toggleFavorite(selectedDoctor.id)}
              >
                <i className={favoriteIds.includes(selectedDoctor.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                {favoriteIds.includes(selectedDoctor.id) ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = `/book-appointment?doctorId=${selectedDoctor.id}`}
              >
                <i className="fas fa-calendar-plus"></i>
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSearchPage;

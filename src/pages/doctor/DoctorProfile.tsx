import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';
import { Doctor, Specialization } from '../../types/auth.types';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  medicalLicenseNumber: string;
  experience: number;
  specialization: string;
  consultationFee: number;
  education: string;
  hospitalAffiliation: string;
  languages: string;
  bio: string;
  services: string;
  officeAddress: string;
  workingHours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
}

const DoctorProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    medicalLicenseNumber: '',
    experience: 0,
    specialization: '',
    consultationFee: 0,
    education: '',
    hospitalAffiliation: '',
    languages: '',
    bio: '',
    services: '',
    officeAddress: '',
    workingHours: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '12:00', available: false },
      sunday: { start: '09:00', end: '12:00', available: false }
    }
  });

  useEffect(() => {
    loadDoctorProfile();
    loadSpecializations();
  }, []);

  const loadDoctorProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate session
      const isValid = await securityUtils.validateSession();
      if (!isValid) {
        throw new Error('Session validation failed');
      }

      const response = await api.get(`/doctors/${user?.id}`);
      const doctorData = response.data;
      setDoctor(doctorData);

      // Populate form with existing data
      setProfileForm({
        firstName: doctorData.firstName || '',
        lastName: doctorData.lastName || '',
        email: doctorData.user?.email || '',
        phoneNumber: doctorData.phoneNumber || '',
        medicalLicenseNumber: doctorData.medicalLicenseNumber || '',
        experience: doctorData.experience || 0,
        specialization: doctorData.specialization?.id || '',
        consultationFee: doctorData.consultationFee || 0,
        education: doctorData.education || '',
        hospitalAffiliation: doctorData.hospitalAffiliation || '',
        languages: doctorData.languages || '',
        bio: doctorData.bio || '',
        services: doctorData.services || '',
        officeAddress: doctorData.officeAddress || '',
        workingHours: doctorData.workingHours || profileForm.workingHours
      });

      securityUtils.logSecurityEvent({
        type: 'profile_accessed',
        severity: 'info',
        message: 'Doctor profile loaded',
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load profile';
      setError(errorMessage);
      
      securityUtils.logSecurityEvent({
        type: 'profile_access_failed',
        severity: 'warning',
        message: `Profile load failed: ${errorMessage}`,
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPG, PNG)');
        return;
      }

      if (file.size > maxSize) {
        setError('Image size must be less than 5MB');
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Rate limiting check
      const canProceed = await securityUtils.checkRateLimit('profile_update', 5, 300); // 5 per 5 minutes
      if (!canProceed) {
        throw new Error('Too many update attempts. Please wait a moment.');
      }

      // Sanitize inputs
      const sanitizedData = {
        firstName: securityUtils.sanitizeInput(profileForm.firstName),
        lastName: securityUtils.sanitizeInput(profileForm.lastName),
        email: securityUtils.sanitizeInput(profileForm.email),
        phoneNumber: securityUtils.sanitizeInput(profileForm.phoneNumber),
        medicalLicenseNumber: securityUtils.sanitizeInput(profileForm.medicalLicenseNumber),
        experience: Math.max(0, parseInt(profileForm.experience.toString())),
        specializationId: profileForm.specialization,
        consultationFee: Math.max(0, parseFloat(profileForm.consultationFee.toString())),
        education: securityUtils.sanitizeInput(profileForm.education),
        hospitalAffiliation: securityUtils.sanitizeInput(profileForm.hospitalAffiliation),
        languages: securityUtils.sanitizeInput(profileForm.languages),
        bio: securityUtils.sanitizeInput(profileForm.bio),
        services: securityUtils.sanitizeInput(profileForm.services),
        officeAddress: securityUtils.sanitizeInput(profileForm.officeAddress),
        workingHours: profileForm.workingHours
      };

      const response = await api.put(`/doctors/${user?.id}`, sanitizedData);
      
      // Update user context if email changed
      if (sanitizedData.email !== user?.email) {
        updateUser({ ...user!, email: sanitizedData.email });
      }

      setSuccess('Profile updated successfully');
      setDoctor(response.data);

      // Upload profile image if provided
      if (profileImage) {
        await uploadProfileImage();
      }

      securityUtils.logSecurityEvent({
        type: 'profile_updated',
        severity: 'info',
        message: 'Doctor profile updated',
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      
      securityUtils.logSecurityEvent({
        type: 'profile_update_failed',
        severity: 'warning',
        message: `Profile update failed: ${errorMessage}`,
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadProfileImage = async () => {
    if (!profileImage) return;

    try {
      const formData = new FormData();
      formData.append('profileImage', profileImage);

      await api.post(`/doctors/${user?.id}/profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfileImage(null);
      setPreviewImage(null);
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      setError('Failed to upload profile image');
    }
  };

  const updateWorkingHours = (day: string, field: string, value: string | boolean) => {
    setProfileForm({
      ...profileForm,
      workingHours: {
        ...profileForm.workingHours,
        [day]: {
          ...profileForm.workingHours[day],
          [field]: value
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading doctor profile...</p>
      </div>
    );
  }

  return (
    <div className="doctor-profile-page">
      <div className="page-header">
        <h1>Doctor Profile Management</h1>
        <div className="verification-status">
          <span className={`status-badge ${doctor?.verified ? 'verified' : 'pending'}`}>
            {doctor?.verified ? 'Verified' : 'Pending Verification'}
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-image-section">
            <div className="profile-image">
              {previewImage ? (
                <img src={previewImage} alt="Profile Preview" />
              ) : doctor?.profileImageUrl ? (
                <img src={doctor.profileImageUrl} alt="Profile" />
              ) : (
                <i className="fas fa-user-md"></i>
              )}
            </div>
            <label className="upload-btn">
              <i className="fas fa-camera"></i>
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div className="profile-info">
            <h2>Dr. {doctor?.firstName} {doctor?.lastName}</h2>
            <p>{doctor?.specialization?.name}</p>
            <p>{doctor?.experience} years of experience</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={activeTab === 'basic' ? 'active' : ''}
            onClick={() => setActiveTab('basic')}
          >
            <i className="fas fa-user"></i>
            Basic Information
          </button>
          <button 
            className={activeTab === 'professional' ? 'active' : ''}
            onClick={() => setActiveTab('professional')}
          >
            <i className="fas fa-stethoscope"></i>
            Professional Info
          </button>
          <button 
            className={activeTab === 'practice' ? 'active' : ''}
            onClick={() => setActiveTab('practice')}
          >
            <i className="fas fa-hospital"></i>
            Practice Details
          </button>
          <button 
            className={activeTab === 'availability' ? 'active' : ''}
            onClick={() => setActiveTab('availability')}
          >
            <i className="fas fa-calendar"></i>
            Availability
          </button>
        </div>

        <form onSubmit={handleProfileSubmit}>
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="tab-content">
              <h3>Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    type="text"
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    type="text"
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number *</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="medicalLicenseNumber">Medical License Number *</label>
                  <input
                    type="text"
                    id="medicalLicenseNumber"
                    value={profileForm.medicalLicenseNumber}
                    onChange={(e) => setProfileForm({...profileForm, medicalLicenseNumber: e.target.value})}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="languages">Languages Spoken</label>
                  <input
                    type="text"
                    id="languages"
                    value={profileForm.languages}
                    onChange={(e) => setProfileForm({...profileForm, languages: e.target.value})}
                    placeholder="e.g., English, Indonesian, Mandarin"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bio">Professional Bio</label>
                <textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  placeholder="Tell patients about yourself, your approach to medicine, and your expertise..."
                  rows={5}
                  className="form-control"
                />
              </div>
            </div>
          )}

          {/* Professional Information Tab */}
          {activeTab === 'professional' && (
            <div className="tab-content">
              <h3>Professional Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="specialization">Specialization *</label>
                  <select
                    id="specialization"
                    value={profileForm.specialization}
                    onChange={(e) => setProfileForm({...profileForm, specialization: e.target.value})}
                    required
                    className="form-control"
                  >
                    <option value="">Select Specialization</option>
                    {specializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="experience">Years of Experience *</label>
                  <input
                    type="number"
                    id="experience"
                    value={profileForm.experience}
                    onChange={(e) => setProfileForm({...profileForm, experience: parseInt(e.target.value) || 0})}
                    min="0"
                    max="50"
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="consultationFee">Consultation Fee (IDR) *</label>
                  <input
                    type="number"
                    id="consultationFee"
                    value={profileForm.consultationFee}
                    onChange={(e) => setProfileForm({...profileForm, consultationFee: parseFloat(e.target.value) || 0})}
                    min="0"
                    step="1000"
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hospitalAffiliation">Hospital/Clinic Affiliation</label>
                  <input
                    type="text"
                    id="hospitalAffiliation"
                    value={profileForm.hospitalAffiliation}
                    onChange={(e) => setProfileForm({...profileForm, hospitalAffiliation: e.target.value})}
                    placeholder="Primary hospital or clinic"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="education">Education & Certifications</label>
                <textarea
                  id="education"
                  value={profileForm.education}
                  onChange={(e) => setProfileForm({...profileForm, education: e.target.value})}
                  placeholder="Medical school, residency, fellowships, board certifications..."
                  rows={4}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="services">Services Offered</label>
                <textarea
                  id="services"
                  value={profileForm.services}
                  onChange={(e) => setProfileForm({...profileForm, services: e.target.value})}
                  placeholder="List the medical services and treatments you provide..."
                  rows={4}
                  className="form-control"
                />
              </div>
            </div>
          )}

          {/* Practice Details Tab */}
          {activeTab === 'practice' && (
            <div className="tab-content">
              <h3>Practice Details</h3>
              <div className="form-group">
                <label htmlFor="officeAddress">Office Address</label>
                <textarea
                  id="officeAddress"
                  value={profileForm.officeAddress}
                  onChange={(e) => setProfileForm({...profileForm, officeAddress: e.target.value})}
                  placeholder="Complete address of your practice location..."
                  rows={3}
                  className="form-control"
                />
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="tab-content">
              <h3>Working Hours</h3>
              <div className="working-hours-grid">
                {Object.entries(profileForm.workingHours).map(([day, hours]) => (
                  <div key={day} className="day-schedule">
                    <div className="day-header">
                      <label>
                        <input
                          type="checkbox"
                          checked={hours.available}
                          onChange={(e) => updateWorkingHours(day, 'available', e.target.checked)}
                        />
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    </div>
                    {hours.available && (
                      <div className="time-inputs">
                        <input
                          type="time"
                          value={hours.start}
                          onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                          className="form-control"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={hours.end}
                          onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                          className="form-control"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorProfilePage;

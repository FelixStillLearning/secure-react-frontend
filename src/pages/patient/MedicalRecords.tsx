import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';

interface MedicalRecord {
  id: string;
  title: string;
  description: string;
  recordType: 'lab_result' | 'prescription' | 'diagnosis' | 'imaging' | 'report' | 'other';
  date: string;
  doctorName?: string;
  hospitalName?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UploadForm {
  title: string;
  description: string;
  recordType: string;
  date: string;
  doctorName: string;
  hospitalName: string;
  isPrivate: boolean;
}

const MedicalRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [filters, setFilters] = useState({
    recordType: 'all',
    dateRange: 'all',
    search: ''
  });

  const [uploadForm, setUploadForm] = useState<UploadForm>({
    title: '',
    description: '',
    recordType: 'other',
    date: new Date().toISOString().split('T')[0],
    doctorName: '',
    hospitalName: '',
    isPrivate: false
  });

  const recordTypes = [
    { value: 'lab_result', label: 'Lab Result', icon: 'fas fa-vial' },
    { value: 'prescription', label: 'Prescription', icon: 'fas fa-pills' },
    { value: 'diagnosis', label: 'Diagnosis', icon: 'fas fa-notes-medical' },
    { value: 'imaging', label: 'Imaging/X-Ray', icon: 'fas fa-x-ray' },
    { value: 'report', label: 'Medical Report', icon: 'fas fa-file-medical-alt' },
    { value: 'other', label: 'Other', icon: 'fas fa-file-medical' }
  ];

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/patients/medical-records');
      setRecords(response.data);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS',
        details: { action: 'view_medical_records', recordCount: response.data.length },
        severity: 'medium',
        userId: user?.id
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load medical records';
      setError(errorMessage);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS_ERROR',
        details: { action: 'load_medical_records', error: errorMessage },
        severity: 'high',
        userId: user?.id
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Record type filter
    if (filters.recordType !== 'all') {
      filtered = filtered.filter(record => record.recordType === filters.recordType);
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange === 'last_month') {
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
      filtered = filtered.filter(record => new Date(record.date) >= lastMonth);
    } else if (filters.dateRange === 'last_year') {
      const lastYear = new Date(now.setFullYear(now.getFullYear() - 1));
      filtered = filtered.filter(record => new Date(record.date) >= lastYear);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(record =>
        record.title.toLowerCase().includes(searchLower) ||
        record.description.toLowerCase().includes(searchLower) ||
        record.doctorName?.toLowerCase().includes(searchLower) ||
        record.hospitalName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredRecords(filtered);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid file (PDF, DOC, DOCX, JPG, PNG)');
        return;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }

      setUploadFile(file);
      setError('');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Rate limiting check
      const canProceed = await securityUtils.checkRateLimit('medical_record_upload', 5, 300);
      if (!canProceed) {
        throw new Error('Too many upload attempts. Please wait a moment.');
      }

      // Sanitize form data
      const sanitizedData = {
        title: securityUtils.sanitizeInput(uploadForm.title),
        description: securityUtils.sanitizeInput(uploadForm.description),
        recordType: uploadForm.recordType,
        date: uploadForm.date,
        doctorName: securityUtils.sanitizeInput(uploadForm.doctorName),
        hospitalName: securityUtils.sanitizeInput(uploadForm.hospitalName),
        isPrivate: uploadForm.isPrivate
      };

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', uploadFile);
      Object.entries(sanitizedData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      await api.post('/patients/medical-records', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Medical record uploaded successfully');
      setShowUploadModal(false);
      resetUploadForm();
      loadMedicalRecords();

      securityUtils.logSecurityEvent({
        type: 'DATA_CREATION',
        details: { 
          action: 'upload_medical_record',
          recordType: sanitizedData.recordType,
          fileName: uploadFile.name,
          fileSize: uploadFile.size
        },
        severity: 'medium',
        userId: user?.id
      });

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload medical record';
      setError(errorMessage);
      
      securityUtils.logSecurityEvent({
        type: 'DATA_CREATION_ERROR',
        details: { action: 'upload_medical_record', error: errorMessage },
        severity: 'high',
        userId: user?.id
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      recordType: 'other',
      date: new Date().toISOString().split('T')[0],
      doctorName: '',
      hospitalName: '',
      isPrivate: false
    });
    setUploadFile(null);
  };

  const handleDownload = async (record: MedicalRecord) => {
    try {
      const response = await api.get(`/patients/medical-records/${record.id}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', record.fileName || `${record.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS',
        details: { action: 'download_medical_record', recordId: record.id },
        severity: 'medium',
        userId: user?.id
      });

    } catch (error) {
      console.error('Failed to download file:', error);
      setError('Failed to download file');
    }
  };

  const handleDelete = async (record: MedicalRecord) => {
    if (!window.confirm('Are you sure you want to delete this medical record? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/patients/medical-records/${record.id}`);
      
      setSuccess('Medical record deleted successfully');
      loadMedicalRecords();
      setShowRecordModal(false);

      securityUtils.logSecurityEvent({
        type: 'DATA_DELETION',
        details: { action: 'delete_medical_record', recordId: record.id },
        severity: 'high',
        userId: user?.id
      });

    } catch (error) {
      console.error('Failed to delete record:', error);
      setError('Failed to delete medical record');
    }
  };

  const getRecordIcon = (recordType: string) => {
    const typeData = recordTypes.find(type => type.value === recordType);
    return typeData?.icon || 'fas fa-file-medical';
  };

  const getRecordLabel = (recordType: string) => {
    const typeData = recordTypes.find(type => type.value === recordType);
    return typeData?.label || 'Other';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading medical records...</p>
      </div>
    );
  }

  return (
    <div className="medical-records-page">
      <div className="page-header">
        <h1>Medical Records</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          <i className="fas fa-plus"></i>
          Upload Record
        </button>
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

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search records by title, description, doctor, or hospital..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="search-input"
          />
          <i className="fas fa-search search-icon"></i>
        </div>

        <div className="filter-controls">
          <select
            value={filters.recordType}
            onChange={(e) => setFilters({...filters, recordType: e.target.value})}
          >
            <option value="all">All Types</option>
            {recordTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
          >
            <option value="all">All Time</option>
            <option value="last_month">Last Month</option>
            <option value="last_year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Records Grid */}
      <div className="records-grid">
        {filteredRecords.length === 0 ? (
          <div className="no-records">
            <i className="fas fa-folder-open"></i>
            <h3>No medical records found</h3>
            <p>
              {filters.search || filters.recordType !== 'all' || filters.dateRange !== 'all'
                ? 'Try adjusting your search criteria'
                : 'Upload your first medical record to get started'
              }
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div 
              key={record.id} 
              className={`record-card ${record.isPrivate ? 'private' : ''}`}
              onClick={() => {
                setSelectedRecord(record);
                setShowRecordModal(true);
              }}
            >
              <div className="record-header">
                <div className="record-type">
                  <i className={getRecordIcon(record.recordType)}></i>
                  <span>{getRecordLabel(record.recordType)}</span>
                </div>
                {record.isPrivate && (
                  <div className="privacy-badge">
                    <i className="fas fa-lock"></i>
                    Private
                  </div>
                )}
              </div>

              <div className="record-content">
                <h3>{record.title}</h3>
                <p className="record-description">{record.description}</p>
                
                <div className="record-meta">
                  <div className="meta-item">
                    <i className="fas fa-calendar"></i>
                    <span>{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  {record.doctorName && (
                    <div className="meta-item">
                      <i className="fas fa-user-md"></i>
                      <span>Dr. {record.doctorName}</span>
                    </div>
                  )}
                  {record.hospitalName && (
                    <div className="meta-item">
                      <i className="fas fa-hospital"></i>
                      <span>{record.hospitalName}</span>
                    </div>
                  )}
                  {record.fileName && (
                    <div className="meta-item">
                      <i className="fas fa-file"></i>
                      <span>{record.fileName}</span>
                      {record.fileSize && (
                        <span className="file-size">({formatFileSize(record.fileSize)})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="record-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(record);
                  }}
                >
                  <i className="fas fa-download"></i>
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Medical Record</h2>
              <button 
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="upload-title">Title *</label>
                  <input
                    type="text"
                    id="upload-title"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                    required
                    placeholder="e.g., Blood Test Results"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="upload-type">Record Type *</label>
                  <select
                    id="upload-type"
                    value={uploadForm.recordType}
                    onChange={(e) => setUploadForm({...uploadForm, recordType: e.target.value})}
                    required
                    className="form-control"
                  >
                    {recordTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="upload-date">Date *</label>
                  <input
                    type="date"
                    id="upload-date"
                    value={uploadForm.date}
                    onChange={(e) => setUploadForm({...uploadForm, date: e.target.value})}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="upload-description">Description</label>
                  <textarea
                    id="upload-description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    placeholder="Brief description of the medical record..."
                    rows={3}
                    className="form-control"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="upload-doctor">Doctor Name</label>
                    <input
                      type="text"
                      id="upload-doctor"
                      value={uploadForm.doctorName}
                      onChange={(e) => setUploadForm({...uploadForm, doctorName: e.target.value})}
                      placeholder="Dr. John Smith"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="upload-hospital">Hospital/Clinic</label>
                    <input
                      type="text"
                      id="upload-hospital"
                      value={uploadForm.hospitalName}
                      onChange={(e) => setUploadForm({...uploadForm, hospitalName: e.target.value})}
                      placeholder="General Hospital"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="upload-file">File *</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      id="upload-file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      required
                    />
                    <div className="upload-placeholder">
                      <i className="fas fa-cloud-upload-alt"></i>
                      <p>
                        {uploadFile 
                          ? `Selected: ${uploadFile.name} (${formatFileSize(uploadFile.size)})`
                          : 'Choose file or drag and drop'
                        }
                      </p>
                      <small>Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</small>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={uploadForm.isPrivate}
                      onChange={(e) => setUploadForm({...uploadForm, isPrivate: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    Make this record private (only visible to you)
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i>
                      Upload Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Details Modal */}
      {showRecordModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal-content record-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Medical Record Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRecordModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="record-details">
                <div className="detail-section">
                  <div className="record-type-header">
                    <i className={getRecordIcon(selectedRecord.recordType)}></i>
                    <span>{getRecordLabel(selectedRecord.recordType)}</span>
                    {selectedRecord.isPrivate && (
                      <span className="privacy-badge">
                        <i className="fas fa-lock"></i>
                        Private
                      </span>
                    )}
                  </div>
                  
                  <h3>{selectedRecord.title}</h3>
                  <p>{selectedRecord.description}</p>
                </div>

                <div className="detail-section">
                  <h4>Record Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Date:</label>
                      <span>{new Date(selectedRecord.date).toLocaleDateString()}</span>
                    </div>
                    {selectedRecord.doctorName && (
                      <div className="info-item">
                        <label>Doctor:</label>
                        <span>Dr. {selectedRecord.doctorName}</span>
                      </div>
                    )}
                    {selectedRecord.hospitalName && (
                      <div className="info-item">
                        <label>Hospital/Clinic:</label>
                        <span>{selectedRecord.hospitalName}</span>
                      </div>
                    )}
                    {selectedRecord.fileName && (
                      <div className="info-item">
                        <label>File:</label>
                        <span>
                          {selectedRecord.fileName}
                          {selectedRecord.fileSize && (
                            <small> ({formatFileSize(selectedRecord.fileSize)})</small>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="info-item">
                      <label>Uploaded:</label>
                      <span>{new Date(selectedRecord.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-primary"
                onClick={() => handleDownload(selectedRecord)}
              >
                <i className="fas fa-download"></i>
                Download
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleDelete(selectedRecord)}
              >
                <i className="fas fa-trash"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsPage;

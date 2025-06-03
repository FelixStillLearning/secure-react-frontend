import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { api } from '../../api/axios.config';
import { User, Doctor, Patient } from '../../types/auth.types';

interface UserWithDetails extends User {
  lastLogin?: Date;
  createdAt: Date;
  isActive: boolean;
  doctorProfile?: Doctor;
  patientProfile?: Patient;
}

interface UserFilters {
  search: string;
  role: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data);
      
      securityUtils.logSecurityEvent({
        type: 'ADMIN_ACTION',
        details: { action: 'view_user_management', userCount: response.data.length },
        severity: 'low',
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to load users:', error);
      securityUtils.logSecurityEvent({
        type: 'DATA_ACCESS_ERROR',
        details: { action: 'load_users', error: error.message },
        severity: 'high',
        userId: user?.id
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.phone?.toLowerCase().includes(searchTerm)
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => !user.isActive);
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
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'lastLogin':
          aValue = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
          bValue = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleUserClick = (user: UserWithDetails) => {
    setSelectedUser(user);
    setShowUserModal(true);
    
    securityUtils.logSecurityEvent({
      type: 'ADMIN_ACTION',
      details: { action: 'view_user_details', targetUserId: user.id },
      severity: 'low',
      userId: user?.id
    });
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      
      securityUtils.logSecurityEvent({
        type: 'ADMIN_ACTION',
        details: { 
          action: 'toggle_user_status', 
          targetUserId: userId, 
          newStatus: !currentStatus 
        },
        severity: 'medium',
        userId: user?.id
      });
      
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      
      securityUtils.logSecurityEvent({
        type: 'ADMIN_ACTION',
        details: { action: 'delete_user', targetUserId: userId },
        severity: 'high',
        userId: user?.id
      });
      
      setShowDeleteConfirm(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleClasses = {
      admin: 'role-admin',
      doctor: 'role-doctor',
      patient: 'role-patient'
    };
    
    return (
      <span className={`role-badge ${roleClasses[role.toLowerCase()] || 'role-default'}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <h1>User Management</h1>
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{users.filter(u => u.isActive).length}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{users.filter(u => u.role === 'doctor').length}</span>
            <span className="stat-label">Doctors</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{users.filter(u => u.role === 'patient').length}</span>
            <span className="stat-label">Patients</span>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="createdAt">Sort by Created Date</option>
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="role">Sort by Role</option>
            <option value="lastLogin">Sort by Last Login</option>
          </select>

          <button
            className={`sort-order ${filters.sortOrder}`}
            onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <i className={`fas fa-sort-amount-${filters.sortOrder === 'asc' ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((userData) => (
              <tr key={userData.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="user-details">
                      <div className="user-name">{userData.name}</div>
                      <div className="user-email">{userData.email}</div>
                      {userData.phone && <div className="user-phone">{userData.phone}</div>}
                    </div>
                  </div>
                </td>
                <td>{getRoleBadge(userData.role)}</td>
                <td>{getStatusBadge(userData.isActive)}</td>
                <td>{formatDate(userData.createdAt)}</td>
                <td>{formatDateTime(userData.lastLogin)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon view"
                      onClick={() => handleUserClick(userData)}
                      title="View details"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      className={`btn-icon ${userData.isActive ? 'disable' : 'enable'}`}
                      onClick={() => handleToggleUserStatus(userData.id, userData.isActive)}
                      title={userData.isActive ? 'Disable user' : 'Enable user'}
                    >
                      <i className={`fas ${userData.isActive ? 'fa-ban' : 'fa-check'}`}></i>
                    </button>
                    {userData.id !== user?.id && (
                      <button
                        className="btn-icon delete"
                        onClick={() => setShowDeleteConfirm(userData.id)}
                        title="Delete user"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowUserModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="user-details-modal">
                <div className="user-basic-info">
                  <div className="user-avatar large">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="user-info">
                    <h3>{selectedUser.name}</h3>
                    <p>{selectedUser.email}</p>
                    {selectedUser.phone && <p>{selectedUser.phone}</p>}
                    <div className="badges">
                      {getRoleBadge(selectedUser.role)}
                      {getStatusBadge(selectedUser.isActive)}
                    </div>
                  </div>
                </div>

                <div className="user-metadata">
                  <div className="metadata-item">
                    <label>User ID:</label>
                    <span>{selectedUser.id}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Created:</label>
                    <span>{formatDateTime(selectedUser.createdAt)}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Last Login:</label>
                    <span>{formatDateTime(selectedUser.lastLogin)}</span>
                  </div>
                </div>

                {selectedUser.doctorProfile && (
                  <div className="profile-section">
                    <h4>Doctor Profile</h4>
                    <div className="profile-details">
                      <div className="detail-item">
                        <label>Specialization:</label>
                        <span>{selectedUser.doctorProfile.specialization}</span>
                      </div>
                      <div className="detail-item">
                        <label>License Number:</label>
                        <span>{selectedUser.doctorProfile.licenseNumber}</span>
                      </div>
                      <div className="detail-item">
                        <label>Experience:</label>
                        <span>{selectedUser.doctorProfile.experienceYears} years</span>
                      </div>
                      {selectedUser.doctorProfile.education && (
                        <div className="detail-item">
                          <label>Education:</label>
                          <span>{selectedUser.doctorProfile.education}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedUser.patientProfile && (
                  <div className="profile-section">
                    <h4>Patient Profile</h4>
                    <div className="profile-details">
                      <div className="detail-item">
                        <label>Date of Birth:</label>
                        <span>{formatDate(selectedUser.patientProfile.dateOfBirth)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Gender:</label>
                        <span>{selectedUser.patientProfile.gender}</span>
                      </div>
                      <div className="detail-item">
                        <label>Blood Type:</label>
                        <span>{selectedUser.patientProfile.bloodType || 'Not specified'}</span>
                      </div>
                      {selectedUser.patientProfile.emergencyContact && (
                        <div className="detail-item">
                          <label>Emergency Contact:</label>
                          <span>{selectedUser.patientProfile.emergencyContact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="modal-header">
              <h2>Confirm Delete</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this user? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteUser(showDeleteConfirm)}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;

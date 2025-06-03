import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Users, 
  Eye,
  MoreVertical,
  Download,
  Upload,
  Settings,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { securityUtils } from '../../utils/security';
import { apiClient } from '../../api/axios.config';

interface Specialization {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isActive: boolean;
  doctorCount: number;
  appointmentCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

interface SpecializationFormData {
  name: string;
  description: string;
  icon?: string;
  isActive: boolean;
  tags: string[];
}

const SpecializationManagement: React.FC = () => {
  const { user } = useAuth();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'doctorCount' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editingSpecialization, setEditingSpecialization] = useState<Specialization | null>(null);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | null>(null);

  const [formData, setFormData] = useState<SpecializationFormData>({
    name: '',
    description: '',
    icon: '',
    isActive: true,
    tags: []
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalDoctors: 0,
    totalAppointments: 0
  });

  useEffect(() => {
    loadSpecializations();
    loadStats();
  }, []);

  const loadSpecializations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Log admin action
      securityUtils.logSecurityEvent({
        type: 'admin_action',
        severity: 'info',
        message: 'Admin accessed specialization management',
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });

      const response = await apiClient.get('/admin/specializations');
      setSpecializations(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load specializations';
      setError(errorMessage);
      
      securityUtils.logSecurityEvent({
        type: 'admin_error',
        severity: 'error',
        message: `Specialization management load failed: ${errorMessage}`,
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

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/admin/specializations/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load specialization stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const specializationData = {
        ...formData,
        tags: formData.tags.filter(tag => tag.trim() !== '')
      };

      if (editingSpecialization) {
        await apiClient.put(`/admin/specializations/${editingSpecialization.id}`, specializationData);
        
        securityUtils.logSecurityEvent({
          type: 'admin_action',
          severity: 'info',
          message: `Admin updated specialization: ${formData.name}`,
          userId: user?.id,
          userAgent: navigator.userAgent,
          timestamp: new Date(),
          ipAddress: 'client-side',
          sessionId: securityUtils.getSessionId() || 'unknown'
        });
      } else {
        await apiClient.post('/admin/specializations', specializationData);
        
        securityUtils.logSecurityEvent({
          type: 'admin_action',
          severity: 'info',
          message: `Admin created specialization: ${formData.name}`,
          userId: user?.id,
          userAgent: navigator.userAgent,
          timestamp: new Date(),
          ipAddress: 'client-side',
          sessionId: securityUtils.getSessionId() || 'unknown'
        });
      }

      // Reset form and reload data
      setFormData({
        name: '',
        description: '',
        icon: '',
        isActive: true,
        tags: []
      });
      setEditingSpecialization(null);
      setShowForm(false);
      
      await loadSpecializations();
      await loadStats();
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to save specialization';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (specialization: Specialization) => {
    setEditingSpecialization(specialization);
    setFormData({
      name: specialization.name,
      description: specialization.description,
      icon: specialization.icon || '',
      isActive: specialization.isActive,
      tags: specialization.tags || []
    });
    setShowForm(true);
  };

  const handleDelete = async (specializationId: string) => {
    try {
      setLoading(true);
      
      await apiClient.delete(`/admin/specializations/${specializationId}`);
      
      securityUtils.logSecurityEvent({
        type: 'admin_action',
        severity: 'warning',
        message: `Admin deleted specialization: ${specializationId}`,
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });

      await loadSpecializations();
      await loadStats();
      setShowDeleteModal(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete specialization';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (specializationId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/admin/specializations/${specializationId}/status`, {
        isActive: !currentStatus
      });
      
      securityUtils.logSecurityEvent({
        type: 'admin_action',
        severity: 'info',
        message: `Admin ${!currentStatus ? 'activated' : 'deactivated'} specialization: ${specializationId}`,
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });

      await loadSpecializations();
      await loadStats();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update specialization status';
      setError(errorMessage);
    }
  };

  const handleBulkStatusChange = async (status: boolean) => {
    try {
      setLoading(true);
      
      await apiClient.patch('/admin/specializations/bulk-status', {
        specializationIds: selectedSpecializations,
        isActive: status
      });
      
      securityUtils.logSecurityEvent({
        type: 'admin_action',
        severity: 'info',
        message: `Admin bulk ${status ? 'activated' : 'deactivated'} ${selectedSpecializations.length} specializations`,
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });

      setSelectedSpecializations([]);
      await loadSpecializations();
      await loadStats();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update specializations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/admin/specializations/export', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `specializations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      securityUtils.logSecurityEvent({
        type: 'admin_action',
        severity: 'info',
        message: 'Admin exported specializations data',
        userId: user?.id,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        ipAddress: 'client-side',
        sessionId: securityUtils.getSessionId() || 'unknown'
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to export data';
      setError(errorMessage);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Filter and sort specializations
  const filteredSpecializations = specializations
    .filter(spec => {
      const matchesSearch = spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           spec.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || 
                           (filterStatus === 'active' && spec.isActive) ||
                           (filterStatus === 'inactive' && !spec.isActive);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'doctorCount':
          aValue = a.doctorCount;
          bValue = b.doctorCount;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 :0;
      }
    });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && specializations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading specializations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Specialization Management</h1>
              <p className="text-gray-600 mt-2">Manage medical specializations and doctor assignments</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Specialization
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Specializations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Doctors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDoctors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search specializations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'name' | 'doctorCount' | 'createdAt');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="doctorCount-desc">Most Doctors</option>
                <option value="doctorCount-asc">Least Doctors</option>
                <option value="createdAt-desc">Newest</option>
                <option value="createdAt-asc">Oldest</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedSpecializations.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">
                  {selectedSpecializations.length} specialization(s) selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkStatusChange(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange(false)}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={() => setSelectedSpecializations([])}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Specializations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpecializations.map((specialization) => (
            <div
              key={specialization.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSpecializations.includes(specialization.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSpecializations(prev => [...prev, specialization.id]);
                      } else {
                        setSelectedSpecializations(prev => prev.filter(id => id !== specialization.id));
                      }
                    }}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{specialization.name}</h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        specialization.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {specialization.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      // Toggle dropdown menu
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {specialization.description}
              </p>

              {specialization.tags && specialization.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {specialization.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                  {specialization.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{specialization.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Doctors:</span>
                  <span className="ml-1 font-medium">{specialization.doctorCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Appointments:</span>
                  <span className="ml-1 font-medium">{specialization.appointmentCount}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Created: {formatDate(specialization.createdAt)}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedSpecialization(specialization);
                    setShowDetailsModal(true);
                  }}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </button>
                <button
                  onClick={() => handleEdit(specialization)}
                  className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleStatus(specialization.id, specialization.isActive)}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                    specialization.isActive
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {specialization.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setSelectedSpecialization(specialization);
                    setShowDeleteModal(true);
                  }}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSpecializations.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No specializations found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSpecialization ? 'Edit Specialization' : 'Add New Specialization'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingSpecialization(null);
                    setFormData({
                      name: '',
                      description: '',
                      icon: '',
                      isActive: true,
                      tags: []
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Cardiology"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the specialization..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Font Awesome icon class or emoji"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tag and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingSpecialization(null);
                      setFormData({
                        name: '',
                        description: '',
                        icon: '',
                        isActive: true,
                        tags: []
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : editingSpecialization ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedSpecialization && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Delete Specialization</h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedSpecialization(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete the specialization "{selectedSpecialization.name}"? 
                  This action cannot be undone.
                </p>
                {selectedSpecialization.doctorCount > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      <strong>Warning:</strong> This specialization has {selectedSpecialization.doctorCount} 
                      doctor(s) assigned. Deleting it will remove their specialization assignment.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedSpecialization(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedSpecialization && handleDelete(selectedSpecialization.id)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedSpecialization && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Specialization Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSpecialization(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedSpecialization.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedSpecialization.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedSpecialization.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedSpecialization.description}</p>
                </div>

                {selectedSpecialization.tags && selectedSpecialization.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpecialization.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Doctors:</span>
                        <span className="font-medium">{selectedSpecialization.doctorCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Appointments:</span>
                        <span className="font-medium">{selectedSpecialization.appointmentCount}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dates</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{formatDate(selectedSpecialization.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Updated:</span>
                        <span className="font-medium">{formatDate(selectedSpecialization.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedSpecialization);
                    }}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedSpecialization.id, selectedSpecialization.isActive)}
                    className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                      selectedSpecialization.isActive
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedSpecialization.isActive ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Activate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecializationManagement;

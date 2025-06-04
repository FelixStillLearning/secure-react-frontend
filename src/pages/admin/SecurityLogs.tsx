import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
import apiClient from '../../api/axios.config';
import { SecurityLogWithUser } from '../../types/auth.types';

interface SecurityLogFilters {
  severity: string;
  type: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

interface SecurityStats {
  totalEvents: number;
  highSeverityEvents: number;
  mediumSeverityEvents: number;
  lowSeverityEvents: number;
  uniqueUsers: number;
  recentSuspiciousActivity: number;
}

const SecurityLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLogWithUser[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SecurityLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    highSeverityEvents: 0,
    mediumSeverityEvents: 0,
    lowSeverityEvents: 0,
    uniqueUsers: 0,
    recentSuspiciousActivity: 0
  });
  const [selectedLog, setSelectedLog] = useState<SecurityLogWithUser | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [filters, setFilters] = useState<SecurityLogFilters>({
    severity: 'all',
    type: 'all',
    userId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });  const loadSecurityLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/security-logs');
      setLogs(response.data);
        SecurityUtils.logSecurityEvent({
        action: 'view_security_logs',
        success: true,
        details: { logCount: response.data.length },
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to load security logs:', error);
      SecurityUtils.logSecurityEvent({
        action: 'load_security_logs_error',
        success: false,
        details: { error: (error as any)?.message || 'Unknown error' },
        userId: user?.id
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  const loadSecurityStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/security-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load security stats:', error);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...logs];

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(log => log.type === filters.type);
    }

    // User ID filter
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.type.toLowerCase().includes(searchTerm) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm) ||
        log.userName?.toLowerCase().includes(searchTerm) ||
        log.userEmail?.toLowerCase().includes(searchTerm)
      );
    }    setFilteredLogs(filtered);
  }, [logs, filters]);

  useEffect(() => {
    loadSecurityLogs();
    loadSecurityStats();
  }, [loadSecurityLogs, loadSecurityStats]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleLogClick = (log: SecurityLogWithUser) => {
    setSelectedLog(log);
    setShowLogModal(true);    SecurityUtils.logSecurityEvent({
      action: 'view_security_log_details',
      success: true,
      details: { logId: log.id },
      userId: user?.id
    });
  };
  const getSeverityBadge = (severity: string) => {
    const severityClasses: { [key: string]: string } = {
      high: 'severity-high',
      medium: 'severity-medium',
      low: 'severity-low'
    };
    
    return (
      <span className={`severity-badge ${severityClasses[severity.toLowerCase()] || 'severity-default'}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };
  const getTypeIcon = (type: string) => {
    const typeIcons: { [key: string]: string } = {
      LOGIN_ATTEMPT: 'fa-sign-in-alt',
      LOGIN_SUCCESS: 'fa-check-circle',
      LOGIN_FAILURE: 'fa-times-circle',
      LOGOUT: 'fa-sign-out-alt',
      PASSWORD_CHANGE: 'fa-key',
      ACCOUNT_LOCKOUT: 'fa-lock',
      RATE_LIMIT_EXCEEDED: 'fa-tachometer-alt',
      SUSPICIOUS_ACTIVITY: 'fa-exclamation-triangle',
      DATA_ACCESS: 'fa-database',
      DATA_MODIFICATION: 'fa-edit',
      DATA_DELETION: 'fa-trash',
      ADMIN_ACTION: 'fa-user-shield',
      SECURITY_VIOLATION: 'fa-shield-alt',
      SYSTEM_ERROR: 'fa-bug'
    };
    
    return typeIcons[type] || 'fa-info-circle';
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDetails = (details: any) => {
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  };

  const handleFilterChange = (key: keyof SecurityLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      severity: 'all',
      type: 'all',
      userId: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const exportLogs = async () => {
    try {
      const response = await apiClient.get('/admin/security-logs/export', {
        params: filters,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
        SecurityUtils.logSecurityEvent({
        action: 'export_security_logs',
        success: true,
        details: { format: 'csv' },
        userId: user?.id
      });
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading security logs...</p>
      </div>
    );
  }

  return (
    <div className="security-logs-page">
      <div className="page-header">
        <h1>Security Logs</h1>
        <button className="btn btn-secondary" onClick={exportLogs}>
          <i className="fas fa-download"></i>
          Export Logs
        </button>
      </div>

      <div className="security-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-list"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalEvents}</div>
              <div className="stat-label">Total Events</div>
            </div>
          </div>
          
          <div className="stat-card high-severity">
            <div className="stat-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.highSeverityEvents}</div>
              <div className="stat-label">High Severity</div>
            </div>
          </div>
          
          <div className="stat-card medium-severity">
            <div className="stat-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.mediumSeverityEvents}</div>
              <div className="stat-label">Medium Severity</div>
            </div>
          </div>
          
          <div className="stat-card low-severity">
            <div className="stat-icon">
              <i className="fas fa-info-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.lowSeverityEvents}</div>
              <div className="stat-label">Low Severity</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.uniqueUsers}</div>
              <div className="stat-label">Unique Users</div>
            </div>
          </div>
          
          <div className="stat-card suspicious">
            <div className="stat-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.recentSuspiciousActivity}</div>
              <div className="stat-label">Recent Suspicious</div>
            </div>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="LOGIN_ATTEMPT">Login Attempt</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGIN_FAILURE">Login Failure</option>
            <option value="LOGOUT">Logout</option>
            <option value="PASSWORD_CHANGE">Password Change</option>
            <option value="ACCOUNT_LOCKOUT">Account Lockout</option>
            <option value="RATE_LIMIT_EXCEEDED">Rate Limit Exceeded</option>
            <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
            <option value="DATA_ACCESS">Data Access</option>
            <option value="DATA_MODIFICATION">Data Modification</option>
            <option value="DATA_DELETION">Data Deletion</option>
            <option value="ADMIN_ACTION">Admin Action</option>
            <option value="SECURITY_VIOLATION">Security Violation</option>
            <option value="SYSTEM_ERROR">System Error</option>
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

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Type</th>
              <th>Severity</th>
              <th>User</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className={`severity-${log.severity}`}>
                <td>{formatDateTime(log.timestamp)}</td>
                <td>
                  <div className="log-type">
                    <i className={`fas ${getTypeIcon(log.type)}`}></i>
                    <span>{log.type.replace(/_/g, ' ')}</span>
                  </div>
                </td>
                <td>{getSeverityBadge(log.severity)}</td>
                <td>
                  <div className="user-info">
                    {log.userName && <div className="user-name">{log.userName}</div>}
                    {log.userEmail && <div className="user-email">{log.userEmail}</div>}
                    {!log.userName && !log.userEmail && log.userId && (
                      <div className="user-id">{log.userId}</div>
                    )}
                    {!log.userId && <div className="anonymous">Anonymous</div>}
                  </div>
                </td>
                <td>
                  <div className="log-details-preview">
                    {log.details.action && <span className="action">{log.details.action}</span>}
                    {log.details.error && <span className="error">{log.details.error}</span>}
                    {log.details.ipAddress && <span className="ip">{log.details.ipAddress}</span>}
                  </div>
                </td>
                <td>
                  <button
                    className="btn-icon view"
                    onClick={() => handleLogClick(log)}
                    title="View details"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="no-logs">
            <i className="fas fa-shield-alt"></i>
            <h3>No security logs found</h3>
            <p>Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {showLogModal && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-content log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Security Log Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowLogModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="log-details-modal">
                <div className="log-header">
                  <div className="log-type-icon">
                    <i className={`fas ${getTypeIcon(selectedLog.type)}`}></i>
                  </div>
                  <div className="log-info">
                    <h3>{selectedLog.type.replace(/_/g, ' ')}</h3>
                    <p>{formatDateTime(selectedLog.timestamp)}</p>
                    {getSeverityBadge(selectedLog.severity)}
                  </div>
                </div>

                <div className="log-metadata">
                  <div className="metadata-item">
                    <label>Log ID:</label>
                    <span>{selectedLog.id}</span>
                  </div>
                  <div className="metadata-item">
                    <label>User ID:</label>
                    <span>{selectedLog.userId || 'Anonymous'}</span>
                  </div>
                  {selectedLog.userName && (
                    <div className="metadata-item">
                      <label>User Name:</label>
                      <span>{selectedLog.userName}</span>
                    </div>
                  )}
                  {selectedLog.userEmail && (
                    <div className="metadata-item">
                      <label>User Email:</label>
                      <span>{selectedLog.userEmail}</span>
                    </div>
                  )}
                </div>

                <div className="log-details-section">
                  <h4>Details</h4>
                  <pre className="details-json">{formatDetails(selectedLog.details)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLogsPage;

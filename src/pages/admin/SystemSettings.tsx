import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings,
  Save,
  RefreshCw,
  Download,
  Upload,
  TestTube,
  Shield,
  Globe,
  Users,
  Bell,
  Calendar,
  Database,
  Wrench,
  Search,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Lock,
  HardDrive,
  Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditLogger } from '../../utils/security';
import { apiClient } from '../../api/axios.config';

interface SystemConfig {
  general: {
    applicationName: string;
    applicationVersion: string;
    systemTimezone: string;
    defaultLanguage: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
    maintenanceMode: boolean;
    systemAnnouncement: string;
    debugMode: boolean;
    featureToggles: {
      patientRegistration: boolean;
      doctorRegistration: boolean;
      onlinePayments: boolean;
      videoConsultations: boolean;
      appointmentReminders: boolean;
    };
  };
  authentication: {
    patientRegistrationEnabled: boolean;
    doctorRegistrationEnabled: boolean;
    emailVerificationRequired: boolean;
    manualApprovalRequired: boolean;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      expirationDays: number;
    };
    loginAttempts: {
      maxAttempts: number;
      lockoutDuration: number;
    };
    session: {
      timeoutDuration: number;
      concurrentLoginLimit: number;
      rememberMeDuration: number;
    };
  };
  notifications: {
    email: {
      smtpHost: string;
      smtpPort: number;
      smtpUsername: string;
      smtpPassword: string;
      smtpSecure: boolean;
      fromAddress: string;
      fromName: string;
      frequencyLimit: number;
    };
    sms: {
      provider: string;
      apiKey: string;
      fromNumber: string;
      enabled: boolean;
    };
    push: {
      enabled: boolean;
      vapidPublicKey: string;
      vapidPrivateKey: string;
    };
    reminders: {
      appointmentReminder24h: boolean;
      appointmentReminder2h: boolean;
      followupReminders: boolean;
      medicationReminders: boolean;
    };
  };
  appointments: {
    booking: {
      advanceBookingDays: number;
      cancellationHours: number;
      noShowGracePeriod: number;
      overbookingAllowed: boolean;
      overbookingPercentage: number;
    };
    timeSlots: {
      defaultDuration: number;
      bufferTime: number;
      workingHoursStart: string;
      workingHoursEnd: string;
    };
    payments: {
      methods: string[];
      consultationFee: number;
      cancellationFee: number;
      currency: string;
    };
  };
  security: {
    accessControl: {
      ipWhitelist: string[];
      ipBlacklist: string[];
      rateLimiting: {
        enabled: boolean;
        requestsPerMinute: number;
        burstLimit: number;
      };
      twoFactorRequired: boolean;
      adminApprovalRequired: boolean;
    };
    dataProtection: {
      dataRetentionDays: number;
      backupRetentionDays: number;
      encryptionEnabled: boolean;
      auditLogRetentionDays: number;
      gdprCompliance: boolean;
    };
  };
  integrations: {
    paymentGateway: {
      provider: string;
      publicKey: string;
      privateKey: string;
      webhookSecret: string;
      testMode: boolean;
    };
    calendar: {
      googleCalendarEnabled: boolean;
      outlookEnabled: boolean;
      syncInterval: number;
    };
    videoConsultation: {
      provider: string;
      apiKey: string;
      apiSecret: string;
      recordingSEnabled: boolean;
    };
    laboratory: {
      enabled: boolean;
      apiEndpoint: string;
      apiKey: string;
      autoSync: boolean;
    };
  };
  backup: {
    automatic: {
      enabled: boolean;
      frequency: string;
      retentionDays: number;
      storageLocation: string;
    };
    maintenance: {
      maintenanceWindow: string;
      autoUpdatesEnabled: boolean;
      cacheRefreshInterval: number;
      logRetentionDays: number;
    };
  };
}

type SettingsTab = 'general' | 'authentication' | 'notifications' | 'appointments' | 'security' | 'integrations' | 'backup';

const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const loadSystemConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/system/config');
      setConfig(response.data);
      
      auditLogger.log('ADMIN_ACCESS_SYSTEM_SETTINGS', true, { 
        message: 'Admin accessed system settings'
      }, user?.id);
    } catch (err) {
      setError('Failed to load system configuration');
      console.error('Failed to load system config:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load system configuration
  useEffect(() => {
    loadSystemConfig();
  }, [loadSystemConfig]);

  const handleConfigChange = (section: keyof SystemConfig, field: string, value: any) => {
    if (!config) return;

    setConfig(prev => {
      if (!prev) return prev;
      
      const newConfig = { ...prev };
      if (field.includes('.')) {
        const [subField, actualField] = field.split('.');
        (newConfig[section] as any)[subField][actualField] = value;
      } else {
        (newConfig[section] as any)[field] = value;
      }
      
      return newConfig;
    });
    
    setUnsavedChanges(true);
    setSuccess(null);
    setError(null);
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await apiClient.put('/admin/system/config', config);
      
      setSuccess('System configuration updated successfully');
      setUnsavedChanges(false);
        auditLogger.log('ADMIN_UPDATE_SYSTEM_CONFIG', true, { 
        message: `Admin updated system configuration - Tab: ${activeTab}`
      }, user?.id);
    } catch (err) {
      setError('Failed to save configuration');
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfiguration = async (testType: string) => {
    try {
      setTesting(true);
      const response = await apiClient.post(`/admin/system/test/${testType}`, config);      
      if (response.data.success) {
        setSuccess(`${testType} test passed successfully`);
      } else {
        setError(`${testType} test failed: ${response.data.message}`);      }
      
      auditLogger.log('ADMIN_TEST_CONFIGURATION', response.data.success, { 
        testType,
        message: `Admin tested configuration: ${testType}`
      }, user?.id);    } catch (err) {
      setError(`Failed to test ${testType} configuration`);
    } finally {
      setTesting(false);
    }
  };

  const handleExportConfig = async () => {
    try {
      const response = await apiClient.get('/admin/system/config/export', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('Configuration exported successfully');
        auditLogger.log('ADMIN_EXPORT_CONFIG', true, { 
        message: 'Admin exported system configuration'
      }, user?.id);
    } catch (err) {
      setError('Failed to export configuration');
    }
  };

  const handleImportConfig = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('config', file);
      
      const response = await apiClient.post('/admin/system/config/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setConfig(response.data);
      setSuccess('Configuration imported successfully');
      setUnsavedChanges(true);
        auditLogger.log('ADMIN_IMPORT_CONFIG', true, { 
        message: 'Admin imported system configuration',
        fileName: file.name
      }, user?.id);
    } catch (err) {
      setError('Failed to import configuration');
    }
  };

  const handleBackupNow = async () => {
    try {
      await apiClient.post('/admin/system/backup/manual');
      setSuccess('Manual backup initiated successfully');
        auditLogger.log('ADMIN_CREATE_BACKUP', true, { 
        message: 'Admin initiated manual backup'
      }, user?.id);
    } catch (err) {
      setError('Failed to initiate backup');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'authentication', label: 'Authentication', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'backup', label: 'Backup & Maintenance', icon: Database }
  ];

  const filteredTabs = tabs.filter(tab =>
    tab.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">Failed to load system configuration</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadSystemConfig()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExportConfig}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <label className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Upload className="h-4 w-4 mr-2 inline" />
              Import
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportConfig(file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {unsavedChanges && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-yellow-800">You have unsaved changes</span>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <nav className="p-2">
              {filteredTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-3" />
                    {tab.label}
                    <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                  <button
                    onClick={() => handleTestConfiguration('general')}
                    disabled={testing}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Configuration
                  </button>
                </div>

                <div className="space-y-6">
                  {/* System Information */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Info className="h-5 w-5 mr-2 text-blue-500" />
                      System Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Application Name
                        </label>
                        <input
                          type="text"
                          value={config.general.applicationName}
                          onChange={(e) => handleConfigChange('general', 'applicationName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Application Version
                        </label>
                        <input
                          type="text"
                          value={config.general.applicationVersion}
                          onChange={(e) => handleConfigChange('general', 'applicationVersion', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          System Timezone
                        </label>
                        <select
                          value={config.general.systemTimezone}
                          onChange={(e) => handleConfigChange('general', 'systemTimezone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">America/New_York</option>
                          <option value="America/Los_Angeles">America/Los_Angeles</option>
                          <option value="Europe/London">Europe/London</option>
                          <option value="Asia/Tokyo">Asia/Tokyo</option>
                          <option value="Asia/Jakarta">Asia/Jakarta</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default Language
                        </label>
                        <select
                          value={config.general.defaultLanguage}
                          onChange={(e) => handleConfigChange('general', 'defaultLanguage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="en">English</option>
                          <option value="id">Indonesian</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date Format
                        </label>
                        <select
                          value={config.general.dateFormat}
                          onChange={(e) => handleConfigChange('general', 'dateFormat', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={config.general.currency}
                          onChange={(e) => handleConfigChange('general', 'currency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="IDR">IDR - Indonesian Rupiah</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* System Controls */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-gray-500" />
                      System Controls
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                          <p className="text-sm text-gray-500">Temporarily disable access for maintenance</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.general.maintenanceMode}
                            onChange={(e) => handleConfigChange('general', 'maintenanceMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                          <p className="text-sm text-gray-500">Enable detailed logging and debugging</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.general.debugMode}
                            onChange={(e) => handleConfigChange('general', 'debugMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          System Announcement
                        </label>
                        <textarea
                          value={config.general.systemAnnouncement}
                          onChange={(e) => handleConfigChange('general', 'systemAnnouncement', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter system-wide announcement message..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feature Toggles */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Palette className="h-5 w-5 mr-2 text-purple-500" />
                      Feature Toggles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(config.general.featureToggles).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => handleConfigChange('general', `featureToggles.${key}`, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Authentication Settings Tab */}
            {activeTab === 'authentication' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Authentication Settings</h2>
                  <button
                    onClick={() => handleTestConfiguration('authentication')}
                    disabled={testing}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Configuration
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Registration Settings */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2 text-green-500" />
                      Registration Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Patient Registration</label>
                          <p className="text-sm text-gray-500">Allow new patients to register</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.authentication.patientRegistrationEnabled}
                            onChange={(e) => handleConfigChange('authentication', 'patientRegistrationEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Doctor Registration</label>
                          <p className="text-sm text-gray-500">Allow new doctors to register</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.authentication.doctorRegistrationEnabled}
                            onChange={(e) => handleConfigChange('authentication', 'doctorRegistrationEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email Verification Required</label>
                          <p className="text-sm text-gray-500">Require email verification for new accounts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.authentication.emailVerificationRequired}
                            onChange={(e) => handleConfigChange('authentication', 'emailVerificationRequired', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Manual Approval Required</label>
                          <p className="text-sm text-gray-500">Require admin approval for new accounts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.authentication.manualApprovalRequired}
                            onChange={(e) => handleConfigChange('authentication', 'manualApprovalRequired', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Password Policy */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Lock className="h-5 w-5 mr-2 text-red-500" />
                      Password Policy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          value={config.authentication.passwordPolicy.minLength}
                          onChange={(e) => handleConfigChange('authentication', 'passwordPolicy.minLength', parseInt(e.target.value))}
                          min="6"
                          max="32"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiration Days
                        </label>
                        <input
                          type="number"
                          value={config.authentication.passwordPolicy.expirationDays}
                          onChange={(e) => handleConfigChange('authentication', 'passwordPolicy.expirationDays', parseInt(e.target.value))}
                          min="0"
                          max="365"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {Object.entries(config.authentication.passwordPolicy)
                        .filter(([key]) => key.startsWith('require'))
                        .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 capitalize">
                              {key.replace('require', '').replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input
                              type="checkbox"
                              checked={value as boolean}
                              onChange={(e) => handleConfigChange('authentication', `passwordPolicy.${key}`, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Login Security */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-blue-500" />
                      Login Security
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Login Attempts
                        </label>
                        <input
                          type="number"
                          value={config.authentication.loginAttempts.maxAttempts}
                          onChange={(e) => handleConfigChange('authentication', 'loginAttempts.maxAttempts', parseInt(e.target.value))}
                          min="3"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lockout Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={config.authentication.loginAttempts.lockoutDuration}
                          onChange={(e) => handleConfigChange('authentication', 'loginAttempts.lockoutDuration', parseInt(e.target.value))}
                          min="5"
                          max="1440"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          value={config.authentication.session.timeoutDuration}
                          onChange={(e) => handleConfigChange('authentication', 'session.timeoutDuration', parseInt(e.target.value))}
                          min="15"
                          max="480"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add more tabs here... */}
            {/* For brevity, I'll add placeholders for other tabs */}
            
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Settings</h2>
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Notification configuration panel coming soon...</p>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Appointment Settings</h2>
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Appointment configuration panel coming soon...</p>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
                <div className="text-center py-12">
                  <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Security configuration panel coming soon...</p>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Integration Settings</h2>
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Integration configuration panel coming soon...</p>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Backup & Maintenance</h2>
                  <button
                    onClick={handleBackupNow}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Backup Now
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Automatic Backup */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Database className="h-5 w-5 mr-2 text-blue-500" />
                      Automatic Backup
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enable Automatic Backup</label>
                          <p className="text-sm text-gray-500">Automatically backup system data</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.backup.automatic.enabled}
                            onChange={(e) => handleConfigChange('backup', 'automatic.enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Backup Frequency
                          </label>
                          <select
                            value={config.backup.automatic.frequency}
                            onChange={(e) => handleConfigChange('backup', 'automatic.frequency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Retention Days
                          </label>
                          <input
                            type="number"
                            value={config.backup.automatic.retentionDays}
                            onChange={(e) => handleConfigChange('backup', 'automatic.retentionDays', parseInt(e.target.value))}
                            min="7"
                            max="365"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Settings */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-gray-500" />
                      Maintenance Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maintenance Window
                        </label>
                        <input
                          type="time"
                          value={config.backup.maintenance.maintenanceWindow}
                          onChange={(e) => handleConfigChange('backup', 'maintenance.maintenanceWindow', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Log Retention Days
                        </label>
                        <input
                          type="number"
                          value={config.backup.maintenance.logRetentionDays}
                          onChange={(e) => handleConfigChange('backup', 'maintenance.logRetentionDays', parseInt(e.target.value))}
                          min="30"
                          max="365"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Auto Updates</label>
                          <p className="text-sm text-gray-500">Automatically install security updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.backup.maintenance.autoUpdatesEnabled}
                            onChange={(e) => handleConfigChange('backup', 'maintenance.autoUpdatesEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

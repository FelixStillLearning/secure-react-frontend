import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  Search,
  ChevronDown,
  Mail,
  Phone
} from 'lucide-react';
import { logSecurityEvent, validateInput } from '../../utils/security';

interface ReportMetrics {
  totalAppointments: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  patientGrowth: number;
  doctorUtilization: number;
}

interface ChartData {
  name: string;
  value: number;
  appointments?: number;
  revenue?: number;
  patients?: number;
  doctors?: number;
  growth?: number;
}

interface TimeFilter {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}

interface ReportFilter {
  department?: string;
  doctor?: string;
  reportType: 'overview' | 'appointments' | 'financial' | 'performance' | 'user-activity';
  timeFilter: TimeFilter;
}

const ReportsAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalAppointments: 0,
    totalRevenue: 0,
    averageRating: 0,
    completionRate: 0,
    patientGrowth: 0,
    doctorUtilization: 0
  });

  const [appointmentData, setAppointmentData] = useState<ChartData[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [departmentData, setDepartmentData] = useState<ChartData[]>([]);
  const [userActivityData, setUserActivityData] = useState<ChartData[]>([]);
  const [satisfactionData, setSatisfactionData] = useState<ChartData[]>([]);

  const [filter, setFilter] = useState<ReportFilter>({
    reportType: 'overview',
    timeFilter: { period: 'month' }
  });

  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [generateModal, setGenerateModal] = useState(false);

  // Sample data - in real app, this would come from API
  useEffect(() => {
    generateSampleData();
  }, [filter]);

  const generateSampleData = () => {
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      // Metrics
      setMetrics({
        totalAppointments: 1247,
        totalRevenue: 125670,
        averageRating: 4.7,
        completionRate: 94.2,
        patientGrowth: 23.5,
        doctorUtilization: 87.3
      });

      // Appointment trends
      setAppointmentData([
        { name: 'Jan', appointments: 120, value: 120 },
        { name: 'Feb', appointments: 145, value: 145 },
        { name: 'Mar', appointments: 167, value: 167 },
        { name: 'Apr', appointments: 189, value: 189 },
        { name: 'May', appointments: 201, value: 201 },
        { name: 'Jun', appointments: 234, value: 234 },
        { name: 'Jul', appointments: 267, value: 267 }
      ]);

      // Revenue data
      setRevenueData([
        { name: 'Jan', revenue: 12400, value: 12400 },
        { name: 'Feb', revenue: 15600, value: 15600 },
        { name: 'Mar', revenue: 18900, value: 18900 },
        { name: 'Apr', revenue: 21200, value: 21200 },
        { name: 'May', revenue: 19800, value: 19800 },
        { name: 'Jun', revenue: 23400, value: 23400 },
        { name: 'Jul', revenue: 28900, value: 28900 }
      ]);

      // Department distribution
      setDepartmentData([
        { name: 'Cardiology', value: 234, appointments: 234 },
        { name: 'Neurology', value: 189, appointments: 189 },
        { name: 'Orthopedics', value: 167, appointments: 167 },
        { name: 'Dermatology', value: 145, appointments: 145 },
        { name: 'Pediatrics', value: 134, appointments: 134 },
        { name: 'Others', value: 378, appointments: 378 }
      ]);

      // User activity
      setUserActivityData([
        { name: 'Mon', patients: 45, doctors: 12, value: 57 },
        { name: 'Tue', patients: 52, doctors: 15, value: 67 },
        { name: 'Wed', patients: 48, doctors: 13, value: 61 },
        { name: 'Thu', patients: 61, doctors: 16, value: 77 },
        { name: 'Fri', patients: 55, doctors: 14, value: 69 },
        { name: 'Sat', patients: 38, doctors: 10, value: 48 },
        { name: 'Sun', patients: 29, doctors: 8, value: 37 }
      ]);

      // Patient satisfaction
      setSatisfactionData([
        { name: 'Excellent', value: 45 },
        { name: 'Good', value: 32 },
        { name: 'Average', value: 15 },
        { name: 'Poor', value: 6 },
        { name: 'Very Poor', value: 2 }
      ]);

      setLoading(false);
    }, 1000);
  };

  const handleFilterChange = (newFilter: Partial<ReportFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    
    logSecurityEvent('admin', 'report_filter_changed', {
      reportType: updatedFilter.reportType,
      timeFilter: updatedFilter.timeFilter
    });
  };

  const handleExportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setLoading(true);
      
      // In real app, call API to generate report
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate file download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `medical_report_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      logSecurityEvent('admin', 'report_exported', {
        format,
        reportType: filter.reportType
      });
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCustomReport = () => {
    setGenerateModal(true);
  };

  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={handleGenerateCustomReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </button>
          
          <button
            onClick={() => generateSampleData()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={filter.reportType}
                onChange={(e) => handleFilterChange({ reportType: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="overview">Overview</option>
                <option value="appointments">Appointments</option>
                <option value="financial">Financial</option>
                <option value="performance">Performance</option>
                <option value="user-activity">User Activity</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={filter.timeFilter.period}
                onChange={(e) => handleFilterChange({ 
                  timeFilter: { ...filter.timeFilter, period: e.target.value as any }
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={filter.department || ''}
                onChange={(e) => handleFilterChange({ department: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                <option value="cardiology">Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="orthopedics">Orthopedics</option>
                <option value="dermatology">Dermatology</option>
                <option value="pediatrics">Pediatrics</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doctor
              </label>
              <select
                value={filter.doctor || ''}
                onChange={(e) => handleFilterChange({ doctor: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Doctors</option>
                <option value="dr-smith">Dr. Smith</option>
                <option value="dr-johnson">Dr. Johnson</option>
                <option value="dr-williams">Dr. Williams</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => handleFilterChange({})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalAppointments.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageRating}/5</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patient Growth</p>
              <p className="text-2xl font-bold text-gray-900">+{metrics.patientGrowth}%</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Doctor Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.doctorUtilization}%</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Trends</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportReport('excel')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Analysis</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportReport('excel')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Department Distribution</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportReport('pdf')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportReport('csv')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="patients" fill="#3B82F6" />
              <Bar dataKey="doctors" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Patient Satisfaction */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Patient Satisfaction Distribution</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportReport('pdf')}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={satisfactionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="value" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="space-y-4">
            {satisfactionData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{item.value}%</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${item.value}%`,
                        backgroundColor: chartColors[index % chartColors.length]
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExportReport('pdf')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            <FileText className="w-6 h-6 text-red-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">PDF Report</p>
              <p className="text-sm text-gray-600">Comprehensive formatted report</p>
            </div>
          </button>
          
          <button
            onClick={() => handleExportReport('excel')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            <BarChart3 className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Excel Workbook</p>
              <p className="text-sm text-gray-600">Data with charts and analysis</p>
            </div>
          </button>
          
          <button
            onClick={() => handleExportReport('csv')}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            <Download className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">CSV Data</p>
              <p className="text-sm text-gray-600">Raw data for external analysis</p>
            </div>
          </button>
        </div>
      </div>

      {/* Generate Custom Report Modal */}
      {generateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Custom Report</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Name
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter report name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Sections
                </label>
                <div className="space-y-2">
                  {['Overview Metrics', 'Appointment Analysis', 'Revenue Report', 'User Activity', 'Patient Satisfaction'].map((section) => (
                    <label key={section} className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm text-gray-700">{section}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="pdf">PDF Report</option>
                  <option value="excel">Excel Workbook</option>
                  <option value="csv">CSV Data</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setGenerateModal(false);
                  handleExportReport('pdf');
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Generate Report
              </button>
              <button
                onClick={() => setGenerateModal(false)}
                className="flex-1 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-gray-900">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;

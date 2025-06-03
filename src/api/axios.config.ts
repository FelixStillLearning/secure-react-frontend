import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { secureStorage, generateCSRFToken, validateSecurityHeaders, analyzeUserAgent, generateDeviceFingerprint } from '../utils/security';

// Interface for API Error Response
interface APIErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}

// Create axios instance with security configurations
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  withCredentials: true, // For handling cookies securely
  validateStatus: (status) => {
    // Only consider 2xx status codes as successful
    return status >= 200 && status < 300;
  }
});

// Request interceptor for adding auth token and security headers
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Add authentication token
      const token = secureStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token
      const csrfToken = generateCSRFToken();
      config.headers['X-CSRF-Token'] = csrfToken;

      // Add device fingerprint for additional security
      if (process.env.REACT_APP_ENABLE_FINGERPRINTING === 'true') {
        try {
          const fingerprint = await generateDeviceFingerprint();
          config.headers['X-Device-Fingerprint'] = fingerprint;
        } catch (error) {
          console.warn('Failed to generate device fingerprint:', error);
        }
      }

      // Add user agent analysis
      const userAgentInfo = analyzeUserAgent();
      config.headers['X-Client-Info'] = JSON.stringify(userAgentInfo);

      // Add request timestamp
      config.headers['X-Request-Time'] = new Date().toISOString();

      // Add request ID for tracking
      config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors and security validation
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Validate security headers in response
    if (!validateSecurityHeaders(response)) {
      console.warn('Response missing required security headers');
    }

    // Log successful requests in development
    if (process.env.REACT_APP_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }

    return response;
  },
  (error) => {
    // Handle different types of errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth data and redirect to login
          console.warn('Authentication failed - clearing session');
          secureStorage.removeItem('authToken');
          secureStorage.removeItem('userProfile');
          
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?reason=session_expired';
          }
          break;

        case 403:
          // Forbidden - insufficient permissions
          console.warn('Access denied - insufficient permissions');
          break;

        case 429:
          // Rate limit exceeded
          console.warn('Rate limit exceeded - please slow down');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('Server error occurred:', data);
          break;

        default:
          console.error(`API Error ${status}:`, data);
      }

      // Create standardized error object
      const apiError: APIErrorResponse = {
        message: data?.message || `Request failed with status ${status}`,
        statusCode: status,
        error: data?.error
      };

      return Promise.reject(apiError);
    } else if (error.request) {
      // Network error
      console.error('Network error - request was made but no response received');
      return Promise.reject({
        message: 'Network error - please check your internet connection',
        statusCode: 0,
        error: 'NETWORK_ERROR'
      });
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        message: 'Request configuration error',
        statusCode: 0,
        error: 'REQUEST_SETUP_ERROR'
      });
    }
  }
);

// API methods with enhanced security
export const apiMethods = {
  // Authentication endpoints
  auth: {
    login: (credentials: { email: string; password: string }) =>
      api.post('/auth/login', credentials),
    register: (userData: any) =>
      api.post('/auth/register', userData),
    logout: () =>
      api.post('/auth/logout'),
    refreshToken: () =>
      api.post('/auth/refresh'),
  },

  // User management
  users: {
    getProfile: () =>
      api.get('/users/profile'),
    updateProfile: (data: any) =>
      api.patch('/users/profile', data),
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/users/change-password', data),
  },

  // Patient endpoints
  patients: {
    getProfile: () =>
      api.get('/patients/profile'),
    updateProfile: (data: any) =>
      api.patch('/patients/profile', data),
    getAppointments: () =>
      api.get('/appointments?role=patient'),
  },

  // Doctor endpoints
  doctors: {
    getAll: () =>
      api.get('/doctors'),
    getProfile: () =>
      api.get('/doctors/profile'),
    updateProfile: (data: any) =>
      api.patch('/doctors/profile', data),
    getSchedule: () =>
      api.get('/doctor-schedules/my'),
    getBySpecialization: (specializationId: string) =>
      api.get(`/doctors/specialization/${specializationId}`),
  },

  // Appointment endpoints
  appointments: {
    create: (data: any) =>
      api.post('/appointments', data),
    getAll: (filters?: any) =>
      api.get('/appointments', { params: filters }),
    getById: (id: string) =>
      api.get(`/appointments/${id}`),
    update: (id: string, data: any) =>
      api.patch(`/appointments/${id}`, data),
    cancel: (id: string) =>
      api.patch(`/appointments/${id}/cancel`),
  },

  // Specialization endpoints
  specializations: {
    getAll: () =>
      api.get('/specializations'),
  },

  // Review endpoints
  reviews: {
    create: (data: any) =>
      api.post('/reviews', data),
    getByDoctor: (doctorId: string) =>
      api.get(`/reviews?doctor_id=${doctorId}`),
  },
};

// Health check function
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

// Export the configured axios instance
export default api;
// Export api as apiClient for components that use this name
export { api as apiClient };

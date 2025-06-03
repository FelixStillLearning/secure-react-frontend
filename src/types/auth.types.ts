// Authentication and user types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  profile?: UserProfile;
}

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
  };
  acceptTerms: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: User;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expiresIn: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
}

// Security event logging
export interface SecurityEvent {
  event: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data: Record<string, any>;
  timestamp?: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  timezone: string;
  plugins: string[];
  canvas?: string;
  webgl?: string;
  fonts?: string[];
}

// Session management
export interface UserSession {
  userId: string;
  sessionId: string;
  createdAt: string;
  lastActivity: string;
  deviceFingerprint: DeviceFingerprint;
  ipAddress?: string;
  isActive: boolean;
}

// Rate limiting
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDuration: number;
}

export interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, any>;
}

// Medical system specific types
export interface Patient extends User {
  medicalHistory?: MedicalHistory[];
  appointments?: Appointment[];
  insuranceInfo?: InsuranceInfo;
}

export interface Doctor extends User {
  specialization: string;
  licenseNumber: string;
  experience: number;
  consultationFee: number;
  availability: DoctorAvailability[];
  rating?: number;
  reviewsCount?: number;
}

export interface MedicalHistory {
  id: string;
  patientId: string;
  diagnosis: string;
  treatment: string;
  medications: string[];
  notes?: string;
  date: string;
  doctorId: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  duration: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  type: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY';
  notes?: string;
  prescription?: string;
  fee: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  coverageAmount: number;
}

export interface Review {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Specialization {
  id: string;
  name: string;
  description: string;
  doctorsCount?: number;
}

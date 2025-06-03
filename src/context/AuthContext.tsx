import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { 
  tokenUtils, 
  secureStorage, 
  generateDeviceFingerprint, 
  analyzeUserAgent, 
  auditLogger,
  sessionManager,
  clientRateLimit
} from '../utils/security';
import { apiMethods } from '../api/axios.config';

// User roles enum
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin'
}

// User interface
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isVerified?: boolean;
  profileComplete?: boolean;
  lastLogin?: string;
}

// Authentication state interface
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  loginAttempts: number;
  isLocked: boolean;
  lockoutTimeRemaining: number;
}

// Authentication context interface
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (userData: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  updateUserProfile: (userData: Partial<User>) => void;
  checkTokenExpiry: () => void;
  getRemainingLoginAttempts: () => number;
  getTimeUntilUnlock: () => number;
}

// Default auth state
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  loginAttempts: 0,
  isLocked: false,
  lockoutTimeRemaining: 0
};

// Create context
export const AuthContext = createContext<AuthContextType>({
  ...defaultAuthState,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshToken: async () => false,
  clearError: () => {},
  updateUserProfile: () => {},
  checkTokenExpiry: () => {},
  getRemainingLoginAttempts: () => 0,
  getTimeUntilUnlock: () => 0,
});

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  // Update auth state helper
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        updateAuthState({ isLoading: true, error: null });

        // Check if session is active
        if (!sessionManager.isSessionActive()) {
          updateAuthState({ 
            isAuthenticated: false, 
            user: null, 
            isLoading: false 
          });
          return;
        }

        const token = secureStorage.getItem('authToken');
        const userProfile = secureStorage.getItem('userProfile');

        if (token && tokenUtils.isTokenValid(token) && userProfile) {
          // Update last activity
          sessionManager.updateActivity();
          
          updateAuthState({
            isAuthenticated: true,
            user: userProfile,
            isLoading: false,
            error: null
          });

          auditLogger.log('SESSION_RESTORED', true, { userId: userProfile.id });
        } else {
          // Clear invalid session data
          sessionManager.endSession();
          updateAuthState({ 
            isAuthenticated: false, 
            user: null, 
            isLoading: false 
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        updateAuthState({ 
          isAuthenticated: false, 
          user: null, 
          isLoading: false,
          error: 'Failed to restore session'
        });
      }
    };

    initializeAuth();
  }, [updateAuthState]);

  // Check rate limiting
  const checkRateLimit = useCallback((email: string): boolean => {
    const rateLimitKey = `login_${email}`;
    const canAttempt = clientRateLimit.canAttempt(rateLimitKey);
    
    if (!canAttempt) {
      const timeUntilReset = clientRateLimit.getTimeUntilReset(rateLimitKey);
      updateAuthState({
        isLocked: true,
        lockoutTimeRemaining: timeUntilReset,
        error: `Too many login attempts. Please try again in ${Math.ceil(timeUntilReset / 60000)} minutes.`
      });
      return false;
    }
    
    return true;
  }, [updateAuthState]);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // Check rate limiting
      if (!checkRateLimit(email)) {
        return { success: false, message: 'Rate limit exceeded' };
      }

      // Prepare login data with security information
      const loginData = {
        email,
        password,
        deviceFingerprint: await generateDeviceFingerprint(),
        userAgent: analyzeUserAgent(),
        timestamp: new Date().toISOString()
      };

      // Attempt login
      const response = await apiMethods.auth.login(loginData);
      
      if (response.data && response.data.access_token && response.data.user) {
        const { access_token, user } = response.data;
        
        // Store authentication data securely
        secureStorage.setItem('authToken', access_token);
        secureStorage.setItem('userProfile', user);
        
        // Start session
        sessionManager.startSession(user);
        
        // Clear rate limiting for successful login
        clientRateLimit.clearAttempts(`login_${email}`);
        
        // Update state
        updateAuthState({
          isAuthenticated: true,
          user: user,
          isLoading: false,
          error: null,
          loginAttempts: 0,
          isLocked: false,
          lockoutTimeRemaining: 0
        });

        // Log successful login
        auditLogger.log('LOGIN_SUCCESS', true, { 
          userId: user.id, 
          email,
          userAgent: loginData.userAgent 
        });

        return { success: true, message: 'Login successful' };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed';
      
      if (error.statusCode === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.statusCode === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Log failed login attempt
      auditLogger.log('LOGIN_FAILED', false, { 
        email,
        error: errorMessage,
        statusCode: error.statusCode 
      });

      updateAuthState({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        user: null
      });

      return { success: false, message: errorMessage };
    }
  }, [updateAuthState, checkRateLimit]);

  // Register function
  const register = useCallback(async (userData: any): Promise<{ success: boolean; message?: string }> => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // Add security information to registration data
      const registrationData = {
        ...userData,
        deviceFingerprint: await generateDeviceFingerprint(),
        userAgent: analyzeUserAgent(),
        timestamp: new Date().toISOString()
      };

      const response = await apiMethods.auth.register(registrationData);
      
      if (response.data) {
        updateAuthState({
          isLoading: false,
          error: null
        });

        // Log successful registration
        auditLogger.log('REGISTRATION_SUCCESS', true, { 
          email: userData.email,
          role: userData.role 
        });

        return { 
          success: true, 
          message: 'Registration successful. Please check your email for verification instructions.' 
        };
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed';
      
      if (error.statusCode === 409) {
        errorMessage = 'Email or username already exists';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Log failed registration
      auditLogger.log('REGISTRATION_FAILED', false, { 
        email: userData.email,
        error: errorMessage 
      });

      updateAuthState({
        isLoading: false,
        error: errorMessage
      });

      return { success: false, message: errorMessage };
    }
  }, [updateAuthState]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      updateAuthState({ isLoading: true });

      const user = authState.user;
      
      // Call logout endpoint (optional, for server-side token invalidation)
      try {
        await apiMethods.auth.logout();
      } catch (error) {
        console.warn('Server logout failed, proceeding with client-side logout:', error);
      }

      // End session and clear all data
      sessionManager.endSession();
      
      // Update state
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
        loginAttempts: 0,
        isLocked: false,
        lockoutTimeRemaining: 0
      });

      // Log logout
      auditLogger.log('LOGOUT', true, { userId: user?.id });

    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if server call fails
      sessionManager.endSession();
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      });
    }
  }, [authState.user, updateAuthState]);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const currentToken = secureStorage.getItem('authToken');
      
      if (!currentToken || !tokenUtils.isTokenValid(currentToken)) {
        return false;
      }

      const response = await apiMethods.auth.refreshToken();
      
      if (response.data && response.data.access_token) {
        secureStorage.setItem('authToken', response.data.access_token);
        sessionManager.updateActivity();
        
        auditLogger.log('TOKEN_REFRESH', true, { userId: authState.user?.id });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      auditLogger.log('TOKEN_REFRESH_FAILED', false, { 
        userId: authState.user?.id,
        error: error 
      });
      return false;
    }
  }, [authState.user]);

  // Clear error function
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

  // Update user profile function
  const updateUserProfile = useCallback((userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      secureStorage.setItem('userProfile', updatedUser);
      updateAuthState({ user: updatedUser });
      
      auditLogger.log('PROFILE_UPDATE', true, { 
        userId: authState.user.id,
        updatedFields: Object.keys(userData)
      });
    }
  }, [authState.user, updateAuthState]);

  // Check token expiry function
  const checkTokenExpiry = useCallback(() => {
    const token = secureStorage.getItem('authToken');
    
    if (token && tokenUtils.isTokenExpiringSoon(token, 10)) {
      // Try to refresh token if it's expiring soon
      refreshToken().then(success => {
        if (!success) {
          // If refresh fails, logout user
          logout();
        }
      });
    }
  }, [refreshToken, logout]);

  // Get remaining login attempts
  const getRemainingLoginAttempts = useCallback((): number => {
    if (!authState.user?.email) return 5;
    return clientRateLimit.getRemainingAttempts(`login_${authState.user.email}`);
  }, [authState.user]);

  // Get time until unlock
  const getTimeUntilUnlock = useCallback((): number => {
    if (!authState.user?.email) return 0;
    return clientRateLimit.getTimeUntilReset(`login_${authState.user.email}`);
  }, [authState.user]);

  // Auto token expiry check
  useEffect(() => {
    if (authState.isAuthenticated) {
      const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, checkTokenExpiry]);

  // Auto activity update
  useEffect(() => {
    if (authState.isAuthenticated) {
      const handleActivity = () => sessionManager.updateActivity();
      
      // Listen for user activity
      const events = ['click', 'keypress', 'scroll', 'mousemove'];
      events.forEach(event => {
        document.addEventListener(event, handleActivity);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [authState.isAuthenticated]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateUserProfile,
    checkTokenExpiry,
    getRemainingLoginAttempts,
    getTimeUntilUnlock
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

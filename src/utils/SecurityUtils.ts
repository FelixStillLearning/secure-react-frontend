// SecurityUtils.ts - Unified security utilities for application-wide use
import { 
  secureStorage, 
  validateInput, 
  clientRateLimit, 
  auditLogger, 
  generateDeviceFingerprint, 
  securityConfig,
  sessionManager
} from './security';

// Security utility wrapper class for easier usage throughout the application
export const SecurityUtils = {
  // Authentication and session related
  validateSession: (): boolean => {
    return sessionManager.isSessionActive();
  },
  
  // Password strength calculation
  calculatePasswordStrength: (password: string): {
    score: number;
    feedback: string[];
    strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  } => {
    // Create a simple scoring system
    let score = 0;
    const feedback: string[] = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');
    
    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');
    
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');
    
    // Common patterns check
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeated characters');
    
    if (!/123|abc|qwe|password|admin/i.test(password)) score += 1;
    else feedback.push('Avoid common patterns and words');
    
    // Determine strength
    let strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
    if (score <= 2) strength = 'Very Weak';
    else if (score <= 4) strength = 'Weak';
    else if (score <= 6) strength = 'Fair';
    else if (score <= 7) strength = 'Good';
    else strength = 'Strong';
    
    return { score, feedback, strength };
  },
  
  startSession: (userData: any): void => {
    sessionManager.startSession(userData);
  },
  
  endSession: (): void => {
    sessionManager.endSession();
  },
  
  // Rate limiting functions
  checkRateLimit: (action: string, maxAttempts?: number, windowMs?: number): { allowed: boolean; remainingAttempts: number; timeUntilReset?: number } => {
    const allowed = clientRateLimit.canAttempt(action, maxAttempts, windowMs);
    const remainingAttempts = clientRateLimit.getRemainingAttempts(action, maxAttempts, windowMs);
    const timeUntilReset = allowed ? undefined : clientRateLimit.getTimeUntilReset(action, windowMs);
    
    return {
      allowed,
      remainingAttempts,
      timeUntilReset
    };
  },
  
  recordFailedAttempt: (action: string): void => {
    // This is already taken care of by checkRateLimit, but we expose it for explicit recording
    clientRateLimit.canAttempt(action);
  },
  
  clearRateLimits: (action: string): void => {
    clientRateLimit.clearAttempts(action);
  },
  
  getLoginAttempts: (): number => {
    return securityConfig.maxLoginAttempts - clientRateLimit.getRemainingAttempts('login');
  },
  
  // Input sanitization
  sanitizeInput: (value: string): string => {
    return validateInput.sanitizeString(value);
  },
  
  sanitizeHtml: (value: string): string => {
    return validateInput.sanitizeHtml(value);
  },
  
  // Secure storage wrappers
  storeSecurely: (key: string, value: any): boolean => {
    return secureStorage.setItem(key, value);
  },
  
  getSecureValue: (key: string): any => {
    return secureStorage.getItem(key);
  },
  
  removeSecureValue: (key: string): boolean => {
    return secureStorage.removeItem(key);
  },
  
  // Session functions
  getSessionId: (): string | null => {
    const session = secureStorage.getItem('userSession');
    return session?.sessionId || null;
  },
  
  updateUserActivity: (): void => {
    sessionManager.updateActivity();
  },
  
  // Device identification
  getDeviceFingerprint: async (): Promise<string> => {
    return await generateDeviceFingerprint();
  },
  
  // Audit logging
  logSecurityEvent: (eventData: { 
    action: string;
    success: boolean;
    details?: any;
    userId?: string;
  }): void => {
    auditLogger.log(
      eventData.action,
      eventData.success,
      eventData.details,
      eventData.userId
    );
  },
  
  getSecurityLogs: (limit?: number): any[] => {
    return auditLogger.getRecentLogs(limit);
  },

  // Method to initialize security on app start
  initializeSecurity: (): void => {
    // Set up security headers
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = secureStorage.getItem('csrfToken') || '';
    document.head.appendChild(meta);
    
    // Clear any stale data
    if (!sessionManager.isSessionActive()) {
      sessionManager.endSession();
    }
  }
};

export default SecurityUtils;

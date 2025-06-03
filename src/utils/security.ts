import CryptoJS from 'crypto-js';
import SecureLS from 'secure-ls';
import FingerprintJS from 'fingerprintjs2';
import { UAParser } from 'ua-parser-js';
import validator from 'validator';
import DOMPurify from 'dompurify';
import { jwtDecode } from 'jwt-decode';

// Secure Local Storage Configuration
const secureLS = new SecureLS({
  encodingType: 'aes',
  isCompression: false,
  encryptionSecret: process.env.REACT_APP_ENCRYPTION_SECRET || 'default-fallback-key-change-in-production'
});

// Security Configuration
interface SecurityConfig {
  enableFingerprinting: boolean;
  enableRateLimit: boolean;
  enableAuditLog: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // in milliseconds
}

const securityConfig: SecurityConfig = {
  enableFingerprinting: process.env.REACT_APP_ENABLE_FINGERPRINTING === 'true',
  enableRateLimit: process.env.REACT_APP_ENABLE_RATE_LIMITING === 'true',
  enableAuditLog: process.env.REACT_APP_ENABLE_AUDIT_LOGGING === 'true',
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// Audit Log Interface
interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
}

// Device Fingerprinting
const generateDeviceFingerprint = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!securityConfig.enableFingerprinting) {
      resolve('fingerprinting-disabled');
      return;
    }

    try {
      FingerprintJS.get((components) => {
        const values = components.map(component => component.value);
        const fingerprint = CryptoJS.SHA256(values.join('')).toString();
        resolve(fingerprint);
      });
    } catch (error) {      console.warn('Fingerprinting failed, using fallback:', error);
      // Fallback fingerprint based on available browser data
      const fallbackData = [
        navigator.userAgent,
        navigator.language,
        typeof window !== 'undefined' && window.screen ? window.screen.width + 'x' + window.screen.height : '1920x1080',
        new Date().getTimezoneOffset().toString()
      ].join('|');
      const fallbackFingerprint = CryptoJS.SHA256(fallbackData).toString();
      resolve(fallbackFingerprint);
    }
  });
};

// User Agent Analysis
const analyzeUserAgent = () => {
  const parser = new UAParser();
  const result = parser.getResult();
  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    device: result.device.type || 'desktop',
    isMobile: result.device.type === 'mobile' || result.device.type === 'tablet'
  };
};

// Secure Storage Methods
const secureStorage = {
  setItem: (key: string, value: any): boolean => {
    try {
      secureLS.set(key, value);
      return true;
    } catch (error) {
      console.error('Secure storage setItem failed:', error);
      return false;
    }
  },
  
  getItem: (key: string): any => {
    try {
      return secureLS.get(key);
    } catch (error) {
      console.error('Secure storage getItem failed:', error);
      return null;
    }
  },
  
  removeItem: (key: string): boolean => {
    try {
      secureLS.remove(key);
      return true;
    } catch (error) {
      console.error('Secure storage removeItem failed:', error);
      return false;
    }
  },
  
  clear: (): boolean => {
    try {
      secureLS.clear();
      return true;
    } catch (error) {
      console.error('Secure storage clear failed:', error);
      return false;
    }
  }
};

// Input Validation and Sanitization
const validateInput = {
  email: (email: string): boolean => {
    return validator.isEmail(email) && email.length <= 254;
  },
  
  password: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  sanitizeString: (str: string): string => {
    return validator.escape(str);
  },
  
  sanitizeHtml: (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  },
  
  isAlphanumeric: (str: string): boolean => {
    return validator.isAlphanumeric(str);
  },
  
  isURL: (url: string): boolean => {
    return validator.isURL(url, {
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    });
  },
  
  phoneNumber: (phone: string): boolean => {
    return validator.isMobilePhone(phone, 'any', { strictMode: false });
  },
  
  dateOfBirth: (date: string): boolean => {
    const parsedDate = new Date(date);
    const now = new Date();
    const hundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
    
    return validator.isDate(date) && 
           parsedDate <= now && 
           parsedDate >= hundredYearsAgo;
  }
};

// Rate Limiting for Client Side
class ClientRateLimit {
  private attempts: Map<string, number[]> = new Map();
  
  canAttempt(key: string, maxAttempts: number = securityConfig.maxLoginAttempts, windowMs: number = securityConfig.lockoutDuration): boolean {
    if (!securityConfig.enableRateLimit) {
      return true;
    }
    
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
  
  getRemainingAttempts(key: string, maxAttempts: number = securityConfig.maxLoginAttempts, windowMs: number = securityConfig.lockoutDuration): number {
    if (!securityConfig.enableRateLimit) {
      return maxAttempts;
    }
    
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    return Math.max(0, maxAttempts - validAttempts.length);
  }
  
  getTimeUntilReset(key: string, windowMs: number = securityConfig.lockoutDuration): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    if (attempts.length === 0) {
      return 0;
    }
    
    const oldestAttempt = Math.min(...attempts);
    const timeUntilReset = (oldestAttempt + windowMs) - now;
    
    return Math.max(0, timeUntilReset);
  }
  
  clearAttempts(key: string): void {
    this.attempts.delete(key);
  }
}

const clientRateLimit = new ClientRateLimit();

// Encryption/Decryption for sensitive data
const cryptoUtils = {
  encrypt: (text: string, secretKey?: string): string => {
    const key = secretKey || process.env.REACT_APP_ENCRYPTION_SECRET || 'default-key';
    return CryptoJS.AES.encrypt(text, key).toString();
  },
  
  decrypt: (ciphertext: string, secretKey?: string): string => {
    const key = secretKey || process.env.REACT_APP_ENCRYPTION_SECRET || 'default-key';
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  },
  
  hash: (text: string): string => {
    return CryptoJS.SHA256(text).toString();
  },
  
  generateRandomKey: (length: number = 32): string => {
    return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
  }
};

// CSRF Protection
const generateCSRFToken = (): string => {
  let token = secureStorage.getItem('csrfToken');
  
  if (!token) {
    token = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    secureStorage.setItem('csrfToken', token);
    
    // Also update the meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (metaTag) {
      metaTag.content = token;
    }
  }
  
  return token;
};

// JWT Token Management
const tokenUtils = {  isTokenValid: (token: string): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  },
    getTokenData: (token: string): any | null => {
    try {
      return jwtDecode(token);
    } catch (error) {
      return null;
    }
  },
    getTokenExpiry: (token: string): Date | null => {
    try {
      const decoded: any = jwtDecode(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  },
    isTokenExpiringSoon: (token: string, minutesBeforeExpiry: number = 10): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      const expiryTime = decoded.exp * 1000;
      const warningTime = expiryTime - (minutesBeforeExpiry * 60 * 1000);
      return Date.now() >= warningTime;
    } catch (error) {
      return true;
    }
  }
};

// Security Headers Validation
const validateSecurityHeaders = (response: any): boolean => {
  const requiredHeaders = [
    'x-content-type-options',
    'x-frame-options'
  ];
  
  return requiredHeaders.every(header => 
    response.headers && response.headers[header]
  );
};

// Audit Logging
const auditLogger = {
  log: (action: string, success: boolean, details?: any, userId?: string): void => {
    if (!securityConfig.enableAuditLog) {
      return;
    }
    
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      success,
      details,
      userAgent: navigator.userAgent,
      ipAddress: 'client-side' // Will be determined by backend
    };
    
    // Store audit logs in secure storage (limited to last 100 entries)
    const existingLogs = secureStorage.getItem('auditLogs') || [];
    const updatedLogs = [entry, ...existingLogs].slice(0, 100);
    secureStorage.setItem('auditLogs', updatedLogs);
    
    // Also log to console in development
    if (process.env.REACT_APP_ENV === 'development') {
      console.log('🔍 Audit Log:', entry);
    }
  },
  
  getRecentLogs: (limit: number = 50): AuditLogEntry[] => {
    const logs = secureStorage.getItem('auditLogs') || [];
    return logs.slice(0, limit);
  },
  
  clearLogs: (): void => {
    secureStorage.removeItem('auditLogs');
  }
};

// Password Strength Calculator
const calculatePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
} => {
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
};

// Session Management
const sessionManager = {
  startSession: (userData: any): void => {
    const sessionData = {
      ...userData,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    secureStorage.setItem('userSession', sessionData);
    auditLogger.log('SESSION_START', true, { userId: userData.id });
  },
  
  updateActivity: (): void => {
    const session = secureStorage.getItem('userSession');
    if (session) {
      session.lastActivity = new Date().toISOString();
      secureStorage.setItem('userSession', session);
    }
  },
  
  endSession: (): void => {
    const session = secureStorage.getItem('userSession');
    if (session) {
      auditLogger.log('SESSION_END', true, { 
        userId: session.id,
        duration: new Date().getTime() - new Date(session.loginTime).getTime()
      });
    }
    
    // Clear all session data
    secureStorage.removeItem('userSession');
    secureStorage.removeItem('authToken');
    secureStorage.removeItem('userProfile');
    secureStorage.removeItem('csrfToken');
  },
  
  isSessionActive: (): boolean => {
    const session = secureStorage.getItem('userSession');
    const token = secureStorage.getItem('authToken');
    
    if (!session || !token) {
      return false;
    }
    
    // Check if token is still valid
    if (!tokenUtils.isTokenValid(token)) {
      return false;
    }
    
    // Check for session timeout (24 hours by default)
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    if (now.getTime() - lastActivity.getTime() > sessionTimeout) {
      return false;
    }
    
    return true;  }
};

// Export all utilities
export {
  securityConfig,
  validateInput,
  clientRateLimit,
  cryptoUtils,
  generateCSRFToken,
  tokenUtils,
  validateSecurityHeaders,
  auditLogger,
  calculatePasswordStrength,
  sessionManager,
  generateDeviceFingerprint,
  analyzeUserAgent,
  secureStorage
};

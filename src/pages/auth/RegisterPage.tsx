import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SecurityUtils } from '../../utils/SecurityUtils';
import { RegisterData } from '../../types/auth.types';
import * as Yup from 'yup';

// Enhanced validation schema
const registerSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required')
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
  profile: Yup.object({
    firstName: Yup.string()
      .required('First name is required')
      .min(2, 'First name must be at least 2 characters')
      .matches(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
    lastName: Yup.string()
      .required('Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .matches(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
    phone: Yup.string()
      .required('Phone number is required')
      .matches(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number'),
    dateOfBirth: Yup.date()
      .required('Date of birth is required')
      .max(new Date(), 'Date of birth cannot be in the future')
      .test('age', 'You must be at least 13 years old', function(value) {
        if (!value) return false;
        const age = new Date().getFullYear() - value.getFullYear();
        return age >= 13;
      }),
    gender: Yup.string()
      .required('Gender is required')
      .oneOf(['MALE', 'FEMALE', 'OTHER'], 'Please select a valid gender'),
  }),
  role: Yup.string()
    .required('Role is required')
    .oneOf(['PATIENT', 'DOCTOR'], 'Please select a valid role'),
  acceptTerms: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions'),
});

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT',
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      gender: 'MALE',
    },
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
    strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  } | null>(null);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize security
    const initSecurity = async () => {
      try {
        const fingerprint = await SecurityUtils.getDeviceFingerprint();
        setDeviceFingerprint(fingerprint);        SecurityUtils.logSecurityEvent({
          action: 'register_page_accessed',
          success: true,
          details: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          },
        });
      } catch (error) {
        console.error('Security initialization failed:', error);
      }
    };

    initSecurity();
  }, []);
  // Password strength calculation
  useEffect(() => {
    if (formData.password) {
      const strength = SecurityUtils.calculatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  // Email availability check with debouncing
  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setEmailCheckLoading(true);
        try {
          // Simulate API call - replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          // For demo purposes, consider emails with 'taken' as unavailable
          const isAvailable = !formData.email.includes('taken');
          setIsEmailAvailable(isAvailable);
        } catch (error) {
          console.error('Email check failed:', error);
          setIsEmailAvailable(null);
        } finally {
          setEmailCheckLoading(false);
        }
      } else {
        setIsEmailAvailable(null);
      }
    };

    const debounceTimer = setTimeout(checkEmailAvailability, 1000);
    return () => clearTimeout(debounceTimer);
  }, [formData.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Sanitize input
    const sanitizedValue = type === 'checkbox' ? checked : SecurityUtils.sanitizeInput(value);
    
    if (name.includes('.')) {
      // Nested object property
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof RegisterData] as any),
          [child]: sanitizedValue,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue,
      }));
    }

    // Clear field error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = async (): Promise<boolean> => {
    try {
      await registerSchema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (validationError) {
      if (validationError instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        validationError.inner.forEach(error => {
          if (error.path) {
            newErrors[error.path] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      const isValid = await validateForm();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      // Check email availability
      if (isEmailAvailable === false) {
        setErrors({ email: 'This email is already registered' });
        setIsLoading(false);
        return;
      }      // Additional security validations
      if (!passwordStrength || ['Very Weak', 'Weak', 'Fair'].includes(passwordStrength.strength)) {
        setErrors({ password: 'Password is too weak. Please use a stronger password.' });
        setIsLoading(false);
        return;
      }// Log registration attempt
      SecurityUtils.logSecurityEvent({
        action: 'registration_attempt',
        success: true,
        details: {
          email: formData.email,
          role: formData.role,
          timestamp: new Date().toISOString(),
          deviceFingerprint,
          userAgent: navigator.userAgent,
        },
      });

      // Attempt registration
      await register(formData);      // Success
      SecurityUtils.logSecurityEvent({
        action: 'registration_success',
        success: true,
        details: {
          email: formData.email,
          role: formData.role,
          timestamp: new Date().toISOString(),
        },
      });

      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please sign in with your credentials.' 
        } 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
        SecurityUtils.logSecurityEvent({
        action: 'registration_failure',
        success: false,
        details: {
          severity: 'MEDIUM',
          email: formData.email,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };
  const getPasswordStrengthColor = (strength: {
    score: number;
    feedback: string[];
    strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  } | null): string => {
    if (!strength) return 'bg-red-500';
    
    switch (strength.strength) {
      case 'Very Weak': return 'bg-red-700';
      case 'Weak': return 'bg-red-500';
      case 'Fair': return 'bg-yellow-500';
      case 'Good': return 'bg-blue-500';
      case 'Strong': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPasswordStrengthText = (strength: {
    score: number;
    feedback: string[];
    strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  } | null): string => {
    return strength?.strength || 'Very Weak';
  };
  
  const getPasswordStrengthScore = (strength: {
    score: number;
    feedback: string[];
    strength: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  } | null): number => {
    if (!strength) return 0;
    
    switch (strength.strength) {
      case 'Very Weak': return 10;
      case 'Weak': return 30;
      case 'Fair': return 60;
      case 'Good': return 80;
      case 'Strong': return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">{errors.general}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address *
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.email ? 'border-red-300' : 
                    isEmailAvailable === false ? 'border-red-300' :
                    isEmailAvailable === true ? 'border-green-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {emailCheckLoading ? (
                    <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isEmailAvailable === true ? (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : isEmailAvailable === false ? (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : null}
                </div>
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              {isEmailAvailable === false && (
                <p className="mt-1 text-sm text-red-600">This email is already registered</p>
              )}
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Password strength:</span>                    <span className={`text-xs font-medium ${
                      !passwordStrength ? 'text-red-600' :
                      passwordStrength.strength === 'Very Weak' ? 'text-red-700' :
                      passwordStrength.strength === 'Weak' ? 'text-red-600' :
                      passwordStrength.strength === 'Fair' ? 'text-yellow-600' :
                      passwordStrength.strength === 'Good' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                      style={{ width: `${getPasswordStrengthScore(passwordStrength)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="md:col-span-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="md:col-span-2">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Account Type *
              </label>
              <select
                id="role"
                name="role"
                required
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                } bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="PATIENT">Patient - Book appointments and manage health records</option>
                <option value="DOCTOR">Doctor - Manage patients and appointments</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="profile.firstName" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                id="profile.firstName"
                name="profile.firstName"
                type="text"
                autoComplete="given-name"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors['profile.firstName'] ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your first name"
                value={formData.profile.firstName}
                onChange={handleInputChange}
              />
              {errors['profile.firstName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['profile.firstName']}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="profile.lastName" className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                id="profile.lastName"
                name="profile.lastName"
                type="text"
                autoComplete="family-name"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors['profile.lastName'] ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your last name"
                value={formData.profile.lastName}
                onChange={handleInputChange}
              />
              {errors['profile.lastName'] && (
                <p className="mt-1 text-sm text-red-600">{errors['profile.lastName']}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="profile.phone" className="block text-sm font-medium text-gray-700">
                Phone Number *
              </label>
              <input
                id="profile.phone"
                name="profile.phone"
                type="tel"
                autoComplete="tel"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors['profile.phone'] ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your phone number"
                value={formData.profile.phone}
                onChange={handleInputChange}
              />
              {errors['profile.phone'] && (
                <p className="mt-1 text-sm text-red-600">{errors['profile.phone']}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="profile.dateOfBirth" className="block text-sm font-medium text-gray-700">
                Date of Birth *
              </label>
              <input
                id="profile.dateOfBirth"
                name="profile.dateOfBirth"
                type="date"
                autoComplete="bday"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors['profile.dateOfBirth'] ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                value={formData.profile.dateOfBirth}
                onChange={handleInputChange}
              />
              {errors['profile.dateOfBirth'] && (
                <p className="mt-1 text-sm text-red-600">{errors['profile.dateOfBirth']}</p>
              )}
            </div>

            {/* Gender */}
            <div className="md:col-span-2">
              <label htmlFor="profile.gender" className="block text-sm font-medium text-gray-700">
                Gender *
              </label>
              <select
                id="profile.gender"
                name="profile.gender"
                required
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors['profile.gender'] ? 'border-red-300' : 'border-gray-300'
                } bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                value={formData.profile.gender}
                onChange={handleInputChange}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors['profile.gender'] && (
                <p className="mt-1 text-sm text-red-600">{errors['profile.gender']}</p>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptTerms" className="text-gray-700">
                I agree to the{' '}
                <Link to="/terms" className="text-blue-600 hover:text-blue-500 font-medium">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">
                  Privacy Policy
                </Link>
                *
              </label>
            </div>
          </div>
          {errors.acceptTerms && (
            <p className="mt-1 text-sm text-red-600">{errors.acceptTerms}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || isEmailAvailable === false}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;

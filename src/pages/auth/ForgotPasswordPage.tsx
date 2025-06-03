import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SecurityUtils } from '../../utils/SecurityUtils';
import * as Yup from 'yup';

const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
});

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  useEffect(() => {
    // Check rate limiting
    const rateLimitStatus = SecurityUtils.checkRateLimit('forgot-password');
    setIsBlocked(!rateLimitStatus.allowed);
    if (!rateLimitStatus.allowed) {
      setBlockTimeRemaining(Math.ceil((rateLimitStatus.timeUntilReset || 0) / 1000));
    }    SecurityUtils.logSecurityEvent({
      action: 'forgot_password_page_accessed',
      success: true,
      details: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    });
  }, []);

  // Block countdown timer
  useEffect(() => {
    if (isBlocked && blockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isBlocked, blockTimeRemaining]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = SecurityUtils.sanitizeInput(e.target.value);
    setEmail(sanitizedValue);
    
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const validateForm = async (): Promise<boolean> => {
    try {
      await forgotPasswordSchema.validate({ email }, { abortEarly: false });
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

    if (isBlocked) {      SecurityUtils.logSecurityEvent({
        action: 'blocked_forgot_password_attempt',
        success: false,
        details: {
          severity: 'MEDIUM',
          email,
          attempts,
          blockedUntil: Date.now() + (blockTimeRemaining * 1000),
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      // Validate form
      const isValid = await validateForm();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      // Check rate limiting
      const rateLimitCheck = SecurityUtils.checkRateLimit('forgot-password');
      if (!rateLimitCheck.allowed) {
        setIsBlocked(true);
        setBlockTimeRemaining(Math.ceil((rateLimitCheck.timeUntilReset || 0) / 1000));
        throw new Error('Too many password reset requests. Please try again later.');
      }      // Log attempt
      SecurityUtils.logSecurityEvent({
        action: 'password_reset_requested',
        success: true,
        details: {
          email,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });

      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Always show success message for security (don't reveal if email exists)
      setIsSubmitted(true);
      setAttempts(prev => prev + 1);      SecurityUtils.logSecurityEvent({
        action: 'password_reset_email_sent',
        success: true,
        details: {
          email,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);      SecurityUtils.logSecurityEvent({
        action: 'password_reset_failure',
        success: false,
        details: {
          severity: 'MEDIUM',
          email,
          error: errorMessage,
          attempts: newAttempts,
          timestamp: new Date().toISOString(),
        },
      });

      // Rate limiting after failed attempts
      if (newAttempts >= 3) {
        SecurityUtils.recordFailedAttempt('forgot-password');
        setIsBlocked(true);
        setBlockTimeRemaining(600); // 10 minutes
      }

      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              If an account with that email exists, we've sent you a password reset link.
            </p>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-sm text-blue-700">
                <p><strong>Security Note:</strong></p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>The reset link will expire in 15 minutes</li>
                  <li>You can only request 3 password resets per hour</li>
                  <li>Check your spam folder if you don't see the email</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Rate Limit Warning */}
        {isBlocked && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Too many requests</h3>
                <p className="mt-1 text-sm text-red-700">
                  Please wait {formatTime(blockTimeRemaining)} before trying again.
                </p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">{errors.general}</div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isBlocked}
              className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder="Enter your email address"
              value={email}
              onChange={handleInputChange}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isBlocked}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to Sign In
            </Link>
          </div>

          {attempts > 0 && (
            <div className="text-center text-sm text-gray-600">
              Reset attempts: {attempts}/3
            </div>
          )}
        </form>

        {/* Security Information */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800">Security Information</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>For security reasons, we don't indicate whether an email address is registered or not.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

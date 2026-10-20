/**
 * Form validation utilities
 * 
 * Purpose:
 * - Validate email format
 * - Validate password strength
 * - Validate other inputs
 * - Prevent invalid data from being sent to server
 * 
 * Security benefit:
 * - Frontend validation before server round-trip
 * - Better UX (instant feedback)
 * - Reduces server load from invalid requests
 */

/**
 * Email validation
 * Uses RFC 5322 simplified regex (not 100% spec, but good enough)
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password strength validation
 * 
 * Requirements (matching backend):
 * - Minimum 8 characters
 * - Cannot be all numbers
 * - Cannot be all letters
 * - Backend also checks against common passwords
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (password && password.match(/^\d+$/)) {
    errors.push('Password cannot be all numbers');
  }
  
  if (password && password.match(/^[a-zA-Z]+$/)) {
    errors.push('Password must include numbers or special characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Name validation
 */
export const isValidName = (name) => {
  return name && name.trim().length >= 2;
};

/**
 * License number validation (basic)
 */
export const isValidLicenseNumber = (license) => {
  return license && license.trim().length >= 3;
};

/**
 * Generic required field validation
 */
export const isRequired = (value) => {
  return value && value.trim().length > 0;
};
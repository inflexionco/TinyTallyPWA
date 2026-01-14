/**
 * Input validation and sanitization utilities
 * Provides security and data quality checks for user inputs
 */

// Constants for input limits
export const INPUT_LIMITS = {
  NAME_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 500,
  WEIGHT_MAX: 50, // kg - reasonable max for baby weight
  AMOUNT_MAX: 500, // ml/oz - reasonable max for bottle feeding
  DURATION_MAX: 180, // minutes - 3 hours max for single feeding
};

/**
 * Sanitize text input by removing potentially dangerous characters
 * and limiting length
 * @param {string} input - The input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export const sanitizeTextInput = (input, maxLength = INPUT_LIMITS.NOTES_MAX_LENGTH) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    // Remove HTML tags and potentially dangerous characters
    .replace(/[<>]/g, '')
    // Remove event handler attributes (onerror, onclick, etc)
    .replace(/on\w+\s*=/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
};

/**
 * Sanitize name input with stricter rules
 * @param {string} name - The name to sanitize
 * @returns {string} Sanitized name
 */
export const sanitizeName = (name) => {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .trim()
    .slice(0, INPUT_LIMITS.NAME_MAX_LENGTH)
    // Remove HTML tags and potentially dangerous characters
    .replace(/[<>]/g, '')
    // Remove event handler attributes
    .replace(/on\w+\s*=/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol
    .replace(/data:text\/html/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ');
};

/**
 * Validate and parse positive integer
 * @param {string|number} value - Value to parse
 * @param {number} max - Maximum allowed value
 * @returns {number} Validated positive integer or 0
 */
export const parsePositiveInt = (value, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseInt(value, 10);

  if (isNaN(num) || num < 0 || !Number.isFinite(num)) {
    return 0;
  }

  return Math.min(num, max);
};

/**
 * Validate and parse positive float
 * @param {string|number} value - Value to parse
 * @param {number} max - Maximum allowed value
 * @returns {number} Validated positive float or 0
 */
export const parsePositiveFloat = (value, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseFloat(value);

  if (isNaN(num) || num < 0 || !Number.isFinite(num)) {
    return 0;
  }

  return Math.min(num, max);
};

/**
 * Validate date input
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Check if date is in the future
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in future
 */
export const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Validate that end time is after start time
 * @param {string|Date} startTime - Start time
 * @param {string|Date} endTime - End time
 * @returns {boolean} True if valid (end > start)
 */
export const isValidTimeRange = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return end > start;
};

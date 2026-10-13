/**
 * CNIC Formatting and Validation Utilities
 * Format: XXXXX-XXXXXXX-X (13 digits formatted with hyphens)
 */

/**
 * Formats raw input into XXXXX-XXXXXXX-X as the user types
 * @param {string} value
 * @returns {string}
 */
export function formatCNIC(value = '') {
  if (!value) return '';
  // Extract only numbers and cap at 13 digits
  const digits = String(value).replace(/\D/g, '').slice(0, 13);
  
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

/**
 * Validates if the CNIC strictly conforms to XXXXX-XXXXXXX-X format
 * @param {string} cnic
 * @returns {boolean}
 */
export function isValidCNIC(cnic = '') {
  if (!cnic || typeof cnic !== 'string') return false;
  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  return cnicRegex.test(cnic.trim());
}

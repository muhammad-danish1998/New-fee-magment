/**
 * Pakistani Mobile Phone Number Helper
 * Valid mobile formats:
 * - 03XX-XXXXXXX (e.g. 0300-1234567)
 * - 03XXXXXXXXX (e.g. 03001234567, 11 digits starting with 03)
 */

export function isValidPakistaniPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  // Must be exactly 11 digits starting with '03'
  return /^03\d{9}$/.test(digits);
}

export function normalizePakistaniPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (/^03\d{9}$/.test(digits)) {
    // Return standard formatted: 03XX-XXXXXXX
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return String(phone).trim();
}

export function formatPakistaniPhoneInput(val) {
  if (!val) return '';
  const digits = String(val).replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

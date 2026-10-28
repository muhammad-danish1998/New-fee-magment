/**
 * Text Formatting Helper Utilities
 */

/**
 * Convert text/name to Title Case and clean up extraneous inner/outer whitespace
 * e.g. "AHMED KHAN" -> "Ahmed Khan", "muhammad   ali" -> "Muhammad Ali"
 * @param {string} str - Raw input string
 * @returns {string} - Formatted title-cased string
 */
export function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Capitalize first character, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

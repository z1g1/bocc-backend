/**
 * Escapes a string value for safe use in Airtable formula queries.
 * Prevents formula injection attacks by escaping special characters.
 * @param {string} value - The value to escape
 * @returns {string} - The escaped value safe for use in formulas
 */
const escapeAirtableFormula = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    // Escape backslashes first, then single quotes
    // Airtable formulas use backslash as escape character
    return value
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
};

/**
 * Validates that an email address has a proper format.
 * Rejects emails with potentially dangerous characters as a defense-in-depth measure.
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format, false otherwise
 */
const isValidEmail = (email) => {
    if (typeof email !== 'string') {
        return false;
    }
    // Basic email validation regex that also rejects single quotes,
    // backslashes, and other potentially dangerous characters
    const emailRegex = /^[^\s@'\\]+@[^\s@'\\]+\.[^\s@'\\]+$/;
    return emailRegex.test(email);
};

module.exports = {
    escapeAirtableFormula,
    isValidEmail
};

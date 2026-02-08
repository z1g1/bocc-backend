/**
 * Streak Tracking Utilities
 * Timezone-aware date/time calculations for BOCC attendance streaks
 *
 * All functions use Buffalo, NY timezone (America/New_York) with automatic
 * DST handling (EST = UTC-5, EDT = UTC-4).
 *
 * Epic 1: Visit Count and Streak Tracking System
 * Story 7: Timezone Handling
 */

const { utcToZonedTime, formatInTimeZone } = require('date-fns-tz');
const { parseISO, isSameWeek, startOfWeek, addWeeks } = require('date-fns');

const BUFFALO_TIMEZONE = 'America/New_York';

/**
 * Convert any date to Buffalo timezone (America/New_York)
 * Handles both EST (UTC-5) and EDT (UTC-4) automatically
 * @param {Date|string} date - UTC date or ISO 8601 string
 * @returns {Date} Date object in Buffalo timezone
 * @throws {Error} If date is invalid
 */
function toBuffaloTime(date) {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;

        if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
            throw new Error(`Invalid date: ${date}`);
        }

        return utcToZonedTime(dateObj, BUFFALO_TIMEZONE);
    } catch (error) {
        console.error('Error converting to Buffalo time:', error.message);
        throw new Error(`Invalid date format: ${date}`);
    }
}

/**
 * Get current date/time in Buffalo timezone
 * @returns {Date} Current date in Buffalo (America/New_York)
 */
function getBuffaloDate() {
    return utcToZonedTime(new Date(), BUFFALO_TIMEZONE);
}

/**
 * Format date as YYYY-MM-DD in Buffalo timezone
 * @param {Date} date - Date to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function formatDateISO(date) {
    return formatInTimeZone(date, BUFFALO_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Check if two dates are in the same Tuesday-based week
 * Week starts on Tuesday (weekStartsOn: 2) for BOCC events
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same week (both in same Tuesday-Monday period)
 */
function isSameTuesday(date1, date2) {
    const buffalo1 = toBuffaloTime(date1);
    const buffalo2 = toBuffaloTime(date2);

    // Week starts on Tuesday (0 = Sunday, 1 = Monday, 2 = Tuesday)
    return isSameWeek(buffalo1, buffalo2, { weekStartsOn: 2 });
}

/**
 * Get the next Tuesday after a given date
 * @param {Date} date - Starting date
 * @returns {Date} Next Tuesday in Buffalo timezone
 */
function getNextTuesday(date) {
    const buffaloDate = toBuffaloTime(date);

    // Get start of current week (Tuesday)
    const weekStart = startOfWeek(buffaloDate, { weekStartsOn: 2 });

    // If current date is same week as weekStart, add 1 week
    // Otherwise, weekStart IS the next Tuesday
    if (isSameWeek(buffaloDate, weekStart, { weekStartsOn: 2 })) {
        return addWeeks(weekStart, 1);
    }

    return weekStart;
}

/**
 * Format date as human-readable string in Buffalo timezone
 * @param {Date} date - Date to format
 * @param {string} formatString - date-fns format string (default: 'PPP')
 * @returns {string} Formatted date string
 */
function formatDateReadable(date, formatString = 'PPP') {
    return formatInTimeZone(date, BUFFALO_TIMEZONE, formatString);
}

/**
 * Get day of week name in Buffalo timezone
 * @param {Date} date - Date to check
 * @returns {string} Day name (e.g., 'Tuesday')
 */
function getDayOfWeek(date) {
    return formatInTimeZone(date, BUFFALO_TIMEZONE, 'EEEE');
}

module.exports = {
    toBuffaloTime,
    getBuffaloDate,
    formatDateISO,
    isSameTuesday,
    getNextTuesday,
    formatDateReadable,
    getDayOfWeek,
    BUFFALO_TIMEZONE
};

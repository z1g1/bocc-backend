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
 * Check if a specific date is a grace date
 * Inlined version to avoid Airtable initialization in tests
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Array} graceDates - Array of grace date objects with {date, eventId, reason}
 * @returns {boolean} True if date is in grace dates array
 */
function isGraceDateInline(dateStr, graceDates) {
    if (!graceDates || graceDates.length === 0 || !dateStr) {
        return false;
    }
    return graceDates.some(graceDate => graceDate.date === dateStr);
}

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

/**
 * Event cadence configuration
 * Maps eventId to frequency, day of week, and timezone
 */
const EVENT_CADENCES = {
    'bocc': {
        frequency: 'weekly',
        dayOfWeek: 2,  // Tuesday (0 = Sunday, 1 = Monday, 2 = Tuesday)
        timezone: 'America/New_York'
    }
};

/**
 * Get event cadence configuration
 * @param {string} eventId - Event identifier (e.g., 'bocc')
 * @returns {object} Cadence configuration { frequency, dayOfWeek, timezone }
 * @throws {Error} If eventId is unknown
 */
function getEventCadence(eventId) {
    const cadence = EVENT_CADENCES[eventId];
    if (!cadence) {
        throw new Error(`Unknown event: ${eventId}`);
    }
    return cadence;
}

/**
 * Calculate missed weeks between two dates
 * Returns array of Date objects for each missed week
 * Accounts for grace dates which don't count as missed weeks
 * @param {Date|string} lastCheckinDate - Last check-in date
 * @param {Date|string} currentDate - Current check-in date
 * @param {object} eventCadence - Event cadence config { dayOfWeek, frequency, timezone }
 * @param {Array} graceDates - Array of grace date objects (optional)
 * @returns {Array<Date>} Array of missed Tuesday dates
 */
function calculateMissedWeeks(lastCheckinDate, currentDate, eventCadence, graceDates = []) {
    if (!lastCheckinDate || !currentDate) {
        return [];
    }

    const lastCheckin = toBuffaloTime(lastCheckinDate);
    const current = toBuffaloTime(currentDate);

    // If same week, no weeks missed
    if (isSameWeek(lastCheckin, current, { weekStartsOn: eventCadence.dayOfWeek })) {
        return [];
    }

    // Calculate weeks between
    const lastWeekStart = startOfWeek(lastCheckin, { weekStartsOn: eventCadence.dayOfWeek });
    const currentWeekStart = startOfWeek(current, { weekStartsOn: eventCadence.dayOfWeek });

    // Collect all missed Tuesday dates
    const missedDates = [];
    let checkDate = addWeeks(lastWeekStart, 1);

    while (checkDate < currentWeekStart) {
        // Check if this date is a grace date
        const dateStr = formatDateISO(checkDate);
        const isGrace = isGraceDateInline(dateStr, graceDates);

        // Only add if not a grace date
        if (!isGrace) {
            missedDates.push(new Date(checkDate));
        }

        checkDate = addWeeks(checkDate, 1);
    }

    return missedDates;
}

/**
 * Check if streak is broken based on dates and grace dates
 * Streak breaks if ANY non-grace week is missed
 * Grace dates are the only exception - they don't break streaks
 * @param {Date|string} lastCheckinDate - Last check-in date
 * @param {Date|string} currentDate - Current check-in date
 * @param {object} eventCadence - Event cadence config
 * @param {Array} graceDates - Array of grace date objects
 * @returns {boolean} True if streak is broken
 */
function isStreakBroken(lastCheckinDate, currentDate, eventCadence, graceDates = []) {
    const missedWeeks = calculateMissedWeeks(lastCheckinDate, currentDate, eventCadence, graceDates);
    return missedWeeks.length > 0;
}

/**
 * Get expected next check-in date for an event
 * @param {Date|string} lastCheckinDate - Last check-in date
 * @param {object} eventCadence - Event cadence config
 * @returns {Date} Expected next check-in date
 */
function getExpectedNextCheckIn(lastCheckinDate, eventCadence) {
    if (!lastCheckinDate) {
        return null;
    }

    const lastCheckin = toBuffaloTime(lastCheckinDate);

    // Get the Tuesday of the week after last check-in
    const lastWeekStart = startOfWeek(lastCheckin, { weekStartsOn: eventCadence.dayOfWeek });
    const nextWeekStart = addWeeks(lastWeekStart, 1);

    return nextWeekStart;
}

/**
 * Calculate streak status for a member
 * @param {Date|string|null} lastCheckinDate - Last check-in date (null for first check-in)
 * @param {Date|string} currentDate - Current check-in date
 * @param {number} currentStreak - Current streak count
 * @param {number} longestStreak - Longest streak count (personal best)
 * @param {object} eventCadence - Event cadence config { dayOfWeek, frequency, timezone }
 * @param {Array} graceDates - Array of grace date objects
 * @returns {object} Streak status { currentStreak, longestStreak, isPersonalBest, streakBroken }
 */
function calculateStreak(lastCheckinDate, currentDate, currentStreak = 0, longestStreak = 0, eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' }, graceDates = []) {
    // First check-in ever
    if (!lastCheckinDate) {
        return {
            currentStreak: 1,
            longestStreak: Math.max(1, longestStreak || 0),
            isPersonalBest: (longestStreak || 0) < 1,
            streakBroken: false
        };
    }

    // Check if checking in same week (duplicate check-in)
    const lastCheckin = toBuffaloTime(lastCheckinDate);
    const current = toBuffaloTime(currentDate);

    if (isSameWeek(lastCheckin, current, { weekStartsOn: eventCadence.dayOfWeek })) {
        // Same week check-in, no streak change
        return {
            currentStreak,
            longestStreak: longestStreak || 0,
            isPersonalBest: false,
            streakBroken: false
        };
    }

    // Calculate missed weeks
    const missedWeeks = calculateMissedWeeks(lastCheckinDate, currentDate, eventCadence, graceDates);

    // Check if streak is broken (any miss breaks streak, unless grace date)
    const streakBroken = missedWeeks.length > 0;

    let newCurrentStreak;
    if (streakBroken) {
        // Streak broken, restart at 1
        newCurrentStreak = 1;
    } else {
        // Consecutive or 1 week missed, increment streak
        newCurrentStreak = currentStreak + 1;
    }

    // Check for new personal best
    const newLongestStreak = Math.max(newCurrentStreak, longestStreak || 0);
    const isPersonalBest = newCurrentStreak > (longestStreak || 0);

    return {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        isPersonalBest,
        streakBroken
    };
}

module.exports = {
    toBuffaloTime,
    getBuffaloDate,
    formatDateISO,
    isSameTuesday,
    getNextTuesday,
    formatDateReadable,
    getDayOfWeek,
    getEventCadence,
    calculateMissedWeeks,
    isStreakBroken,
    getExpectedNextCheckIn,
    calculateStreak,
    BUFFALO_TIMEZONE
};

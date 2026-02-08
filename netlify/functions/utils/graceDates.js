/**
 * Grace Date Management
 * Handles declared holidays/exceptions where BOCC doesn't meet
 * Members who miss grace dates won't have their streaks broken
 *
 * Epic 1: Visit Count and Streak Tracking System
 * Story 3: Grace Date Management
 */

const { base } = require('./airtable');
const { escapeAirtableFormula } = require('./validation');
const { formatDateISO } = require('./streaks');

// Module-level cache (per-request)
let graceDateCache = null;

/**
 * Query grace dates from Airtable for a specific event
 * Results are cached per-request to avoid duplicate queries
 * @param {string} eventId - Event identifier (e.g., 'bocc')
 * @returns {Promise<Array>} Array of grace date objects
 * @throws {Error} If eventId is invalid
 */
async function getGraceDates(eventId) {
    // Validate eventId
    if (!eventId || typeof eventId !== 'string') {
        throw new Error('Invalid eventId parameter');
    }

    // Sanitize eventId for Airtable formula
    const sanitizedEventId = escapeAirtableFormula(eventId);

    // Check cache first
    if (graceDateCache && graceDateCache[eventId]) {
        console.log('Returning cached grace dates for:', eventId);
        return graceDateCache[eventId];
    }

    try {
        console.log('Querying grace dates from Airtable for:', eventId);

        // Query Airtable (limit to ±1 year from today for performance)
        const formula = `AND(
            {eventId} = '${sanitizedEventId}',
            {date} >= DATEADD(TODAY(), -365, 'days'),
            {date} <= DATEADD(TODAY(), 365, 'days')
        )`;

        const records = await base('grace_dates').select({
            filterByFormula: formula,
            sort: [{ field: 'date', direction: 'asc' }]
        }).all();

        // Map records to grace date objects
        const graceDates = records.map(record => ({
            id: record.id,
            date: record.get('date'),
            eventId: record.get('eventId'),
            reason: record.get('reason')
        }));

        console.log(`Found ${graceDates.length} grace dates for ${eventId}`);

        // Cache results
        if (!graceDateCache) graceDateCache = {};
        graceDateCache[eventId] = graceDates;

        return graceDates;
    } catch (error) {
        console.error('Error querying grace dates:', error.message);
        if (error.message.includes('Could not find table')) {
            console.error('grace_dates table does not exist in Airtable');
        }
        // Return empty array on error (graceful degradation)
        return [];
    }
}

/**
 * Clear grace date cache
 * Should be called at start of each check-in request
 */
function clearGraceDateCache() {
    graceDateCache = null;
    console.log('Grace date cache cleared');
}

/**
 * Check if a specific date is a grace date
 * @param {Date|string} date - Date to check (Date object or YYYY-MM-DD string)
 * @param {Array} graceDates - Array of grace date objects
 * @returns {boolean} True if date is in grace dates
 */
function isGraceDate(date, graceDates) {
    if (!graceDates || graceDates.length === 0) {
        return false;
    }

    if (!date) {
        return false;
    }

    // Normalize date to YYYY-MM-DD string
    let dateStr;
    if (date instanceof Date) {
        dateStr = formatDateISO(date);  // Use timezone utility from STORY-007
    } else if (typeof date === 'string') {
        dateStr = date;
    } else {
        return false;
    }

    // Check if date exists in grace dates array
    return graceDates.some(graceDate => graceDate.date === dateStr);
}

module.exports = {
    getGraceDates,
    clearGraceDateCache,
    isGraceDate
};

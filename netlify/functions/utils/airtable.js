const Airtable = require('airtable');
const { escapeAirtableFormula, isValidEmail } = require('./validation');

console.log('Airtable API Key:', process.env.AIRTABLE_API_KEY ? 'Exists' : 'Not set');
console.log('Airtable Base ID:', process.env.AIRTABLE_BASE_ID ? 'Exists' : 'Not set');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

const fetchAttendeeByEmail = async (email) => {
    const sanitizedEmail = escapeAirtableFormula(email);
    const records = await base('attendees').select({
        filterByFormula: `{email} = '${sanitizedEmail}'`,
        maxRecords: 1
    }).firstPage();

    return records.length > 0 ? records[0] : null;
};

const createAttendee = async (email, name, phone, businessName, okToEmail, debug) => {
    const record = await base('attendees').create({
        email,
        name,
        phone,
        businessName,
        okToEmail,
        debug
    });

    return record;
};

const createCheckinEntry = async (attendeeId, eventId, debug, token) => {
    const record = await base('checkins').create({
        Attendee: [attendeeId],
        checkinDate: new Date().toISOString(),
        eventId: eventId,
        debug,
        token
    });

    return record;
};

const findExistingCheckin = async (attendeeId, eventId, token) => {
    const sanitizedEventId = escapeAirtableFormula(eventId);
    const sanitizedToken = escapeAirtableFormula(token);

    // Get today's date in YYYY-MM-DD format for comparison
    const today = new Date().toISOString().split('T')[0];

    // Query for check-ins matching eventId, token, and date
    // Then filter by attendeeId in code since Airtable formulas with linked records are tricky
    const formula = `AND(
        {eventId} = '${sanitizedEventId}',
        {token} = '${sanitizedToken}',
        DATESTR({checkinDate}) = '${today}'
    )`;

    console.log('Finding existing check-in with formula:', formula);
    console.log('Looking for attendeeId:', attendeeId);

    const records = await base('checkins').select({
        filterByFormula: formula,
        sort: [{field: 'checkinDate', direction: 'desc'}]
    }).firstPage();

    console.log('Found', records.length, 'records matching event/token/date');

    // Filter by attendeeId in code
    const matchingRecord = records.find(record => {
        const attendeeField = record.get('Attendee');
        console.log('Checking record', record.id, 'attendee field:', attendeeField);
        // Attendee field is an array of record IDs
        return attendeeField && attendeeField.includes(attendeeId);
    });

    if (matchingRecord) {
        console.log('Existing check-in found:', matchingRecord.id);
    } else {
        console.log('No matching check-in found for this attendee');
    }

    return matchingRecord || null;
};

/**
 * Find existing streak record by attendeeId and eventId
 * Epic 1: Visit Count and Streak Tracking System (STORY-005)
 *
 * @param {string} attendeeId - Airtable attendee record ID
 * @param {string} eventId - Event identifier (e.g., 'bocc')
 * @returns {Promise<object|null>} Streak record if found, null otherwise
 */
const findStreakRecord = async (attendeeId, eventId) => {
    const sanitizedEventId = escapeAirtableFormula(eventId);

    // Query for streak record matching attendeeId AND eventId
    // Note: attendeeId is a linked record field
    const formula = `AND(
        {attendeeId} = '${attendeeId}',
        {eventId} = '${sanitizedEventId}'
    )`;

    console.log('Finding streak record:', attendeeId, eventId);

    const records = await base('streaks').select({
        filterByFormula: formula,
        maxRecords: 1
    }).firstPage();

    if (records.length > 0) {
        console.log('Found existing streak record:', records[0].id);
        return records[0];
    }

    console.log('No streak record found');
    return null;
};

/**
 * Create new streak record
 * Epic 1: Visit Count and Streak Tracking System (STORY-005)
 *
 * @param {string} attendeeId - Airtable attendee record ID
 * @param {string} eventId - Event identifier
 * @param {object} streakData - Streak data from calculation
 * @param {number} streakData.currentStreak - Current consecutive weeks
 * @param {number} streakData.longestStreak - Personal best
 * @param {string} streakData.lastCheckinDate - Last check-in date (YYYY-MM-DD)
 * @returns {Promise<object>} Created Airtable record
 */
const createStreakRecord = async (attendeeId, eventId, streakData) => {
    console.log('Creating new streak record:', attendeeId, eventId);

    const record = await base('streaks').create({
        attendeeId: [attendeeId],  // Array for linked record field
        eventId: eventId,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        lastCheckinDate: streakData.lastCheckinDate,
        lastStreakUpdate: new Date().toISOString()
    });

    console.log('Created streak record:', record.id);
    return record;
};

/**
 * Update existing streak record
 * Epic 1: Visit Count and Streak Tracking System (STORY-005)
 *
 * @param {string} recordId - Airtable streak record ID
 * @param {object} streakData - Updated streak data
 * @returns {Promise<object>} Updated Airtable record
 */
const updateStreakRecord = async (recordId, streakData) => {
    console.log('Updating streak record:', recordId);

    const record = await base('streaks').update(recordId, {
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        lastCheckinDate: streakData.lastCheckinDate,
        lastStreakUpdate: new Date().toISOString()
    });

    console.log('Updated streak record:', recordId);
    return record;
};

/**
 * Upsert streak record (update if exists, create if not)
 * Epic 1: Visit Count and Streak Tracking System (STORY-005)
 *
 * Main function for storing streak data in Airtable.
 * Implements upsert pattern since Airtable doesn't have native upsert.
 *
 * @param {string} attendeeId - Airtable attendee record ID
 * @param {string} eventId - Event identifier
 * @param {object} streakData - Streak data from calculation
 * @returns {Promise<object|null>} Airtable record or null on error
 */
const upsertStreakRecord = async (attendeeId, eventId, streakData) => {
    try {
        console.log('Upserting streak record:', attendeeId, eventId);
        console.log('Streak data:', streakData);

        // Try to find existing record
        const existingRecord = await findStreakRecord(attendeeId, eventId);

        if (existingRecord) {
            // Update existing
            console.log('Updating existing streak record:', existingRecord.id);
            return await updateStreakRecord(existingRecord.id, streakData);
        } else {
            // Create new
            console.log('Creating new streak record');
            return await createStreakRecord(attendeeId, eventId, streakData);
        }
    } catch (error) {
        console.error('Failed to upsert streak record:', error.message);
        if (error.message && error.message.includes('Could not find table')) {
            console.error('streaks table does not exist in Airtable');
        }
        // Don't throw - allow check-in to continue even if Airtable fails
        return null;
    }
};

module.exports = {
    fetchAttendeeByEmail,
    createAttendee,
    createCheckinEntry,
    findExistingCheckin,
    findStreakRecord,
    createStreakRecord,
    updateStreakRecord,
    upsertStreakRecord,
    escapeAirtableFormula,
    isValidEmail,
    base  // Export for testing
};
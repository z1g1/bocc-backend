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

const findExistingCheckin = async (email, eventId, token) => {
    const sanitizedEmail = escapeAirtableFormula(email);
    const sanitizedEventId = escapeAirtableFormula(eventId);
    const sanitizedToken = escapeAirtableFormula(token);

    // Get today's date in YYYY-MM-DD format for comparison
    const today = new Date().toISOString().split('T')[0];

    // Airtable formula to match email, eventId, token, and same calendar day
    const formula = `AND(
        LOWER({email}) = '${sanitizedEmail.toLowerCase()}',
        {eventId} = '${sanitizedEventId}',
        {token} = '${sanitizedToken}',
        DATESTR({checkinDate}) = '${today}'
    )`;

    const records = await base('checkins').select({
        filterByFormula: formula,
        maxRecords: 1,
        sort: [{field: 'checkinDate', direction: 'desc'}]
    }).firstPage();

    return records.length > 0 ? records[0] : null;
};

module.exports = {
    fetchAttendeeByEmail,
    createAttendee,
    createCheckinEntry,
    findExistingCheckin,
    escapeAirtableFormula,
    isValidEmail
};
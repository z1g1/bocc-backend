const Airtable = require('airtable');

console.log('Airtable API Key:', process.env.AIRTABLE_API_KEY ? 'Exists' : 'Not set');
console.log('Airtable Base ID:', process.env.AIRTABLE_BASE_ID ? 'Exists' : 'Not set');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

const fetchAttendeeByEmail = async (email) => {
    const records = await base('attendees').select({
        filterByFormula: `{email} = '${email}'`,
        maxRecords: 1
    }).firstPage();

    return records.length > 0 ? records[0] : null;
};

const createAttendee = async (email, name) => {
    const record = await base('attendees').create({
        email,
        name
    });

    return record;
};

const createCheckinEntry = async (attendeeId) => {
    const record = await base('checkins').create({
        attendee: [attendeeId],
        checkinTime: new Date().toISOString()
    });

    return record;
};

module.exports = {
    fetchAttendeeByEmail,
    createAttendee,
    createCheckinEntry
};
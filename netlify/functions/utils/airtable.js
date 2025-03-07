const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

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
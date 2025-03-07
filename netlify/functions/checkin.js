const Airtable = require('airtable');
const { fetchAttendeeByEmail, createAttendee, createCheckin } = require('./utils/airtable');

exports.handler = async (event) => {
    const { email } = JSON.parse(event.body);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight response' }),
        };
    }

    if (!email) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Email is required' }),
        };
    }

    try {
        // Check if the attendee exists
        const attendee = await fetchAttendeeByEmail(email);

        if (attendee) {
            // Create a new check-in entry for the existing attendee
            await createCheckin(attendee.id);
        } else {
            // Create a new attendee and then create a check-in entry
            const newAttendee = await createAttendee(email);
            await createCheckin(newAttendee.id);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Check-in successful' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

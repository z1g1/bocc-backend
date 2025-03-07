const Airtable = require('airtable');
const { fetchAttendeeByEmail, createAttendee, createCheckinEntry } = require('./utils/airtable');

exports.handler = async (event) => {
    console.log('Received event:', event);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling CORS preflight request');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight response' }),
        };
    }

    const { email } = JSON.parse(event.body);
    console.log('Parsed email:', email);

    if (!email) {
        console.log('Email is missing in the request');
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Email is required' }),
        };
    }

    try {
        // Check if the attendee exists
        const attendee = await fetchAttendeeByEmail(email);
        console.log('Fetched attendee:', attendee);

        if (attendee) {
            // Create a new check-in entry for the existing attendee
            await createCheckinEntry(attendee.id);
            console.log('Created check-in for existing attendee:', attendee.id);
        } else {
            // Create a new attendee and then create a check-in entry
            const newAttendee = await createAttendee(email);
            await createCheckinEntry(newAttendee.id);
            console.log('Created new attendee and check-in:', newAttendee.id);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Check-in successful' }),
        };
    } catch (error) {
        console.error('Error during check-in process:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};

const Airtable = require('airtable');
const { fetchAttendeeByEmail, createAttendee, createCheckinEntry } = require('./utils/airtable');
const { isValidEmail } = require('./utils/validation');

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

    const { email, name, phone, businessName, okToEmail, eventId, debug, token } = JSON.parse(event.body);
    console.log('Parsed email:', email);
    console.log('Parsed eventId:', eventId);
    console.log('Parsed debug:', debug);
    console.log('Parsed token:', token);

    const debugFlag = debug === '1' ? true : debug === '0' ? false : false;
    const tokenValue = token || '';

    if (!email) {
        console.log('Email is missing in the request');
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Email is required' }),
        };
    }

    if (!isValidEmail(email)) {
        console.log('Invalid email format:', email);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid email format' }),
        };
    }

    try {
        // Check if the attendee exists
        console.log('Fetching attendee by email:', email);
        const attendee = await fetchAttendeeByEmail(email);
        console.log('Fetched attendee:', attendee);

        if (attendee) {
            // Create a new check-in entry for the existing attendee
            console.log('Creating check-in for existing attendee:', attendee.id);
            await createCheckinEntry(attendee.id, eventId, debugFlag, tokenValue);
            console.log('Created check-in for existing attendee:', attendee.id);
        } else {
            // Create a new attendee and then create a check-in entry
            const newAttendee = await createAttendee(email, name, phone, businessName, okToEmail, debugFlag);
            await createCheckinEntry(newAttendee.id, eventId, debugFlag, tokenValue);
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

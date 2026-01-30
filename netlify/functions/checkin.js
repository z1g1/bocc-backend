const { fetchAttendeeByEmail, createAttendee, createCheckinEntry } = require('./utils/airtable');
const { validateCheckinInput } = require('./utils/validation');

// CORS configuration - use environment variable for production security
// Set ALLOWED_ORIGIN in Netlify environment variables to your frontend domain
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

exports.handler = async (event) => {
    console.log('Received event:', event);

    const headers = {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
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

    // Parse request body with error handling
    let requestBody;
    try {
        requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
        console.error('Failed to parse request body:', parseError.message);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    // Validate and sanitize all inputs
    const { isValid, errors, sanitized } = validateCheckinInput(requestBody);

    console.log('Parsed email:', sanitized.email);
    console.log('Parsed eventId:', sanitized.eventId);
    console.log('Parsed debug:', sanitized.debug);
    console.log('Parsed token:', sanitized.token);

    if (!isValid) {
        console.log('Validation failed:', errors);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: errors[0], errors }),
        };
    }

    try {
        // Check if the attendee exists
        console.log('Fetching attendee by email:', sanitized.email);
        const attendee = await fetchAttendeeByEmail(sanitized.email);
        console.log('Fetched attendee:', attendee);

        if (attendee) {
            // Create a new check-in entry for the existing attendee
            console.log('Creating check-in for existing attendee:', attendee.id);
            await createCheckinEntry(attendee.id, sanitized.eventId, sanitized.debug, sanitized.token);
            console.log('Created check-in for existing attendee:', attendee.id);
        } else {
            // Create a new attendee and then create a check-in entry
            const newAttendee = await createAttendee(
                sanitized.email,
                sanitized.name,
                sanitized.phone,
                sanitized.businessName,
                sanitized.okToEmail,
                sanitized.debug
            );
            await createCheckinEntry(newAttendee.id, sanitized.eventId, sanitized.debug, sanitized.token);
            console.log('Created new attendee and check-in:', newAttendee.id);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Check-in successful' }),
        };
    } catch (error) {
        // Log full error details server-side for debugging
        console.error('Error during check-in process:', error);
        console.error('Error stack:', error.stack);

        // Return generic error message to client (Issue #7: sanitize error responses)
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'An error occurred while processing your request' }),
        };
    }
};

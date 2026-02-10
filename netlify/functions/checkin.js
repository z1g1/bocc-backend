const { fetchAttendeeByEmail, createAttendee, createCheckinEntry, findExistingCheckin, upsertStreakRecord } = require('./utils/airtable');
const { validateCheckinInput } = require('./utils/validation');
const { ensureMember, incrementCheckinCount, updateStreakFields } = require('./utils/circle');
const { calculateStreak, getEventCadence } = require('./utils/streaks');
const { getGraceDates } = require('./utils/graceDates');

// CORS configuration - use environment variable for production security
// Set ALLOWED_ORIGIN in Netlify environment variables to your frontend domain
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

/**
 * Format streak message for check-in response
 * Epic 1: Visit Count and Streak Tracking System (STORY-006)
 *
 * Generates personalized, encouraging messages based on streak status.
 * Message priority (in order):
 * 1. First check-in: "Welcome! Your streak begins today"
 * 2. Personal best: "New record! N-week streak!"
 * 3. Broken streak: "Welcome back! New streak started"
 * 4. Continued streak: "N-week streak!"
 *
 * @param {object} streakData - Results from streak calculation
 * @param {number} streakData.currentStreak - Current consecutive weeks
 * @param {number} streakData.longestStreak - Personal best
 * @param {boolean} streakData.isPersonalBest - Whether this is a new personal best
 * @param {boolean} streakData.streakBroken - Whether streak was broken this check-in
 * @param {boolean} isFirstCheckIn - Whether this is member's first check-in ever
 * @returns {string} Formatted encouraging message
 *
 * @example
 * formatStreakMessage({ currentStreak: 5, longestStreak: 8, isPersonalBest: false, streakBroken: false }, false)
 * // Returns: "5-week streak!"
 *
 * formatStreakMessage({ currentStreak: 10, longestStreak: 10, isPersonalBest: true, streakBroken: false }, false)
 * // Returns: "New record! 10-week streak!"
 */
function formatStreakMessage(streakData, isFirstCheckIn) {
    // Priority 1: First check-in ever
    if (isFirstCheckIn) {
        return "Welcome! Your streak begins today";
    }

    // Priority 2: Personal best achieved
    if (streakData.isPersonalBest) {
        const weeks = streakData.currentStreak;
        return `New record! ${weeks}-week streak!`;
    }

    // Priority 3: Streak broken (positive framing)
    if (streakData.streakBroken) {
        return "Welcome back! New streak started";
    }

    // Priority 4: Continued streak (normal case)
    const weeks = streakData.currentStreak;
    return `${weeks}-week streak!`;
}

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
        // Check if the attendee exists (fetch or create)
        console.log('Fetching attendee by email:', sanitized.email);
        let attendee = await fetchAttendeeByEmail(sanitized.email);

        if (!attendee) {
            // Create a new attendee
            console.log('Creating new attendee:', sanitized.email);
            attendee = await createAttendee(
                sanitized.email,
                sanitized.name,
                sanitized.phone,
                sanitized.businessName,
                sanitized.okToEmail,
                sanitized.debug
            );
            console.log('Created new attendee:', attendee.id);
        } else {
            console.log('Found existing attendee:', attendee.id);
        }

        // Check for duplicate check-in on the same day
        console.log('Checking for existing check-in today:', attendee.id, sanitized.eventId, sanitized.token);
        const existingCheckin = await findExistingCheckin(attendee.id, sanitized.eventId, sanitized.token);

        if (existingCheckin) {
            console.log('Duplicate check-in prevented:', sanitized.email, sanitized.eventId);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Already checked in for this event today',
                    alreadyCheckedIn: true,
                    checkinDate: existingCheckin.get('checkinDate')
                }),
            };
        }

        // Create the check-in entry
        console.log('Creating check-in for attendee:', attendee.id);
        await createCheckinEntry(attendee.id, sanitized.eventId, sanitized.debug, sanitized.token);
        console.log('Created check-in successfully');

        // Streak tracking and Circle.so integration
        // Epic 1: Visit Count and Streak Tracking System
        // Only for non-debug check-ins
        let streakData = null;
        let streakMessage = null;

        if (!sanitized.debug || sanitized.debug === '0') {
            console.log('Processing streak tracking for:', sanitized.email);

            try {
                // Step 1: Ensure member exists in Circle.so
                const member = await ensureMember(sanitized.email, sanitized.name);
                console.log('Successfully ensured Circle member:', member.id || member.email);

                // Step 2: Increment check-in counter
                try {
                    await incrementCheckinCount(member.id);
                    console.log('Successfully incremented check-in count for Circle member:', member.id);
                } catch (counterError) {
                    console.error('Failed to increment check-in count (non-blocking):', counterError.message);
                }

                // Step 3: Calculate streak
                console.log('Calculating streak for member:', member.id);
                try {
                    // Get event cadence configuration
                    const eventCadence = getEventCadence(sanitized.eventId);

                    // Get grace dates for this event
                    const graceDates = await getGraceDates(sanitized.eventId);
                    console.log(`Found ${graceDates.length} grace dates for event ${sanitized.eventId}`);

                    // Get current streak data from Circle.so custom fields
                    const { getMemberCustomField } = require('./utils/circle');
                    const lastCheckinDate = await getMemberCustomField(member.id, 'lastCheckinDate');
                    const currentStreak = await getMemberCustomField(member.id, 'currentStreak') || 0;
                    const longestStreak = await getMemberCustomField(member.id, 'longestStreak') || 0;

                    console.log('Previous streak data:', { lastCheckinDate, currentStreak, longestStreak });

                    // Determine if this is first check-in (no previous check-in date)
                    const isFirstCheckIn = !lastCheckinDate;

                    // Calculate new streak
                    streakData = calculateStreak(
                        lastCheckinDate,       // Last check-in date (ISO string or null)
                        new Date().toISOString(),  // Current check-in date
                        currentStreak,         // Previous current streak
                        longestStreak,         // Previous longest streak
                        eventCadence,          // Event schedule config
                        graceDates             // Array of grace dates
                    );

                    console.log('Calculated new streak:', streakData);

                    // Step 4: Update Circle.so custom fields with new streak data
                    await updateStreakFields(member.id, streakData);
                    console.log('Successfully updated Circle.so streak fields');

                    // Step 5: Upsert Airtable streak record
                    await upsertStreakRecord(attendee.id, sanitized.eventId, streakData);
                    console.log('Successfully upserted Airtable streak record');

                    // Step 6: Format streak message for response
                    streakMessage = formatStreakMessage(streakData, isFirstCheckIn);
                    console.log('Generated streak message:', streakMessage);

                } catch (streakError) {
                    // Log streak calculation error but don't fail the check-in
                    console.error('Failed to calculate/store streak (non-blocking):', streakError.message);
                    console.error('Streak error stack:', streakError.stack);
                }

            } catch (error) {
                // Log error but don't fail the check-in
                console.error('Failed Circle.so/streak integration (non-blocking):', error.message);
                if (error.response) {
                    console.error('Circle API response status:', error.response.status);
                    console.error('Circle API response data:', JSON.stringify(error.response.data));
                }
            }
        } else {
            console.log('Skipping Circle and streak tracking for debug check-in');
        }

        // Return enhanced response with streak data
        const response = {
            message: 'Check-in successful'
        };

        // Add streak message and data if available
        if (streakMessage && streakData) {
            response.streakMessage = streakMessage;
            response.streakData = {
                currentStreak: streakData.currentStreak,
                longestStreak: streakData.longestStreak,
                isPersonalBest: streakData.isPersonalBest,
                streakBroken: streakData.streakBroken
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response),
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

// Export for testing
exports.formatStreakMessage = formatStreakMessage;

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Netlify Functions backend API for Buffalo Open Coffee Club (BOCC) that handles event attendee check-ins via Airtable integration. The API serves check-in forms on the frontend website that collect attendee information and log check-ins to events.

**Related Repositories:**
- Frontend: https://github.com/z1g1/bocc-website
- Backend: https://github.com/z1g1/bocc-backend (this repo)

**Production URL:** https://bocc-backend.netlify.app

### Core Workflow
1. Check-in form sends attendee data (email, name, phone, businessName, okToEmail) + eventID + debug flag + token
2. API checks for duplicate check-in (same attendee, event, token, and date)
3. If duplicate found: return friendly message "Already checked in for this event today"
4. API checks if attendee email exists in Airtable `attendees` table
5. If exists: fetch attendee record; If not exists: create new attendee record
6. Create check-in record in `checkins` table with attendee link, eventId, token, and timestamp
7. For non-debug check-ins:
   a. Invite attendee to Circle.so community (create/find member)
   b. Increment `checkinCount` custom field in Circle member profile
8. All records include `debug` flag for filtering test submissions
9. All check-ins include `token` field (static GUID per event, embedded in URL for basic anti-spoofing)

## Architecture

**Deployment Platform:** Netlify Functions (serverless)
- Functions are located in `netlify/functions/`
- Single endpoint: `checkin.js` (POST handler)
- Deployed automatically via Netlify CI/CD

**Data Storage:** Airtable
- Two tables: `attendees` and `checkins`
- `attendees` table: Stores unique attendees by email
  - Fields: email, attendeeID, name, phone, businessName, okToEmail, debug
  - Rollup field: Checkins (count of check-ins for this attendee)
- `checkins` table: Stores individual check-in events
  - Fields: id, checkinDate, eventId, Attendee (linked), email, name, phone, businessName, token, debug
  - `eventId` examples: "bocc" (regular meetings), "codeCoffee", or other event identifiers

**Community Platform:** Circle.so
- Third-party community platform for member engagement
- Attendees are automatically invited after successful check-in
- Check-in counter tracked in Circle member custom field (`checkinCount`)
- Circle workflows can trigger automated rewards based on check-in count
- Invitations are non-blocking (don't fail check-in if Circle API fails)
- Only non-debug check-ins trigger Circle invitations and counter updates
- API v2 integration via `netlify/functions/utils/circle.js`

**Module System:** CommonJS (require/module.exports)
- Project uses CommonJS syntax, not ES modules
- All files use `.js` extension with `require()` and `module.exports`

**Security Architecture:**
- Input validation layer in `netlify/functions/utils/validation.js`
- All inputs are validated and sanitized before processing
- Formula injection protection for Airtable queries
- XSS prevention through text sanitization
- Email format validation with dangerous character rejection
- Phone number format validation (optional field)
- Token format validation (alphanumeric + hyphens only)

## Environment Variables

Required environment variables (set in Netlify dashboard):
- `AIRTABLE_API_KEY` - Airtable API key for authentication
- `AIRTABLE_BASE_ID` - Base ID for the BOCC Airtable database
- `CIRCLE_API_TOKEN` - Circle.so Admin API v2 token for member invitations

Optional environment variables:
- `ALLOWED_ORIGIN` - CORS allowed origin (defaults to `*` for development, set to frontend domain in production)

**Security Note:** This project uses API keys for Airtable and Circle.so. Follow principle of least privilege:
- Airtable key: minimum required permissions for read/write on `attendees` and `checkins` tables only
- Circle.so key: minimum required permissions for creating/reading community members only
- See `CIRCLE_PERMISSIONS.md` for detailed Circle.so permissions documentation

## Project Structure

```
bocc-backend/
├── netlify/
│   └── functions/
│       ├── checkin.js           # Main API endpoint handler
│       └── utils/
│           ├── airtable.js      # Airtable client and database operations
│           ├── circle.js        # Circle.so API client (Admin API v2)
│           └── validation.js    # Input validation and sanitization utilities
├── tests/
│   ├── checkin.test.js          # Unit tests for checkin handler
│   ├── circle.test.js           # Unit tests for Circle.so API integration
│   ├── deduplication.test.js    # Unit tests for duplicate check-in detection
│   ├── validation.test.js       # Unit tests for validation utilities
│   ├── smoke-test.sh            # End-to-end API smoke test script (includes dedup test)
│   ├── manual-dedup-test.sh     # Manual testing script for deduplication scenarios
│   └── start-local-test.sh      # Automated local testing script
├── netlify.toml                 # Netlify configuration (CORS headers)
├── package.json                 # Dependencies (airtable SDK, axios, jest)
├── CIRCLE_PERMISSIONS.md        # Circle.so API permissions documentation
└── README.md                    # Project documentation
```

## Development

**Current Workflow:**
- Push directly to `main` branch
- Netlify auto-deploys on every push to main
- **TODO:** Implement dev/staging/main workflow for safer deployments

**Local Development:**
```bash
# Install Netlify CLI globally if not already installed
npm install -g netlify-cli

# Install dependencies
npm install

# Run functions locally with environment variables
netlify dev
```

**Testing:**
```bash
# Run Jest unit tests (143 tests covering validation, checkin, deduplication, and Circle.so)
npm test

# Run automated local smoke test (starts server, tests API with dedup, cleans up)
npm run test:smoke-local

# Run production smoke test (tests deployed API with debug flag)
npm run test:smoke-prod

# Manual smoke test (requires Netlify dev running in another terminal)
API_URL=http://localhost:8888/.netlify/functions/checkin bash tests/smoke-test.sh

# Manual deduplication testing (5 test scenarios)
API_URL=http://localhost:8888/.netlify/functions/checkin bash tests/manual-dedup-test.sh
```

**Testing the API:**
```bash
# Test check-in endpoint locally (requires Netlify CLI running)
curl -X POST http://localhost:8888/.netlify/functions/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "phone": "555-1234",
    "businessName": "Test Business",
    "okToEmail": true,
    "eventId": "bocc",
    "debug": "1",
    "token": "c96517e8-5936-4c63-a729-4b616569e5ab"
  }'
```

**Production endpoint:**
```bash
curl -X POST https://bocc-backend.netlify.app/.netlify/functions/checkin \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Debug Flag:**
- Pass `debug: "1"` (string) in request body to mark as test submission
- Pass `debug: "0"` or omit to mark as production submission
- Allows filtering test data in Airtable views

**Event IDs:**
- `"bocc"` - Regular Buffalo Open Coffee Club meetings
- `"codeCoffee"` - Code Coffee events
- Use descriptive event IDs to separate different event types in reporting

**Token System:**
- Each event uses a static GUID embedded in the check-in URL
- Token is manually generated and added to QR codes/links for each event
- Provides basic anti-spoofing protection (ensures check-ins come from valid QR codes)
- Same token used for all attendees at the same event

## Code Patterns

**Airtable Operations:**
All database operations are in `netlify/functions/utils/airtable.js`:
- `fetchAttendeeByEmail(email)` - Query attendee by email (uses formula injection protection)
- `createAttendee(email, name, phone, businessName, okToEmail, debug)` - Create new attendee
- `createCheckinEntry(attendeeId, eventId, debug, token)` - Create check-in record
- `findExistingCheckin(attendeeId, eventId, token)` - Check for duplicate check-in on same day (returns existing check-in or null)

**Circle.so API Operations:**
All Circle.so API operations are in `netlify/functions/utils/circle.js`:
- `findMemberByEmail(email)` - Search for Circle member by email (case-insensitive)
- `createMember(email, name)` - Create/invite new Circle community member
- `ensureMember(email, name)` - Find existing or create new member (idempotent operation)
- `updateMemberCustomField(memberId, fieldName, value)` - Update any custom field on member profile
- `incrementCheckinCount(memberId, currentCount)` - Increment check-in counter (for engagement rewards)
- Uses Admin API v2 at `https://app.circle.so/api/admin/v2`
- Authentication: Bearer token via `CIRCLE_API_TOKEN` environment variable
- All operations include comprehensive error handling and logging

**Input Validation:**
All validation functions are in `netlify/functions/utils/validation.js`:
- `validateCheckinInput(input)` - Main validation function, returns `{ isValid, errors, sanitized }`
- `escapeAirtableFormula(value)` - Escapes dangerous characters for Airtable formula queries
- `isValidEmail(email)` - RFC 5322 compliant email validation with security checks
- `isValidPhone(phone)` - Phone number format validation (optional field)
- `isValidEventId(eventId)` - Ensures eventId is non-empty string
- `isValidToken(token)` - Validates token format (alphanumeric + hyphens)
- `sanitizeText(text)` - Removes HTML tags, scripts, and XSS-prone characters

**CORS Handling:**
- Configured in `netlify.toml` for global headers
- OPTIONS preflight handled in `checkin.js` handler
- Dynamically configured via `ALLOWED_ORIGIN` environment variable (defaults to `*` for development)
- Set `ALLOWED_ORIGIN` to frontend domain in production for security

**Error Handling:**
- 400: Missing required fields (email, eventId) or validation failures (invalid email/phone format)
- 500: Airtable API errors or internal failures
- Errors logged to console (visible in Netlify function logs)
- Generic error messages returned to client (Issue #7: sanitized error responses for security)

## Common Tasks

**Adding new fields to attendee:**
1. Add field to Airtable `attendees` table schema
2. Add validation function to `netlify/functions/utils/validation.js` if needed
3. Update `validateCheckinInput()` to validate/sanitize the new field
4. Update `createAttendee()` in `netlify/functions/utils/airtable.js`
5. Add unit tests to `tests/validation.test.js` and `tests/checkin.test.js`

**Adding new fields to check-in:**
1. Add field to Airtable `checkins` table schema
2. Add validation function to `netlify/functions/utils/validation.js` if needed
3. Update `validateCheckinInput()` to validate/sanitize the new field
4. Update `createCheckinEntry()` in `netlify/functions/utils/airtable.js`
5. Add unit tests to `tests/validation.test.js` and `tests/checkin.test.js`

**Debugging production issues:**
1. Check Netlify function logs in Netlify dashboard
2. Verify environment variables are set correctly
3. Check Airtable API key permissions
4. Review CORS headers if frontend cannot reach API

## Known Limitations & Future Improvements

From README.md, planned improvements include:
- ~~Add validation for email format and phone number format~~ ✅ Completed
- Display check-in confirmation back to user with edit option
- Add privacy policy and data deletion capability
- Implement proper dev/staging/main branch workflow instead of pushing directly to production

## Testing Strategy

**Unit Tests:**
- 124+ Jest tests covering validation utilities and checkin handler
- Run with `npm test`
- Tests include edge cases, security scenarios, and error handling
- Located in `tests/validation.test.js` and `tests/checkin.test.js`

**Smoke Tests:**
- End-to-end tests that verify API functionality with real HTTP requests
- Automated local testing: `npm run test:smoke-local` (starts server, tests, cleans up)
- Production testing: `npm run test:smoke-prod` (tests deployed API with debug flag)
- All smoke tests use `debug: "1"` to mark as test data

**Best Practices:**
- Use `debug: "1"` flag for all test submissions
- Filter Airtable views to exclude debug records for production analytics
- Token field provides basic anti-spoofing for QR code check-ins
- Run unit tests before committing changes
- Run smoke tests after deployment to verify API health
- Currently all changes push directly to production - test thoroughly locally before pushing

## Frontend Integration

The frontend (https://github.com/z1g1/bocc-website) contains manually created check-in forms that POST to this API. When creating new event check-in pages:

1. Generate a new GUID token for the event
2. Embed the token in the check-in URL/QR code
3. Set appropriate `eventId` (e.g., "bocc", "codeCoffee") to categorize the event
4. Forms should include: email (required), name, phone, businessName, okToEmail checkbox
5. Include `debug: "1"` in the request for testing, `debug: "0"` for production

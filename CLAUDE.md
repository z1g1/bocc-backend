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
2. API checks if attendee email exists in Airtable `attendees` table
3. If exists: create new check-in record in `checkins` table
4. If not exists: create attendee record first, then create check-in record
5. All records include `debug` flag for filtering test submissions
6. All check-ins include `token` field (static GUID per event, embedded in URL for basic anti-spoofing)

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

**Module System:** CommonJS (require/module.exports)
- Project uses CommonJS syntax, not ES modules
- All files use `.js` extension with `require()` and `module.exports`

## Environment Variables

Required environment variables (set in Netlify dashboard):
- `AIRTABLE_API_KEY` - Airtable API key for authentication
- `AIRTABLE_BASE_ID` - Base ID for the BOCC Airtable database

**Security Note:** This project uses Airtable API keys. Follow principle of least privilege - ensure API key has minimum required permissions for read/write on `attendees` and `checkins` tables only.

## Project Structure

```
bocc-backend/
├── netlify/
│   └── functions/
│       ├── checkin.js           # Main API endpoint handler
│       └── utils/
│           └── airtable.js      # Airtable client and database operations
├── netlify.toml                 # Netlify configuration (CORS headers)
├── package.json                 # Dependencies (airtable SDK)
└── README.md                    # Project documentation
```

## Development

**Current Workflow:**
- Push directly to `main` branch
- Netlify auto-deploys on every push to main
- **TODO:** Implement dev/staging/main workflow for safer deployments

**Local Testing:**
```bash
# Install Netlify CLI globally if not already installed
npm install -g netlify-cli

# Install dependencies
npm install

# Run functions locally with environment variables
netlify dev
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
- `fetchAttendeeByEmail(email)` - Query attendee by email
- `createAttendee(email, name, phone, businessName, okToEmail, debug)` - Create new attendee
- `createCheckinEntry(attendeeId, eventId, debug, token)` - Create check-in record

**CORS Handling:**
- Configured in `netlify.toml` for global headers
- OPTIONS preflight handled in `checkin.js` handler
- Currently allows all origins (`*`) - consider restricting in production

**Error Handling:**
- 400: Missing required fields (email)
- 500: Airtable API errors or internal failures
- Errors logged to console (visible in Netlify function logs)

## Common Tasks

**Adding new fields to attendee:**
1. Add field to Airtable `attendees` table schema
2. Update `createAttendee()` in `netlify/functions/utils/airtable.js`
3. Update request parsing in `netlify/functions/checkin.js`

**Adding new fields to check-in:**
1. Add field to Airtable `checkins` table schema
2. Update `createCheckinEntry()` in `netlify/functions/utils/airtable.js`
3. Update request parsing in `netlify/functions/checkin.js`

**Debugging production issues:**
1. Check Netlify function logs in Netlify dashboard
2. Verify environment variables are set correctly
3. Check Airtable API key permissions
4. Review CORS headers if frontend cannot reach API

## Known Limitations & Future Improvements

From README.md, planned improvements include:
- Add validation for email format and phone number format
- Display check-in confirmation back to user with edit option
- Add privacy policy and data deletion capability
- Implement proper dev/staging/main branch workflow instead of pushing directly to production

## Testing Strategy

- Use `debug: "1"` flag for all test submissions
- Filter Airtable views to exclude debug records for production analytics
- Token field provides basic anti-spoofing for QR code check-ins
- Currently all changes push directly to production - test thoroughly locally before pushing

## Frontend Integration

The frontend (https://github.com/z1g1/bocc-website) contains manually created check-in forms that POST to this API. When creating new event check-in pages:

1. Generate a new GUID token for the event
2. Embed the token in the check-in URL/QR code
3. Set appropriate `eventId` (e.g., "bocc", "codeCoffee") to categorize the event
4. Forms should include: email (required), name, phone, businessName, okToEmail checkbox
5. Include `debug: "1"` in the request for testing, `debug: "0"` for production

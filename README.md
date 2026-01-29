# bocc-backend
Backend functions for BOCC website. This API handles the connections with Airtable to store the data. A checkin page will send data for an Attendee, as well as an eventID.
1. check to see if the Attendee email exists in the table, if it does create a checkin with the current time and the event ID
1. There is a debug field in both the checkin and attendee table, this lets us filter our testing submissions
1. the token field is to set a GUID in the QR code at sign in. This is another way to try and filter out random results. It's a minor anti-spoofing control but enough for an MVP
1. If they are not in the Attendee table, create an entry, then check them in
1. API is hosted in Netlify which has API keys to connect to Airtable

## Testing

### Prerequisites
- Node.js installed
- npm installed

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
npm test
```

### Test Coverage
The test suite includes 50 tests covering:

- **Validation utilities** (`validation.test.js`)
  - `escapeAirtableFormula()`: Tests for escaping dangerous characters, handling edge cases, and preventing formula injection attacks
  - `isValidEmail()`: Tests for accepting valid email formats, rejecting invalid formats, and blocking injection attempts

- **Checkin handler** (`checkin.test.js`)
  - CORS preflight handling
  - Email validation (missing, empty, invalid format, injection attempts)
  - Existing attendee check-in flow
  - New attendee creation and check-in flow
  - Error handling
  - Debug flag handling

## Improvements
1. ~~Add a long URL paramater to the QR code that will be printed on site, use this as a psuedo token to discard random API submissions~~
1. ~~Add some verification to make sure that emails are emails, and phone numbers are phone numbers~~ (email validation added)
1. Display the information back on the Thank You screen to the person who checked in, give them the option to edit it
1. some sort of privacy policy to the main BOCC website, give people the ability to delete
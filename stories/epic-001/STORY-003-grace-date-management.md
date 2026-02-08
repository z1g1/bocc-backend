# STORY-003: Grace Date Management

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Medium
**Priority**: Medium
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a BOCC admin,
I want to declare grace dates (holidays/exceptions) in Airtable,
So that members' streaks aren't broken when they miss these declared exception dates.

## Context

BOCC meets every Tuesday, but there are legitimate reasons members may miss meetings without breaking their engagement streak:
- Holiday weeks (Christmas, New Year's, Thanksgiving)
- Event cancellations (weather, venue issues)
- Community breaks (summer/winter breaks)

**Grace dates** allow admins to declare specific Tuesdays as "excused absences" that don't count against streaks. This is important for fairness and member retention - members shouldn't be penalized for missing meetings during declared holidays.

**Example**: BOCC typically doesn't meet the last two Tuesdays of December. If a member has a 10-week streak, misses both December meetings, and returns in January, their streak should continue at 11 (not reset to 1).

**Admin Workflow**:
1. Admin adds grace date to Airtable `grace_dates` table (manual entry)
2. Includes: date (e.g., 2025-12-24), eventId ("bocc"), reason ("Christmas Eve")
3. Streak calculation automatically excludes grace dates when checking for broken streaks

This story creates the grace dates infrastructure that STORY-002 (Streak Calculation Engine) will consume.

## Acceptance Criteria

### Functional Requirements
- [ ] New Airtable table `grace_dates` with proper schema
- [ ] Table fields: id (auto), date (Date), eventId (Text), reason (Long Text), createdAt (DateTime)
- [ ] Utility function `getGraceDates(eventId)` queries Airtable for all grace dates
- [ ] Function filters grace dates by eventId (e.g., only return "bocc" grace dates)
- [ ] Function returns dates in format compatible with streak calculation (ISO 8601 strings or Date objects)
- [ ] Function caches grace dates per request to avoid multiple Airtable queries
- [ ] Function validates eventId parameter (prevent injection attacks)
- [ ] Grace dates are optional (if table is empty, function returns empty array gracefully)

### Non-Functional Requirements
- [ ] Query completes in <200ms (Airtable API call)
- [ ] Cache is per-request (not global, to avoid stale data)
- [ ] Error handling when Airtable table doesn't exist (graceful degradation)
- [ ] Error handling when Airtable API fails (return empty array, log error)
- [ ] Clear documentation on how admins should add grace dates

### Testing Requirements
- [ ] Unit test: Query grace dates for specific eventId ("bocc")
- [ ] Unit test: Multiple grace dates returned correctly
- [ ] Unit test: Empty grace_dates table returns empty array (no error)
- [ ] Unit test: Filter by eventId (don't return "codeCoffee" dates when querying "bocc")
- [ ] Unit test: Cache works (second call doesn't query Airtable again within same request)
- [ ] Unit test: Invalid eventId throws validation error
- [ ] Unit test: Airtable API failure returns empty array and logs error
- [ ] Integration test: Manually add grace date to Airtable, verify query returns it

## Technical Implementation Notes

### Approach

Create utility module `netlify/functions/utils/graceDates.js` that handles all grace date operations. This module will:
1. Query Airtable `grace_dates` table
2. Filter by eventId
3. Cache results per request (avoid duplicate queries)
4. Return array of dates for streak calculation to use

**Key Functions**:
1. `getGraceDates(eventId)` - Main function, returns array of grace date objects
2. `isGraceDate(date, graceDates)` - Helper to check if a date is in grace dates array
3. `clearGraceDateCache()` - Clear cache (for testing, or per-request reset)

**Airtable Table Schema** (must create manually in Airtable):
```
Table: grace_dates
Fields:
- id: Auto Number (primary key)
- date: Date (the Tuesday to excuse)
- eventId: Single Line Text (e.g., "bocc", "codeCoffee")
- reason: Long Text (why this date is a grace date, e.g., "Christmas Eve")
- createdAt: Date/Time (audit timestamp, auto-populated)

Indexes: eventId, date (for query performance)
```

### Components/Files Affected

**New File**: `netlify/functions/utils/graceDates.js`
- Query Airtable grace_dates table
- Cache mechanism
- Helper functions for grace date checking

**New File**: `tests/graceDates.test.js`
- Unit tests for all grace date functions
- Mock Airtable API responses

**Modified File**: `netlify/functions/utils/airtable.js`
- May add helper function for grace_dates queries (optional, could go in graceDates.js directly)

**Manual Setup**: Create `grace_dates` table in Airtable base

### Integration Points

**Airtable API**:
- Query `grace_dates` table: `base('grace_dates').select({ filterByFormula, sort }).all()`
- Uses existing Airtable SDK and authentication

**Consumed By**:
- STORY-002 (Streak Calculation Engine) - Receives grace dates array as input
- STORY-008 (Comprehensive Testing) - Tests with various grace date scenarios

**Input Validation**:
- Uses existing `escapeAirtableFormula()` to prevent injection attacks
- Validates eventId format (alphanumeric + hyphens only)

### Technical Considerations

**Cache Strategy** (per-request, not global):
```javascript
// Module-level variable for per-request cache
let graceDateCache = null;

async function getGraceDates(eventId) {
  // Check cache first
  if (graceDateCache && graceDateCache[eventId]) {
    console.log('Returning cached grace dates for:', eventId);
    return graceDateCache[eventId];
  }

  // Query Airtable
  const records = await queryGraceDates(eventId);

  // Cache results
  if (!graceDateCache) graceDateCache = {};
  graceDateCache[eventId] = records;

  return records;
}

// Called at start of each check-in request
function clearGraceDateCache() {
  graceDateCache = null;
}
```

**Why per-request cache?**
- Avoids stale data (new grace dates added don't require server restart)
- Prevents multiple Airtable queries within same check-in request
- Simple implementation (no TTL logic needed)

**Query Optimization**:
```javascript
// Only fetch grace dates for relevant time period (past year + future year)
const formula = `AND(
  {eventId} = '${escapeAirtableFormula(eventId)}',
  {date} >= DATEADD(TODAY(), -365, 'days'),
  {date} <= DATEADD(TODAY(), 365, 'days')
)`;
```

**Date Format Consistency**:
- Airtable stores dates in YYYY-MM-DD format
- Return dates as ISO 8601 strings for consistency with streak calculation
- Convert to Date objects in streak calculation module

**Graceful Degradation**:
```javascript
try {
  const graceDates = await getGraceDates(eventId);
  // Use grace dates in calculation
} catch (error) {
  console.error('Failed to fetch grace dates:', error.message);
  // Continue with empty grace dates array (no grace dates = stricter streaks)
  const graceDates = [];
}
```

**Edge Cases**:
1. **Grace dates table doesn't exist**: Return empty array, log warning
2. **No grace dates for eventId**: Return empty array (valid scenario)
3. **Multiple grace dates on same day**: Deduplicate (shouldn't happen, but handle gracefully)
4. **Past grace dates**: Include in query (needed for streak recalculation)
5. **Far-future grace dates**: Limit query to ±1 year (performance optimization)

### Existing Patterns to Follow

**Module Pattern**: CommonJS (require/module.exports)
**Airtable Queries**: Use existing base instance and error handling patterns
**Validation**: Use `escapeAirtableFormula()` from validation.js
**Error Handling**: Try-catch with console.error, graceful degradation

### Performance Considerations

- Airtable query: ~100-200ms per call
- Cache eliminates duplicate queries (important for streak calculation)
- Query limited to ±1 year (reduces data transfer and processing)
- Expected data size: <50 grace dates per event (very lightweight)

## Dependencies

### Blocks
- None (other stories can proceed without grace dates, they just get empty array)

### Blocked By
- None (independent infrastructure work)

### Related
- [[STORY-002]] - Streak Calculation Engine (consumes grace dates array)
- [[STORY-008]] - Comprehensive Testing (tests grace date scenarios)

## Out of Scope

**Explicitly NOT included in this story**:
- UI for adding grace dates (admin uses Airtable directly)
- Validation of grace dates at entry time (admin responsible for correctness)
- Automatic grace date suggestions (e.g., detecting holidays)
- Grace date approval workflow (admin adds directly, no approval needed)
- Notification to members about grace dates (future feature)
- Retroactive grace date application (future Epic: historical backfill)
- Grace date deletion/editing workflow (admin uses Airtable directly)
- Grace date audit log beyond Airtable's built-in history

## Notes

**Manual Setup Instructions** (for admin):

1. **Create Airtable Table**:
   - Name: `grace_dates`
   - Fields:
     - id: Auto Number (default)
     - date: Date (single line, formatted as YYYY-MM-DD)
     - eventId: Single Line Text
     - reason: Long Text
     - createdAt: Created Time (auto-populated)

2. **Add Sample Grace Dates** (for testing):
   ```
   date: 2025-12-23, eventId: bocc, reason: Week before Christmas
   date: 2025-12-30, eventId: bocc, reason: Week between holidays
   ```

3. **Index Recommendations**:
   - Create view filtered by `eventId = "bocc"` (for admin convenience)
   - Sort by `date` descending (most recent first)

**Admin Workflow** (adding grace dates):
1. Open Airtable base
2. Navigate to `grace_dates` table
3. Click "Add record"
4. Fill in: date (pick from calendar), eventId ("bocc"), reason (text explanation)
5. Save
6. Grace date takes effect immediately (next check-in will use it)

**Testing Strategy**:
- Mock Airtable responses in unit tests (don't require real table)
- Integration test requires manual setup of grace_dates table
- Use `debug: "1"` flag for test check-ins
- Verify in smoke tests that grace dates are queried and used

**Future Enhancements** (separate stories):
- Admin dashboard UI for managing grace dates
- API endpoint to query upcoming grace dates
- Validation: prevent duplicate grace dates
- Notification: alert members when grace date is added
- Bulk import: Upload CSV of grace dates (e.g., full year of holidays)

**Error Scenarios**:
- Airtable base missing grace_dates table: Log warning, return empty array
- Airtable API timeout: Log error, return empty array (fail safe)
- Invalid eventId: Throw validation error (caller should catch)
- Malformed date in table: Skip that record, log warning, continue

**Cache Behavior**:
- Cache cleared at start of each check-in request (in checkin.js handler)
- If multiple events checked in same request (edge case), cache shared
- Cache is module-level (per Node.js process), but reset per request

---

**Next Steps**: This Story is READY for task breakdown. Can be developed in parallel with STORY-002 (Streak Calculation Engine) since they're loosely coupled. STORY-002 will consume this via graceDates array parameter.

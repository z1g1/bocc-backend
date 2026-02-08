# STORY-005: Airtable Streaks Table

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Medium
**Priority**: Medium
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a BOCC admin,
I want streak data stored in Airtable,
So that I can easily generate reports, analytics, and visualizations of member engagement patterns without querying Circle.so.

## Context

While Circle.so custom fields (STORY-004) enable automated workflows, Airtable provides superior reporting and analytics capabilities:
- **Reporting**: Create views, charts, and dashboards in Airtable
- **Analysis**: Export to CSV for deeper analysis in Excel/Google Sheets
- **Queries**: Flexible filtering and aggregation (e.g., "members with 5+ week streaks")
- **History**: Track streak changes over time (future enhancement)
- **Integration**: Connect to other tools (Zapier, analytics platforms)

This is the second half of the "dual storage" pattern. Both Circle.so and Airtable must be updated together during check-in to maintain data consistency.

**Table Schema**:
- One record per attendee per eventId (e.g., one record for user@example.com + "bocc")
- Updated (upserted) on every check-in for that eventId
- Linked to existing `attendees` table via attendeeId

**Update Pattern**:
- Fetch or create streak record for attendee + eventId
- Update with latest streak values from calculation
- Uses Airtable's upsert pattern (update if exists, create if not)

## Acceptance Criteria

### Functional Requirements
- [ ] New Airtable table `streaks` created with proper schema
- [ ] Table fields: id, attendeeId (link), eventId, currentStreak, longestStreak, lastCheckinDate, lastStreakUpdate
- [ ] Function `upsertStreakRecord(attendeeId, eventId, streakData)` creates or updates record
- [ ] Function finds existing record by attendeeId + eventId combination
- [ ] Function creates new record if none exists (first check-in)
- [ ] Function updates existing record with new streak values
- [ ] Function sets `lastStreakUpdate` timestamp automatically
- [ ] Linked field to `attendees` table works correctly (shows attendee details)

### Non-Functional Requirements
- [ ] Upsert operation completes in <300ms (query + update)
- [ ] Error handling when table doesn't exist (fail gracefully, log error)
- [ ] Error handling when Airtable API fails (log error, don't block check-in)
- [ ] Clear logging of all streak record updates

### Testing Requirements
- [ ] Unit test: Create new streak record (first check-in)
- [ ] Unit test: Update existing streak record (subsequent check-in)
- [ ] Unit test: Find record by attendeeId + eventId combination
- [ ] Unit test: Handle missing streak record (creates new one)
- [ ] Unit test: Handle Airtable API failure (returns error, doesn't throw)
- [ ] Unit test: Validate streakData object before upsert
- [ ] Integration test: Verify record created in staging Airtable base
- [ ] Integration test: Verify record updated correctly on second check-in

## Technical Implementation Notes

### Approach

Extend `netlify/functions/utils/airtable.js` with functions to manage the `streaks` table. Implement an "upsert" pattern (find existing record, update if found, create if not) since Airtable doesn't have native upsert support.

**Key Functions**:
1. `findStreakRecord(attendeeId, eventId)` - Query for existing record
2. `createStreakRecord(attendeeId, eventId, streakData)` - Create new record
3. `updateStreakRecord(recordId, streakData)` - Update existing record
4. `upsertStreakRecord(attendeeId, eventId, streakData)` - Main function (find → update or create)

**Upsert Pattern**:
```javascript
async function upsertStreakRecord(attendeeId, eventId, streakData) {
  // Try to find existing record
  const existingRecord = await findStreakRecord(attendeeId, eventId);

  if (existingRecord) {
    // Update existing
    return await updateStreakRecord(existingRecord.id, streakData);
  } else {
    // Create new
    return await createStreakRecord(attendeeId, eventId, streakData);
  }
}
```

### Components/Files Affected

**Modified File**: `netlify/functions/utils/airtable.js`
- Add `findStreakRecord(attendeeId, eventId)` function
- Add `createStreakRecord(attendeeId, eventId, streakData)` function
- Add `updateStreakRecord(recordId, streakData)` function
- Add `upsertStreakRecord(attendeeId, eventId, streakData)` function (main)

**Modified File**: `tests/airtable.test.js` (or new `tests/streaks-airtable.test.js`)
- Test suite for all streak record operations
- Mock Airtable API responses

**Modified File**: `netlify/functions/checkin.js`
- Call `upsertStreakRecord` after streak calculation
- Handle errors gracefully (log but don't fail check-in)

**Manual Setup**: Create `streaks` table in Airtable base (documented below)

### Integration Points

**Airtable API**:
- Query: `base('streaks').select({ filterByFormula }).firstPage()`
- Create: `base('streaks').create({ fields })`
- Update: `base('streaks').update(recordId, { fields })`

**Table Schema** (must create manually in Airtable):
```
Table: streaks

Fields:
- id: Auto Number (primary key)
- attendeeId: Link to another record → attendees table (foreign key)
- eventId: Single Line Text (e.g., "bocc", "codeCoffee")
- currentStreak: Number (consecutive weeks)
- longestStreak: Number (personal best)
- lastCheckinDate: Date (last attendance date)
- lastStreakUpdate: Date/Time (when this record was last updated, auto-set)

Indexes/Views:
- Primary view: Sort by currentStreak descending (leaderboard)
- View: Active Streaks (filter: currentStreak > 0)
- View: Personal Bests (filter: currentStreak = longestStreak)
```

**Data Flow**:
```
Streak Calculation (STORY-002)
  ↓ returns streakData object
upsertStreakRecord(attendeeId, eventId, streakData)
  ↓ queries
findStreakRecord(attendeeId, eventId)
  ↓ if found
updateStreakRecord(recordId, streakData)
  ↓ if not found
createStreakRecord(attendeeId, eventId, streakData)
```

### Technical Considerations

**Query Formula** (find existing record):
```javascript
const sanitizedEventId = escapeAirtableFormula(eventId);

// Find record where attendeeId matches AND eventId matches
const formula = `AND(
  {attendeeId} = '${attendeeId}',
  {eventId} = '${sanitizedEventId}'
)`;

const records = await base('streaks').select({
  filterByFormula: formula,
  maxRecords: 1
}).firstPage();

return records.length > 0 ? records[0] : null;
```

**Note on attendeeId**: It's a linked record field, so formula syntax is:
```javascript
// Correct formula for linked record
{attendeeId} = '${attendeeId}'  // Airtable handles linked record comparison
```

**Create Record**:
```javascript
const record = await base('streaks').create({
  attendeeId: [attendeeId],  // Array for linked record
  eventId: eventId,
  currentStreak: streakData.currentStreak,
  longestStreak: streakData.longestStreak,
  lastCheckinDate: streakData.lastCheckinDate,
  lastStreakUpdate: new Date().toISOString()
});
```

**Update Record**:
```javascript
const record = await base('streaks').update(recordId, {
  currentStreak: streakData.currentStreak,
  longestStreak: streakData.longestStreak,
  lastCheckinDate: streakData.lastCheckinDate,
  lastStreakUpdate: new Date().toISOString()
});
```

**Date Formats**:
- `lastCheckinDate`: Date field in Airtable (YYYY-MM-DD)
- `lastStreakUpdate`: DateTime field in Airtable (ISO 8601 timestamp)

**Error Handling**:
```javascript
async function upsertStreakRecord(attendeeId, eventId, streakData) {
  try {
    console.log('Upserting streak record:', attendeeId, eventId);

    const existingRecord = await findStreakRecord(attendeeId, eventId);

    if (existingRecord) {
      console.log('Updating existing streak record:', existingRecord.id);
      return await updateStreakRecord(existingRecord.id, streakData);
    } else {
      console.log('Creating new streak record');
      return await createStreakRecord(attendeeId, eventId, streakData);
    }
  } catch (error) {
    console.error('Failed to upsert streak record:', error.message);
    // Don't throw - allow check-in to continue even if Airtable fails
    return null;
  }
}
```

**Edge Cases**:
1. **Attendee doesn't exist**: Shouldn't happen (attendee created first in check-in flow) → throw error
2. **Table doesn't exist**: Airtable returns error → log error, return null
3. **Network timeout**: Retry once, then fail gracefully → log error, continue
4. **Duplicate records**: Shouldn't happen (enforced by query logic) → if found, log warning, use first
5. **Invalid streakData**: Validate before calling upsert → throw error if invalid

**Validation** (before upsert):
```javascript
function validateStreakData(streakData) {
  if (typeof streakData.currentStreak !== 'number' || streakData.currentStreak < 0) {
    throw new Error('Invalid currentStreak value');
  }
  if (typeof streakData.longestStreak !== 'number' || streakData.longestStreak < 0) {
    throw new Error('Invalid longestStreak value');
  }
  if (!streakData.lastCheckinDate) {
    throw new Error('Missing lastCheckinDate');
  }
  // All valid
  return true;
}
```

### Existing Patterns to Follow

**Module Pattern**: CommonJS (require/module.exports)
**Airtable Queries**: Use existing `base` instance and formula patterns
**Sanitization**: Use `escapeAirtableFormula()` for eventId
**Error Handling**: Try-catch with console.error, non-blocking failures

### Performance Considerations

- Query for existing record: ~100-150ms
- Create/update record: ~100-150ms
- Total upsert time: ~200-300ms
- Acceptable for check-in flow (<2s total target)
- No caching needed (each check-in is independent)

## Dependencies

### Blocks
- [[STORY-006]] - Enhanced Check-in Response (needs streaks stored to return)

### Blocked By
- [[STORY-002]] - Streak Calculation Engine (provides streakData to store)

### Related
- [[STORY-004]] - Circle.so Custom Field Integration (parallel storage, dual write)
- [[STORY-008]] - Comprehensive Testing (integration tests verify Airtable updates)

## Out of Scope

**Explicitly NOT included in this story**:
- Historical streak tracking (storing streak changes over time) - defer to future Epic
- Streak leaderboard UI (Airtable views sufficient for MVP)
- Automated reports/emails based on Airtable data - future enhancement
- Data export/backup automation - future enhancement
- Reconciliation with Circle.so (detecting/fixing inconsistencies) - future Epic
- Cascading delete when attendee deleted - future enhancement (manual cleanup for now)

## Notes

**Manual Setup Instructions** (before deploying):

1. **Create Airtable Table**:
   - Name: `streaks`
   - Fields:
     - `id`: Auto Number (created by default)
     - `attendeeId`: Link to another record → Select `attendees` table → Allow linking to multiple records: NO
     - `eventId`: Single Line Text
     - `currentStreak`: Number (integer, allow negative: NO)
     - `longestStreak`: Number (integer, allow negative: NO)
     - `lastCheckinDate`: Date (formatting: Local, include time: NO)
     - `lastStreakUpdate`: Date (formatting: Local, include time: YES, GMT)

2. **Create Helpful Views**:
   - **Leaderboard**: Sort by `currentStreak` descending, filter `currentStreak > 0`
   - **Personal Bests**: Filter `currentStreak = longestStreak`, sort by `longestStreak` desc
   - **Recent Updates**: Sort by `lastStreakUpdate` descending
   - **By Event**: Group by `eventId` (useful when multiple event types exist)

3. **Test Data** (for development):
   ```
   attendeeId: [link to test attendee], eventId: bocc, currentStreak: 1, longestStreak: 1, lastCheckinDate: today
   ```

**Reporting Examples** (use cases for admins):
- "Members with 5+ week streaks": Filter `currentStreak >= 5`
- "Streak distribution": Group by `currentStreak` (histogram)
- "Top 10 longest streaks": Sort by `longestStreak` descending, limit 10
- "Inactive members": Filter `currentStreak = 0` (streak broken or never started)
- "Recent drop-offs": Filter `currentStreak = 0`, sort by `lastStreakUpdate` desc (recently broken)

**Data Consistency Strategy**:
- Circle.so and Airtable updated together during check-in
- If Circle.so fails: Log error, continue with Airtable (Airtable is source of truth for reporting)
- If Airtable fails: Log error, continue (check-in succeeds, streak in Circle only)
- Future Epic: Reconciliation job to detect and fix inconsistencies

**Testing Strategy**:
- Unit tests mock Airtable API (no real table required)
- Integration tests use staging Airtable base (manual verification)
- Verify linked field displays correctly in Airtable UI
- Test upsert idempotency (multiple calls with same data don't duplicate records)

**Future Enhancements**:
- **Streak History**: Additional table to track streak changes over time (for trend analysis)
- **Automated Reports**: Daily/weekly email with top streaks, new personal bests
- **Dashboard Integration**: Connect to Retool, Tableau, or custom dashboard
- **Data Export**: Scheduled CSV exports to Google Drive or Dropbox
- **Consistency Check**: Cron job to compare Circle.so vs Airtable values

**Rollback Plan**:
- If streaks table causes issues, can disable updates via feature flag
- Check-in will still succeed, just won't update Airtable streaks
- Can recreate/repopulate table from check-in history (future backfill Epic)

---

**Next Steps**: This Story is READY for task breakdown. Requires STORY-002 completed first. Can be developed in parallel with STORY-004 (Circle.so storage). Both STORY-004 and STORY-005 will be called from checkin.js in sequence (dual write pattern).

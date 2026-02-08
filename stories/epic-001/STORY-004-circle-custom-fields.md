# STORY-004: Circle.so Custom Field Integration

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Medium
**Priority**: High
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a system,
I need to store streak data in Circle.so custom fields,
So that Circle.so workflows can trigger automated rewards based on attendance patterns (e.g., "5-visit badge", "10-week streak celebration").

## Context

Circle.so has a powerful workflow automation system that can trigger actions based on custom field values (e.g., send email when `checkinCount` reaches 10, award badge when `currentStreak` reaches 5). To enable these automations, we need to store streak data in Circle.so member profiles.

**Why Circle.so Storage?**
- Circle.so workflows cannot read from Airtable
- Custom fields are the only way to make data available to Circle.so automations
- Members can see their streak stats in their Circle profile (future UI enhancement)

**Custom Fields to Add** (in Circle.so community settings):
1. `checkinCount` - Total visits (EXISTING, fixed by STORY-001)
2. `currentStreak` - Current consecutive weeks (NEW)
3. `longestStreak` - Personal best (NEW)
4. `lastCheckinDate` - Last attendance date in ISO 8601 format (NEW)

**Update Pattern**:
- Updated during every non-debug check-in
- Uses the fixed `updateMemberCustomField` function from STORY-001
- Updates all four fields together (atomic operation per field)

This is one half of the "dual storage" pattern (Circle.so + Airtable). This story handles the Circle.so side.

## Acceptance Criteria

### Functional Requirements
- [ ] Custom fields added to Circle.so community settings (manual setup step)
- [ ] `updateStreakFields(memberId, streakData)` function updates all four fields
- [ ] Function updates `currentStreak` (number)
- [ ] Function updates `longestStreak` (number)
- [ ] Function updates `lastCheckinDate` (ISO 8601 date string, e.g., "2026-02-07")
- [ ] Function updates `checkinCount` (number, using fixed increment from STORY-001)
- [ ] Function handles errors gracefully (log error, don't fail check-in)
- [ ] Function uses existing `updateMemberCustomField` (from circle.js)

### Non-Functional Requirements
- [ ] All four fields updated in <1 second total (4 API calls at ~200ms each)
- [ ] Retries once on network failure, then fails gracefully
- [ ] Logs all custom field updates for audit trail
- [ ] Backward compatible (doesn't break existing `incrementCheckinCount` calls)

### Testing Requirements
- [ ] Unit test: `updateStreakFields` calls `updateMemberCustomField` four times
- [ ] Unit test: Updates each field with correct value from streakData object
- [ ] Unit test: Handles error when Circle.so API fails (logs error, doesn't throw)
- [ ] Unit test: Formats `lastCheckinDate` as ISO 8601 string
- [ ] Unit test: Calls existing `incrementCheckinCount` for `checkinCount` field
- [ ] Mock test: Verify Circle.so API PATCH calls made correctly
- [ ] Integration test: Verify fields updated in staging Circle.so community

## Technical Implementation Notes

### Approach

Extend the existing `netlify/functions/utils/circle.js` module with a new function that orchestrates updates to all streak-related custom fields. This function will:
1. Accept a streakData object with calculated values
2. Call existing `updateMemberCustomField` for each field
3. Handle errors gracefully (non-blocking for check-in)
4. Log all updates for debugging and audit

**New Function Signature**:
```javascript
/**
 * Update all streak-related custom fields for a member
 * @param {string|number} memberId - Circle member ID
 * @param {object} streakData - Calculated streak data
 * @param {number} streakData.checkinCount - Total visits (updated separately via incrementCheckinCount)
 * @param {number} streakData.currentStreak - Current consecutive weeks
 * @param {number} streakData.longestStreak - Personal best
 * @param {string} streakData.lastCheckinDate - ISO 8601 date string
 * @returns {Promise<object>} Success/failure status
 */
async function updateStreakFields(memberId, streakData) {
  // Implementation
}
```

### Components/Files Affected

**Modified File**: `netlify/functions/utils/circle.js`
- Add `updateStreakFields(memberId, streakData)` function
- Uses existing `updateMemberCustomField` helper
- Follows existing error handling patterns

**Modified File**: `tests/circle.test.js`
- Add test suite for `updateStreakFields`
- Mock axios calls to Circle.so API
- Verify correct field names and values

**Modified File**: `netlify/functions/checkin.js`
- Call `updateStreakFields` after streak calculation
- Handle errors gracefully (log but don't fail check-in)

**Manual Setup**: Add custom fields to Circle.so community settings (documented below)

### Integration Points

**Circle.so Admin API v2**:
- PATCH `/api/admin/v2/community_members/{memberId}` - Update custom fields
- Uses existing `circleApi` axios instance
- Authentication: Bearer token via `CIRCLE_API_TOKEN`

**Custom Fields** (must be added manually in Circle.so):
```
Field Name: currentStreak
Type: Number
Description: Current consecutive weeks attended

Field Name: longestStreak
Type: Number
Description: Personal best streak (highest ever)

Field Name: lastCheckinDate
Type: Text
Description: Last check-in date (ISO 8601)
```

**Data Flow**:
```
Streak Calculation (STORY-002)
  ↓ returns streakData object
updateStreakFields(memberId, streakData)
  ↓ calls (4 times)
updateMemberCustomField(memberId, fieldName, value)
  ↓ makes
Circle.so PATCH /community_members/{memberId}
```

### Technical Considerations

**API Call Optimization**:
```javascript
// Option A: Sequential updates (easier error handling)
await updateMemberCustomField(memberId, 'currentStreak', streakData.currentStreak);
await updateMemberCustomField(memberId, 'longestStreak', streakData.longestStreak);
await updateMemberCustomField(memberId, 'lastCheckinDate', streakData.lastCheckinDate);
await incrementCheckinCount(memberId);  // Uses fixed function from STORY-001

// Option B: Parallel updates (faster, ~200ms vs ~800ms)
await Promise.all([
  updateMemberCustomField(memberId, 'currentStreak', streakData.currentStreak),
  updateMemberCustomField(memberId, 'longestStreak', streakData.longestStreak),
  updateMemberCustomField(memberId, 'lastCheckinDate', streakData.lastCheckinDate),
  incrementCheckinCount(memberId)
]);

// Decision: Use Option A for MVP (simpler error handling, acceptable performance)
```

**Date Format**:
```javascript
// lastCheckinDate must be ISO 8601 string
const lastCheckinDate = new Date().toISOString().split('T')[0];  // "2026-02-07"
// OR
const lastCheckinDate = format(new Date(), 'yyyy-MM-dd');  // date-fns
```

**Error Handling Pattern**:
```javascript
async function updateStreakFields(memberId, streakData) {
  try {
    console.log('Updating Circle.so streak fields for member:', memberId);
    console.log('Streak data:', streakData);

    await updateMemberCustomField(memberId, 'currentStreak', streakData.currentStreak);
    await updateMemberCustomField(memberId, 'longestStreak', streakData.longestStreak);
    await updateMemberCustomField(memberId, 'lastCheckinDate', streakData.lastCheckinDate);

    console.log('Successfully updated all streak fields');
    return { success: true };
  } catch (error) {
    console.error('Failed to update Circle.so streak fields:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    // Don't throw - allow check-in to continue
    return { success: false, error: error.message };
  }
}
```

**Retry Logic** (simple, one retry):
```javascript
async function updateStreakFieldsWithRetry(memberId, streakData) {
  try {
    return await updateStreakFields(memberId, streakData);
  } catch (error) {
    console.warn('Retry: updating streak fields after error:', error.message);
    return await updateStreakFields(memberId, streakData);
  }
}
```

**Edge Cases**:
1. **Custom field doesn't exist**: Circle.so returns error → log warning, continue
2. **Member not found**: Shouldn't happen (ensureMember called first) → log error, throw
3. **Network timeout**: Retry once, then fail gracefully → log error, return failure
4. **Invalid field value**: Circle.so rejects → log error, skip that field
5. **Partial failure**: Some fields update, others fail → log which failed, continue

### Existing Patterns to Follow

**Module Pattern**: CommonJS (require/module.exports)
**API Client**: Use existing `circleApi` axios instance
**Error Logging**: Detailed console.error with response data
**Non-blocking Failures**: Don't throw errors that would fail check-in
**Exports**: Add `updateStreakFields` to module.exports

### Performance Considerations

- Sequential updates: 4 API calls × 200ms = ~800ms
- Parallel updates: 4 API calls in parallel = ~200ms (if we optimize later)
- Acceptable for MVP: <1 second total
- Total check-in time: <2 seconds (includes Airtable, streak calc, Circle updates)

## Dependencies

### Blocks
- [[STORY-006]] - Enhanced Check-in Response (needs streaks stored to return in response)

### Blocked By
- [[STORY-001]] - Fix Visit Count Bug (must have working custom field updates)
- [[STORY-002]] - Streak Calculation Engine (provides streakData to store)

### Related
- [[STORY-005]] - Airtable Streaks Table (parallel storage, dual write pattern)
- [[STORY-008]] - Comprehensive Testing (integration tests verify Circle updates)

## Out of Scope

**Explicitly NOT included in this story**:
- Reading custom fields (handled in STORY-001 for checkinCount only)
- Batch updates for multiple members (check-ins are individual)
- Custom field validation at Circle.so level (Circle enforces field types)
- Member-facing UI to view streak stats (future enhancement)
- Webhook notifications when streaks update (future enhancement)
- Custom field deletion/migration (out of scope)
- Historical backfill of custom fields (future Epic)

## Notes

**Manual Setup Instructions** (before deploying):

1. **Add Custom Fields to Circle.so**:
   - Log into Circle.so admin dashboard
   - Navigate to: Settings → Community Settings → Custom Fields
   - Add the following fields:

   **Field 1**:
   - Name: `currentStreak`
   - Type: Number
   - Description: "Current consecutive weeks attended"
   - Visible to: Members (so they can see their streak)
   - Editable by: Admins only

   **Field 2**:
   - Name: `longestStreak`
   - Type: Number
   - Description: "Personal best attendance streak"
   - Visible to: Members
   - Editable by: Admins only

   **Field 3**:
   - Name: `lastCheckinDate`
   - Type: Text (not Date, because we control format)
   - Description: "Last event check-in date (YYYY-MM-DD)"
   - Visible to: Members
   - Editable by: Admins only

   **Field 4**:
   - Name: `checkinCount` (EXISTING - should already exist)
   - If doesn't exist, create:
   - Type: Number
   - Description: "Total event check-ins"
   - Visible to: Members
   - Editable by: Admins only

2. **Verify API Permissions**:
   - Check that `CIRCLE_API_TOKEN` has custom field write permissions
   - See `CIRCLE_PERMISSIONS.md` for required permissions
   - Test with smoke test after setup

**Testing Strategy**:
- Unit tests mock Circle.so API responses (don't require real community)
- Integration tests use staging Circle.so test community
- Verify custom fields populated correctly after check-in
- Check Circle.so admin panel for actual values

**Circle.so Automation Examples** (future use cases):
- Workflow: When `checkinCount` >= 5 → Send "5-visit milestone" email
- Workflow: When `currentStreak` >= 3 → Award "Consistent Member" badge
- Workflow: When `longestStreak` updated → Post congratulations in feed
- These automations are configured in Circle.so, not in our code

**Data Consistency**:
- Circle.so is "primary" for workflows (this story)
- Airtable is "secondary" for reporting (STORY-005)
- If Circle.so update fails, log error but continue (Airtable still updates)
- Future Epic: Reconciliation job to detect/fix inconsistencies

**Rollback Plan**:
- If custom fields cause issues, can disable updates via feature flag
- Check-in will still succeed, just won't update Circle fields
- Historical data in Airtable allows backfill later

**Future Enhancements**:
- Batch update: Update multiple members' streaks (for backfill)
- Atomic update: Single API call to update all fields (if Circle.so supports)
- Webhook: Listen for Circle.so custom field changes (detect manual edits)
- Validation: Compare Airtable vs Circle.so values (consistency check)

---

**Next Steps**: This Story is READY for task breakdown. Requires STORY-001 and STORY-002 completed first. Can be developed in parallel with STORY-005 (Airtable storage).

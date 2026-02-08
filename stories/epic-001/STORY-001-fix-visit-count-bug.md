# STORY-001: Fix Visit Count Bug

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Small
**Priority**: CRITICAL - BLOCKS ALL OTHER STORIES
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a BOCC admin,
I want visit counts to increment correctly in Circle.so,
So that member engagement data is accurate and reliable for reporting and automated rewards.

## Context

**CRITICAL PRODUCTION BUG**: The `incrementCheckinCount` function in `netlify/functions/utils/circle.js` currently ignores the `currentCount` parameter and always sets the check-in count to 1. This makes all visit count data in Circle.so unreliable - members who have attended multiple times show a count of 1 instead of their actual attendance count.

This bug blocks all future engagement tracking work. Circle.so workflows that depend on accurate check-in counts for automated rewards (e.g., "5 visit milestone") will never trigger because counts never exceed 1.

**Root Cause**: The function receives a `currentCount` parameter but doesn't fetch the actual current value from Circle.so before incrementing. It either uses the passed-in value (which is often null) or defaults to 1, resulting in every update setting the count to 1.

**Impact**:
- 100% of check-ins since this feature launched have incorrect counts
- Historical data is unreliable
- Circle.so automated reward workflows are broken
- Members cannot see accurate attendance history

**Priority**: This must be fixed FIRST before implementing streak tracking, as streak tracking will also depend on accurate custom field updates.

## Acceptance Criteria

### Functional Requirements
- [ ] `incrementCheckinCount` fetches the current value of `checkinCount` custom field from Circle.so member profile
- [ ] If `checkinCount` is null/undefined (new member), treat as 0 and set to 1
- [ ] If `checkinCount` has a value, increment by 1 (e.g., 5 becomes 6)
- [ ] Function updates the Circle.so member profile with the correct incremented value
- [ ] Function logs both the current value and new value for audit trail
- [ ] Function handles API errors gracefully (network failures, rate limits, etc.)

### Non-Functional Requirements
- [ ] API calls to Circle.so use existing error handling patterns (try-catch with logging)
- [ ] No breaking changes to function signature (maintain backward compatibility)
- [ ] Response time remains acceptable (<500ms for increment operation)
- [ ] Code includes clear comments explaining the bug fix

### Testing Requirements
- [ ] Unit tests verify increment from null → 1 (new member)
- [ ] Unit tests verify increment from existing value (5 → 6, 42 → 43)
- [ ] Unit tests verify error handling when Circle.so API fails
- [ ] Unit tests mock Circle.so API responses correctly
- [ ] Integration test (smoke test) verifies check-in increments count in staging environment
- [ ] All existing tests still pass (no regression)

## Technical Implementation Notes

### Approach

The fix requires adding a new function to fetch the current value of the `checkinCount` custom field before updating it. The implementation follows this flow:

1. Add `getMemberCustomField(memberId, fieldName)` helper function
2. Modify `incrementCheckinCount(memberId)` to:
   - Call `getMemberCustomField(memberId, 'checkinCount')`
   - Handle null/undefined (new member) → default to 0
   - Calculate new value: `currentValue + 1`
   - Call existing `updateMemberCustomField(memberId, 'checkinCount', newValue)`
3. Add comprehensive logging for audit trail

### Components/Files Affected

**Modified File**: `netlify/functions/utils/circle.js`
- Add `getMemberCustomField(memberId, fieldName)` function (NEW)
- Modify `incrementCheckinCount(memberId, currentCount)` function (FIX)
- Remove unused `currentCount` parameter (breaking change avoided by making it optional/ignored)

**Modified File**: `tests/circle.test.js`
- Add test suite for `getMemberCustomField` function
- Expand tests for `incrementCheckinCount` bug fix
- Add tests for error scenarios (API failures, null values)

**Modified File**: `tests/smoke-test.sh`
- Add verification step to check visit count increments correctly
- Test multiple check-ins for same attendee (different days to avoid deduplication)

### Integration Points

**Circle.so Admin API v2**:
- GET `/api/admin/v2/community_members/{memberId}` - Fetch member with custom fields
- PATCH `/api/admin/v2/community_members/{memberId}` - Update custom field (existing)

**Custom Field Schema** (must exist in Circle.so community settings):
- `checkinCount` (type: number) - Must be configured in Circle.so admin panel

### Technical Considerations

**API Response Structure**:
```javascript
// GET /community_members/{memberId} response:
{
  id: "12345",
  email: "user@example.com",
  custom_fields: {
    checkinCount: 5,  // This is what we need to fetch
    // other fields...
  }
}
```

**Edge Cases**:
1. **New member (no custom field)**: `custom_fields.checkinCount` is undefined → treat as 0
2. **Custom field not configured**: Circle.so may return error → log warning, attempt to set to 1
3. **Race condition**: Two check-ins happen simultaneously → accept last-write-wins (rare, acceptable)
4. **Network failure during fetch**: Retry once, then fail gracefully (log error, don't block check-in)

**Error Handling Pattern** (follow existing codebase):
```javascript
try {
  // Fetch and increment
  const currentValue = await getMemberCustomField(memberId, 'checkinCount');
  const newValue = (currentValue || 0) + 1;
  await updateMemberCustomField(memberId, 'checkinCount', newValue);
} catch (error) {
  console.error('Error incrementing check-in count:', error.message);
  // Log but don't throw - check-in should succeed even if Circle.so fails
}
```

### Existing Patterns to Follow

**Module Pattern**: CommonJS (require/module.exports)
**Error Logging**: `console.error()` with descriptive messages
**API Client**: Use existing `circleApi` axios instance
**Function Exports**: Add `getMemberCustomField` to module.exports

### Performance Considerations

- Added GET request before each increment (~200ms)
- Acceptable trade-off for data accuracy
- No caching needed (check-ins are infrequent per member)
- Total check-in API response time still <2s target

## Dependencies

### Blocks
- [[STORY-002]] - Streak Calculation Engine (depends on reliable custom field updates)
- [[STORY-004]] - Circle.so Custom Field Integration (builds on this fix)
- [[STORY-006]] - Enhanced Check-in Response Messaging (needs accurate counts)

### Blocked By
- None - can start immediately

### Related
- [[STORY-008]] - Comprehensive Testing (will include tests for this fix)

## Out of Scope

**Explicitly NOT included in this story**:
- Historical data correction (backfilling incorrect counts) - defer to future cleanup Epic
- Automatic detection of incorrect counts - focus on fixing forward-going behavior
- Custom field creation in Circle.so - must be done manually before deployment
- Race condition prevention (atomic increment) - Circle.so API doesn't support this
- Retry logic beyond one retry - keep simple for MVP
- Alternative storage fallback (Airtable-only mode) - defer to story about dual storage

## Notes

**Bug Discovery**: Identified during Epic planning by examining `incrementCheckinCount` function. The function signature accepts `currentCount` but never actually fetches the real current value from Circle.so.

**Why This Wasn't Caught Earlier**:
- Limited test coverage on Circle.so integration
- Manual testing may have only tested single check-ins (always showed "1")
- No assertions verifying count increments correctly

**Deployment Strategy**:
1. Deploy fix to staging environment
2. Test with real Circle.so test community
3. Verify count increments correctly across multiple check-ins
4. Monitor Netlify function logs for errors
5. Deploy to production during low-traffic period
6. Monitor for 24 hours post-deployment

**Manual Setup Required** (before testing):
- Ensure `checkinCount` custom field exists in Circle.so community settings
- Field type: Number
- Default value: 0 (recommended but not required)
- See `CIRCLE_PERMISSIONS.md` for API token permissions

**Testing Notes**:
- Use `debug: "1"` flag for test check-ins
- Test with same attendee email, different dates (to avoid dedup blocking)
- Verify in Circle.so admin panel that count increments after each check-in
- Check Netlify function logs for "current value" and "new value" log messages

**Follow-up Work** (separate stories/epics):
- Historical backfill: Calculate correct counts from Airtable check-in history
- Data validation: Compare Circle.so counts vs Airtable counts for discrepancies
- Atomic increment: If Circle.so adds API support, migrate to atomic operations

---

**Next Steps**: This Story is READY for task breakdown. Start with task-planner agent to create implementation tasks following test-driven development (TDD) approach: write tests first, then implementation.

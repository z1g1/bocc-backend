# Tasks for STORY-001: Fix Visit Count Bug

**Story**: [[STORY-001]] - Fix Visit Count Bug
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: CRITICAL - START HERE
**Total Tasks**: 7
**Estimated Time**: 4-6 hours

## Overview

Fix the production bug where `incrementCheckinCount` always resets count to 1 instead of incrementing. This requires adding a GET function to fetch current value before increment, then modifying the increment logic to use the fetched value.

## Task Execution Order

### Phase 1: Test Setup (TDD Red Phase)
- [[TASK-001]] - Write unit tests for getMemberCustomField
- [[TASK-002]] - Write unit tests for fixed incrementCheckinCount

### Phase 2: Implementation (TDD Green Phase)
- [[TASK-003]] - Implement getMemberCustomField function
- [[TASK-004]] - Fix incrementCheckinCount to fetch before update

### Phase 3: Integration & Validation
- [[TASK-005]] - Expand Circle.so test coverage
- [[TASK-006]] - Update smoke test to verify increment
- [[TASK-007]] - Manual testing and deployment verification

## Tasks

---

### TASK-001: Write unit tests for getMemberCustomField

**Type**: Test
**Estimated Time**: 1 hour
**Dependencies**: None - START HERE
**Files**: `tests/circle.test.js`

**Objective**: Write failing unit tests for the new `getMemberCustomField` function that will fetch custom field values from Circle.so member profiles.

**Test Specifications**:

```javascript
describe('getMemberCustomField', () => {
  test('fetches custom field value successfully', async () => {
    // Mock axios GET response with custom field
    const mockResponse = {
      data: {
        id: '12345',
        custom_fields: {
          checkinCount: 5
        }
      }
    };

    const result = await getMemberCustomField('12345', 'checkinCount');
    expect(result).toBe(5);
  });

  test('returns null when custom field does not exist', async () => {
    // Mock response with empty custom_fields
    const mockResponse = {
      data: {
        id: '12345',
        custom_fields: {}
      }
    };

    const result = await getMemberCustomField('12345', 'checkinCount');
    expect(result).toBeNull();
  });

  test('returns null when member has no custom_fields object', async () => {
    // Mock response without custom_fields
    const mockResponse = {
      data: {
        id: '12345'
      }
    };

    const result = await getMemberCustomField('12345', 'checkinCount');
    expect(result).toBeNull();
  });

  test('throws error when Circle.so API fails', async () => {
    // Mock axios GET rejection
    await expect(getMemberCustomField('12345', 'checkinCount'))
      .rejects.toThrow();
  });
});
```

**Definition of Done**:
- [ ] Test file contains 4 tests for getMemberCustomField
- [ ] Tests use proper mocking of axios GET calls
- [ ] Tests verify all edge cases (exists, missing, error)
- [ ] Tests fail when run (function not implemented yet)
- [ ] Code follows existing test patterns in circle.test.js

---

### TASK-002: Write unit tests for fixed incrementCheckinCount

**Type**: Test
**Estimated Time**: 1 hour
**Dependencies**: TASK-001
**Files**: `tests/circle.test.js`

**Objective**: Write failing unit tests for the bug-fixed `incrementCheckinCount` function that fetches current value before incrementing.

**Test Specifications**:

```javascript
describe('incrementCheckinCount (bug fix)', () => {
  test('increments from existing value', async () => {
    // Mock getMemberCustomField returning 5
    // Mock updateMemberCustomField

    await incrementCheckinCount('member123');

    // Verify getMemberCustomField was called
    expect(getMemberCustomField).toHaveBeenCalledWith('member123', 'checkinCount');
    // Verify updateMemberCustomField called with 6 (5 + 1)
    expect(updateMemberCustomField).toHaveBeenCalledWith('member123', 'checkinCount', 6);
  });

  test('starts at 1 when current value is null (new member)', async () => {
    // Mock getMemberCustomField returning null

    await incrementCheckinCount('member123');

    // Verify updateMemberCustomField called with 1
    expect(updateMemberCustomField).toHaveBeenCalledWith('member123', 'checkinCount', 1);
  });

  test('starts at 1 when current value is undefined', async () => {
    // Mock getMemberCustomField returning undefined

    await incrementCheckinCount('member123');

    expect(updateMemberCustomField).toHaveBeenCalledWith('member123', 'checkinCount', 1);
  });

  test('logs current and new values for audit trail', async () => {
    // Mock console.log
    // Mock getMemberCustomField returning 10

    await incrementCheckinCount('member123');

    // Verify console.log called with current and new values
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('10'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('11'));
  });

  test('handles API errors gracefully', async () => {
    // Mock getMemberCustomField throwing error

    // Should not throw (graceful degradation)
    await expect(incrementCheckinCount('member123')).resolves.not.toThrow();
  });
});
```

**Definition of Done**:
- [ ] Test file contains 5 tests for incrementCheckinCount
- [ ] Tests verify fetching before increment
- [ ] Tests verify null/undefined handling (default to 0)
- [ ] Tests verify logging for audit trail
- [ ] Tests fail when run (function not fixed yet)

---

### TASK-003: Implement getMemberCustomField function

**Type**: Implementation
**Estimated Time**: 1 hour
**Dependencies**: TASK-001 (tests written)
**Files**: `netlify/functions/utils/circle.js`

**Objective**: Implement the new `getMemberCustomField` function to fetch custom field values from Circle.so member profiles.

**Implementation**:

```javascript
/**
 * Get a custom field value from a Circle.so member profile
 * @param {string|number} memberId - Circle member ID
 * @param {string} fieldName - Custom field name (e.g., 'checkinCount')
 * @returns {Promise<number|string|null>} Field value or null if not found
 */
async function getMemberCustomField(memberId, fieldName) {
  try {
    console.log(`Fetching custom field '${fieldName}' for member:`, memberId);

    const response = await circleApi.get(`/community_members/${memberId}`);

    const customFields = response.data.custom_fields || {};
    const fieldValue = customFields[fieldName];

    if (fieldValue !== undefined && fieldValue !== null) {
      console.log(`Current ${fieldName}:`, fieldValue);
      return fieldValue;
    }

    console.log(`Custom field '${fieldName}' not found, returning null`);
    return null;
  } catch (error) {
    console.error(`Error fetching custom field '${fieldName}':`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}
```

**Definition of Done**:
- [ ] Function added to netlify/functions/utils/circle.js
- [ ] Function exported in module.exports
- [ ] Uses existing circleApi axios instance
- [ ] Handles missing custom_fields gracefully (returns null)
- [ ] Includes comprehensive logging
- [ ] Tests from TASK-001 now pass
- [ ] No linting errors

---

### TASK-004: Fix incrementCheckinCount to fetch before update

**Type**: Implementation
**Estimated Time**: 1 hour
**Dependencies**: TASK-002 (tests written), TASK-003 (getMemberCustomField exists)
**Files**: `netlify/functions/utils/circle.js`

**Objective**: Modify `incrementCheckinCount` to fetch current value using `getMemberCustomField` before incrementing.

**Implementation**:

```javascript
/**
 * Increment check-in count for a member (BUG FIXED: now fetches current value first)
 * @param {string|number} memberId - Circle member ID
 * @returns {Promise<void>}
 */
async function incrementCheckinCount(memberId) {
  try {
    // BUG FIX: Fetch current value from Circle.so
    const currentCount = await getMemberCustomField(memberId, 'checkinCount');

    // Default to 0 if field doesn't exist (new member)
    const currentValue = currentCount || 0;
    const newValue = currentValue + 1;

    console.log(`Incrementing checkinCount for member ${memberId}: ${currentValue} → ${newValue}`);

    // Update with new value
    await updateMemberCustomField(memberId, 'checkinCount', newValue);

    console.log(`Successfully incremented checkinCount to ${newValue}`);
  } catch (error) {
    console.error('Error incrementing check-in count:', error.message);
    // Don't throw - allow check-in to continue even if Circle.so fails
  }
}
```

**Definition of Done**:
- [ ] incrementCheckinCount calls getMemberCustomField first
- [ ] Handles null/undefined by defaulting to 0
- [ ] Calculates newValue = currentValue + 1
- [ ] Logs both current and new values (audit trail)
- [ ] Error handling doesn't throw (graceful degradation)
- [ ] Tests from TASK-002 now pass
- [ ] All existing circle.test.js tests still pass

---

### TASK-005: Expand Circle.so test coverage

**Type**: Test
**Estimated Time**: 30 minutes
**Dependencies**: TASK-003, TASK-004 (implementation complete)
**Files**: `tests/circle.test.js`

**Objective**: Add integration-style tests that verify the complete flow of fetching and incrementing.

**Additional Tests**:

```javascript
describe('Circle.so Integration: Visit Count Fix', () => {
  test('complete increment flow for existing member', async () => {
    // Mock getMemberCustomField to return 42
    // Mock updateMemberCustomField

    await incrementCheckinCount('member123');

    expect(getMemberCustomField).toHaveBeenCalledWith('member123', 'checkinCount');
    expect(updateMemberCustomField).toHaveBeenCalledWith('member123', 'checkinCount', 43);
  });

  test('handles concurrent increments correctly (last-write-wins)', async () => {
    // Document that race conditions are acceptable for MVP
    // Test that each call fetches fresh value
  });
});
```

**Definition of Done**:
- [ ] 2+ integration-style tests added
- [ ] Tests verify complete fetch-increment-update flow
- [ ] All tests pass
- [ ] Test coverage > 90% for circle.js bug fix code

---

### TASK-006: Update smoke test to verify increment

**Type**: Test
**Estimated Time**: 30 minutes
**Dependencies**: TASK-004 (implementation complete)
**Files**: `tests/smoke-test.sh`

**Objective**: Add smoke test scenario that verifies check-in count increments correctly across multiple check-ins.

**Smoke Test Enhancement**:

```bash
# Test: Visit count increments correctly
echo "Testing visit count increment bug fix..."

# First check-in (should be count = 1)
response1=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest+increment@example.com",
    "name": "Increment Test User",
    "eventId": "bocc",
    "debug": "1",
    "token": "test-token"
  }')

echo "First check-in response: $response1"

# Wait for different day (to avoid dedup)
# Note: In smoke test, use different token or manually verify in Circle.so

# Second check-in next week (should be count = 2)
# Manually verify in Circle.so admin that checkinCount = 2 (not 1)

echo "MANUAL VERIFICATION REQUIRED:"
echo "1. Check Circle.so member profile for smoketest+increment@example.com"
echo "2. Verify checkinCount = 1 after first check-in"
echo "3. Run second check-in (different day/token)"
echo "4. Verify checkinCount = 2 (not 1 - proving bug is fixed)"
```

**Definition of Done**:
- [ ] Smoke test includes visit count increment scenario
- [ ] Documents manual verification steps
- [ ] Includes clear instructions for testing in staging
- [ ] Script runs without errors

---

### TASK-007: Manual testing and deployment verification

**Type**: Validation
**Estimated Time**: 1 hour
**Dependencies**: ALL previous tasks
**Files**: N/A (manual testing in staging/production)

**Objective**: Manually verify the bug fix in staging environment before production deployment.

**Manual Testing Checklist**:

1. **Deploy to Staging**:
   - [ ] Push changes to dev branch
   - [ ] Verify all unit tests pass locally
   - [ ] Verify all smoke tests pass locally
   - [ ] Deploy to staging

2. **Test in Staging Circle.so**:
   - [ ] Create test member in staging Circle.so
   - [ ] Check-in #1 via API (debug mode)
   - [ ] Verify checkinCount = 1 in Circle.so admin
   - [ ] Check-in #2 via API (next day/different token)
   - [ ] Verify checkinCount = 2 (NOT 1 - bug fixed!)
   - [ ] Check-in #3 via API
   - [ ] Verify checkinCount = 3

3. **Monitor Netlify Logs**:
   - [ ] Check logs for "Incrementing checkinCount: X → Y" messages
   - [ ] Verify no error messages
   - [ ] Confirm both current and new values are logged

4. **Production Deployment** (after staging validation):
   - [ ] Merge to main branch
   - [ ] Deploy to production
   - [ ] Monitor production logs for first 24 hours
   - [ ] Verify no increase in error rates

**Definition of Done**:
- [ ] All manual tests pass in staging
- [ ] Logs show correct increment behavior
- [ ] Circle.so custom field increments verified
- [ ] Deployed to production successfully
- [ ] No production errors observed (24hr monitoring)

---

## Summary

**Total Tasks**: 7
**Critical Path**: TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-007
**Parallel Work**: TASK-005 and TASK-006 can be done after TASK-004

**Estimated Timeline**:
- Phase 1 (Tests): 2 hours
- Phase 2 (Implementation): 2 hours
- Phase 3 (Validation): 2 hours
- **Total**: 4-6 hours

**Success Criteria**:
- All unit tests pass (143+ existing tests + new tests)
- Smoke tests verify increment behavior
- Manual testing confirms bug is fixed
- Production deployment succeeds without errors
- Visit counts in Circle.so increment correctly (verified in admin panel)

**Next Steps After Completion**:
This is a BLOCKER for all other stories. Once complete and deployed, proceed to:
1. STORY-007 (Timezone Handling) - can start immediately
2. STORY-003 (Grace Dates) - can parallel with STORY-007
3. STORY-002 (Streak Calculation) - depends on this being fixed

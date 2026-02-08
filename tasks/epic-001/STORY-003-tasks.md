# Tasks for STORY-003: Grace Date Management

**Story**: [[STORY-003]] - Grace Date Management
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: Medium (Can parallel with STORY-007)
**Total Tasks**: 10
**Estimated Time**: 6-8 hours

## Overview

Create infrastructure for managing grace dates (declared holidays/exceptions) in Airtable. Grace dates allow admins to declare specific Tuesdays as "excused absences" that don't break streaks. Implements query functions with per-request caching.

## Task Execution Order

### Phase 1: Airtable Setup
- [[TASK-016]] - Create grace_dates table in Airtable (MANUAL)

### Phase 2: Test First (TDD Red Phase)
- [[TASK-017]] - Write unit tests for grace date query
- [[TASK-018]] - Write unit tests for cache mechanism
- [[TASK-019]] - Write unit tests for helper functions

### Phase 3: Implementation (TDD Green Phase)
- [[TASK-020]] - Implement grace date query function
- [[TASK-021]] - Implement cache mechanism
- [[TASK-022]] - Implement helper functions

### Phase 4: Integration & Documentation
- [[TASK-023]] - Add grace date support to Airtable utils
- [[TASK-024]] - Create admin documentation for adding grace dates
- [[TASK-025]] - Integration testing with real Airtable

## Tasks

---

### TASK-016: Create grace_dates table in Airtable

**Type**: Setup (MANUAL)
**Estimated Time**: 30 minutes
**Dependencies**: None
**Files**: N/A (Airtable UI)

**Objective**: Manually create the `grace_dates` table in Airtable base with proper schema.

**Manual Steps**:

1. **Open Airtable Base**:
   - Navigate to BOCC Airtable base
   - Click "Add or import" → "Create new table"
   - Name: `grace_dates`

2. **Add Fields**:
   - `id` (Auto Number) - Created automatically
   - `date` (Date) - Single line, format: Local, no time
   - `eventId` (Single Line Text) - For filtering by event type
   - `reason` (Long Text) - Why this date is a grace date
   - `createdAt` (Created time) - Auto-populated timestamp

3. **Add Sample Data** (for testing):
   ```
   Record 1:
   date: 2025-12-23 (Tuesday)
   eventId: bocc
   reason: Week before Christmas - community break

   Record 2:
   date: 2025-12-30 (Tuesday)
   eventId: bocc
   reason: Between holidays - office closed
   ```

4. **Create Views**:
   - **All Grace Dates**: Default view, sort by date descending
   - **BOCC Events**: Filter eventId = "bocc"
   - **Upcoming**: Filter date >= TODAY(), sort by date ascending

5. **Verify Table Structure**:
   - Check that all fields exist
   - Verify sample records display correctly
   - Test filtering by eventId

**Definition of Done**:
- [ ] grace_dates table exists in Airtable
- [ ] All required fields created (id, date, eventId, reason, createdAt)
- [ ] 2+ sample records added for testing
- [ ] Views created for admin convenience
- [ ] Table structure verified
- [ ] Screenshot of table saved (for documentation)

---

### TASK-017: Write unit tests for grace date query

**Type**: Test
**Estimated Time**: 1 hour
**Dependencies**: TASK-016 (table exists)
**Files**: `tests/graceDates.test.js` (new file)

**Objective**: Write failing tests for grace date query functionality.

**Test Specifications**:

```javascript
const { getGraceDates, clearGraceDateCache } = require('../netlify/functions/utils/graceDates');

describe('Grace Date Query', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearGraceDateCache();
    jest.clearAllMocks();
  });

  test('queries grace dates for specific eventId', async () => {
    // Mock Airtable response
    const mockRecords = [
      {
        id: 'rec123',
        get: jest.fn((field) => {
          if (field === 'date') return '2025-12-23';
          if (field === 'eventId') return 'bocc';
          if (field === 'reason') return 'Christmas week';
        })
      }
    ];

    // Mock base().select().all()
    const result = await getGraceDates('bocc');

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('date');
  });

  test('returns empty array when no grace dates found', async () => {
    // Mock empty Airtable response
    const result = await getGraceDates('nonexistent-event');

    expect(result).toEqual([]);
  });

  test('filters by eventId correctly', async () => {
    // Mock multiple records (bocc and codeCoffee)
    const result = await getGraceDates('bocc');

    // Verify all returned records have eventId === 'bocc'
    result.forEach(record => {
      expect(record.eventId).toBe('bocc');
    });
  });

  test('returns dates in ISO 8601 format', async () => {
    const result = await getGraceDates('bocc');

    if (result.length > 0) {
      expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('handles Airtable API errors gracefully', async () => {
    // Mock Airtable throwing error

    const result = await getGraceDates('bocc');

    // Should return empty array, not throw
    expect(result).toEqual([]);
  });

  test('validates eventId parameter', async () => {
    // Test with invalid eventId
    await expect(getGraceDates('invalid<script>')).rejects.toThrow();
  });
});
```

**Definition of Done**:
- [ ] Test file created: tests/graceDates.test.js
- [ ] 6+ tests for grace date queries
- [ ] Tests mock Airtable API responses
- [ ] Tests verify filtering and error handling
- [ ] Tests fail when run (functions not implemented)

---

### TASK-018: Write unit tests for cache mechanism

**Type**: Test
**Estimated Time**: 45 minutes
**Dependencies**: TASK-016
**Files**: `tests/graceDates.test.js`

**Objective**: Write tests for per-request caching of grace dates.

**Test Specifications**:

```javascript
describe('Grace Date Caching', () => {
  beforeEach(() => {
    clearGraceDateCache();
    jest.clearAllMocks();
  });

  test('caches grace dates after first query', async () => {
    // Mock Airtable
    const mockSelect = jest.fn();

    // First call
    await getGraceDates('bocc');
    const firstCallCount = mockSelect.mock.calls.length;

    // Second call (should use cache)
    await getGraceDates('bocc');
    const secondCallCount = mockSelect.mock.calls.length;

    // Verify Airtable only called once
    expect(secondCallCount).toBe(firstCallCount);
  });

  test('separate cache per eventId', async () => {
    // Query for bocc
    await getGraceDates('bocc');

    // Query for codeCoffee (should query Airtable again)
    await getGraceDates('codeCoffee');

    // Verify both eventIds have separate cache entries
  });

  test('clearGraceDateCache resets cache', async () => {
    // First query (populates cache)
    await getGraceDates('bocc');

    // Clear cache
    clearGraceDateCache();

    // Second query (should query Airtable again)
    await getGraceDates('bocc');

    // Verify Airtable queried twice
  });

  test('cache is module-level (shared across calls)', async () => {
    // Call from one context
    const result1 = await getGraceDates('bocc');

    // Call from another context (same process)
    const result2 = await getGraceDates('bocc');

    // Both should return same data (cached)
    expect(result1).toEqual(result2);
  });
});
```

**Definition of Done**:
- [ ] 4+ tests for cache mechanism
- [ ] Tests verify cache hit/miss behavior
- [ ] Tests verify separate cache per eventId
- [ ] Tests verify clearCache functionality
- [ ] Tests fail when run (cache not implemented)

---

### TASK-019: Write unit tests for helper functions

**Type**: Test
**Estimated Time**: 30 minutes
**Dependencies**: TASK-016
**Files**: `tests/graceDates.test.js`

**Objective**: Write tests for helper functions (isGraceDate, etc.).

**Test Specifications**:

```javascript
const { isGraceDate } = require('../netlify/functions/utils/graceDates');

describe('Grace Date Helpers', () => {
  test('isGraceDate returns true for grace date', () => {
    const graceDates = [
      { date: '2025-12-23', eventId: 'bocc' },
      { date: '2025-12-30', eventId: 'bocc' }
    ];

    const result = isGraceDate('2025-12-23', graceDates);
    expect(result).toBe(true);
  });

  test('isGraceDate returns false for non-grace date', () => {
    const graceDates = [
      { date: '2025-12-23', eventId: 'bocc' }
    ];

    const result = isGraceDate('2025-12-17', graceDates);
    expect(result).toBe(false);
  });

  test('isGraceDate handles empty grace dates array', () => {
    const result = isGraceDate('2025-12-23', []);
    expect(result).toBe(false);
  });

  test('isGraceDate handles Date objects', () => {
    const graceDates = [
      { date: '2025-12-23', eventId: 'bocc' }
    ];

    const result = isGraceDate(new Date('2025-12-23'), graceDates);
    expect(result).toBe(true);
  });
});
```

**Definition of Done**:
- [ ] 4+ tests for helper functions
- [ ] Tests verify isGraceDate logic
- [ ] Tests handle various input formats
- [ ] Tests fail when run (helpers not implemented)

---

### TASK-020: Implement grace date query function

**Type**: Implementation
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-017 (tests written)
**Files**: `netlify/functions/utils/graceDates.js` (new file)

**Objective**: Implement `getGraceDates` function that queries Airtable and returns grace dates.

**Implementation**:

```javascript
const { base } = require('./airtable');
const { escapeAirtableFormula } = require('./validation');

// Module-level cache (per-request)
let graceDateCache = null;

/**
 * Query grace dates from Airtable for a specific event
 * Results are cached per-request to avoid duplicate queries
 * @param {string} eventId - Event identifier (e.g., 'bocc')
 * @returns {Promise<Array>} Array of grace date objects
 */
async function getGraceDates(eventId) {
  // Validate eventId
  if (!eventId || typeof eventId !== 'string') {
    throw new Error('Invalid eventId parameter');
  }

  // Sanitize eventId for Airtable formula
  const sanitizedEventId = escapeAirtableFormula(eventId);

  // Check cache first
  if (graceDateCache && graceDateCache[eventId]) {
    console.log('Returning cached grace dates for:', eventId);
    return graceDateCache[eventId];
  }

  try {
    console.log('Querying grace dates from Airtable for:', eventId);

    // Query Airtable (limit to ±1 year from today for performance)
    const formula = `AND(
      {eventId} = '${sanitizedEventId}',
      {date} >= DATEADD(TODAY(), -365, 'days'),
      {date} <= DATEADD(TODAY(), 365, 'days')
    )`;

    const records = await base('grace_dates').select({
      filterByFormula: formula,
      sort: [{ field: 'date', direction: 'asc' }]
    }).all();

    // Map records to grace date objects
    const graceDates = records.map(record => ({
      id: record.id,
      date: record.get('date'),
      eventId: record.get('eventId'),
      reason: record.get('reason')
    }));

    console.log(`Found ${graceDates.length} grace dates for ${eventId}`);

    // Cache results
    if (!graceDateCache) graceDateCache = {};
    graceDateCache[eventId] = graceDates;

    return graceDates;
  } catch (error) {
    console.error('Error querying grace dates:', error.message);
    if (error.message.includes('Could not find table')) {
      console.error('grace_dates table does not exist in Airtable');
    }
    // Return empty array on error (graceful degradation)
    return [];
  }
}

module.exports = {
  getGraceDates
};
```

**Definition of Done**:
- [ ] File created: netlify/functions/utils/graceDates.js
- [ ] getGraceDates function implemented
- [ ] Uses existing Airtable base instance
- [ ] Queries filtered by eventId
- [ ] Returns array of grace date objects
- [ ] Error handling (returns empty array on failure)
- [ ] Tests from TASK-017 now pass

---

### TASK-021: Implement cache mechanism

**Type**: Implementation
**Estimated Time**: 45 minutes
**Dependencies**: TASK-018 (tests written), TASK-020 (query exists)
**Files**: `netlify/functions/utils/graceDates.js`

**Objective**: Add cache logic to avoid duplicate Airtable queries within same request.

**Implementation**:

```javascript
/**
 * Clear grace date cache
 * Should be called at start of each check-in request
 */
function clearGraceDateCache() {
  graceDateCache = null;
  console.log('Grace date cache cleared');
}

// Export cache control function
module.exports = {
  getGraceDates,
  clearGraceDateCache
};
```

**Integration in checkin.js**:

```javascript
// At start of check-in handler
const { clearGraceDateCache } = require('./utils/graceDates');

exports.handler = async (event) => {
  // Clear grace date cache for this request
  clearGraceDateCache();

  // ... rest of check-in logic
};
```

**Definition of Done**:
- [ ] clearGraceDateCache function implemented
- [ ] Function exported in module.exports
- [ ] Cache is module-level (shared across calls in same request)
- [ ] Cache cleared at start of each check-in
- [ ] Tests from TASK-018 now pass

---

### TASK-022: Implement helper functions

**Type**: Implementation
**Estimated Time**: 30 minutes
**Dependencies**: TASK-019 (tests written), TASK-020 (query exists)
**Files**: `netlify/functions/utils/graceDates.js`

**Objective**: Implement helper functions for working with grace dates.

**Implementation**:

```javascript
const { formatDateISO } = require('./streaks');  // If STORY-007 complete

/**
 * Check if a specific date is a grace date
 * @param {Date|string} date - Date to check (Date object or YYYY-MM-DD string)
 * @param {Array} graceDates - Array of grace date objects
 * @returns {boolean} True if date is in grace dates
 */
function isGraceDate(date, graceDates) {
  if (!graceDates || graceDates.length === 0) {
    return false;
  }

  // Normalize date to YYYY-MM-DD string
  let dateStr;
  if (date instanceof Date) {
    dateStr = formatDateISO(date);  // Use timezone utility if available
  } else if (typeof date === 'string') {
    dateStr = date;
  } else {
    return false;
  }

  // Check if date exists in grace dates array
  return graceDates.some(graceDate => graceDate.date === dateStr);
}

module.exports = {
  getGraceDates,
  clearGraceDateCache,
  isGraceDate
};
```

**Definition of Done**:
- [ ] isGraceDate function implemented
- [ ] Handles Date objects and strings
- [ ] Function exported in module.exports
- [ ] Tests from TASK-019 now pass

---

### TASK-023: Add grace date support to Airtable utils

**Type**: Integration
**Estimated Time**: 30 minutes
**Dependencies**: TASK-020, TASK-021, TASK-022 (all functions implemented)
**Files**: `netlify/functions/utils/airtable.js`

**Objective**: Ensure Airtable module properly references grace_dates table.

**Implementation Notes**:

- Grace dates are queried via separate graceDates.js module
- No changes needed to airtable.js unless consolidating
- Verify base('grace_dates') works with existing Airtable config

**Validation Steps**:

```javascript
// Test in Node.js REPL or test script
const { base } = require('./netlify/functions/utils/airtable');

// Verify grace_dates table is accessible
base('grace_dates').select({ maxRecords: 1 }).firstPage()
  .then(records => console.log('Grace dates accessible:', records.length))
  .catch(err => console.error('Error:', err.message));
```

**Definition of Done**:
- [ ] Verified base('grace_dates') works
- [ ] No conflicts with existing Airtable code
- [ ] Grace dates module uses existing base instance
- [ ] All Airtable tests still pass

---

### TASK-024: Create admin documentation for adding grace dates

**Type**: Documentation
**Estimated Time**: 45 minutes
**Dependencies**: TASK-016 (table created)
**Files**: `docs/grace-dates-admin-guide.md` (new file)

**Objective**: Document how admins should add and manage grace dates in Airtable.

**Documentation Content**:

```markdown
# Grace Dates Admin Guide

## What are Grace Dates?

Grace dates are declared holidays or exceptions where BOCC does not meet. Members who miss these dates will NOT have their attendance streak broken.

## When to Add Grace Dates

Add grace dates for:
- Holiday weeks (Christmas, New Year's, Thanksgiving)
- Planned community breaks (summer break, winter break)
- Event cancellations (weather, venue issues)

## How to Add a Grace Date

1. **Open Airtable**:
   - Navigate to BOCC Airtable base
   - Open `grace_dates` table

2. **Add New Record**:
   - Click "+ New record" button
   - Fill in fields:
     - **date**: Select the Tuesday date (use calendar picker)
     - **eventId**: Enter "bocc" (or other event type)
     - **reason**: Brief explanation (e.g., "Christmas week - office closed")
   - Click Save (createdAt auto-populates)

3. **Verify**:
   - Check that date appears in "Upcoming" view
   - Verify eventId is correct

## Examples

```
date: 2025-12-23
eventId: bocc
reason: Week before Christmas

date: 2025-12-30
eventId: bocc
reason: Between holidays

date: 2026-07-07
eventId: bocc
reason: Summer break week 1
```

## Best Practices

- Add grace dates BEFORE the date occurs (so members know in advance)
- Be consistent with reasons (helps with reporting)
- Don't delete grace dates (historical record is useful)
- Use views to filter by upcoming vs past grace dates

## Troubleshooting

**Q: Grace date not preventing streak break?**
A: Verify eventId matches exactly (case-sensitive)

**Q: Can I add grace dates retroactively?**
A: Yes, but requires manual streak correction for affected members

**Q: How far in advance should I add grace dates?**
A: Add at least 1 week before, ideally at start of year for known holidays
```

**Definition of Done**:
- [ ] Documentation file created
- [ ] Includes step-by-step instructions
- [ ] Includes examples
- [ ] Includes troubleshooting section
- [ ] Added to project README or docs/ directory

---

### TASK-025: Integration testing with real Airtable

**Type**: Integration Test
**Estimated Time**: 1 hour
**Dependencies**: ALL previous tasks
**Files**: `tests/graceDates.test.js`, manual testing

**Objective**: Verify grace dates work end-to-end with real Airtable base.

**Integration Test Steps**:

1. **Staging Environment Test**:
```javascript
describe('Grace Dates Integration (staging)', () => {
  test('queries real grace dates from Airtable', async () => {
    // This test requires staging Airtable base with grace_dates table
    const graceDates = await getGraceDates('bocc');

    expect(graceDates).toBeInstanceOf(Array);
    // Should return sample grace dates added in TASK-016
  });
});
```

2. **Manual Verification**:
   - Add grace date via Airtable UI: 2026-02-10 (bocc)
   - Query via API: `getGraceDates('bocc')`
   - Verify returned array includes new grace date
   - Check cache: second query should not hit Airtable

3. **Cache Verification**:
   - First query: log shows "Querying grace dates from Airtable"
   - Second query: log shows "Returning cached grace dates"
   - Clear cache: `clearGraceDateCache()`
   - Third query: log shows "Querying" again

4. **Error Handling Verification**:
   - Test with invalid eventId (should return empty array)
   - Test with Airtable API key removed (should return empty array, log error)

**Definition of Done**:
- [ ] Integration test passes with real Airtable
- [ ] Manual verification completed
- [ ] Cache behavior verified via logs
- [ ] Error handling verified
- [ ] Documentation updated with integration test notes

---

## Summary

**Total Tasks**: 10
**Critical Path**: TASK-016 → TASK-017/018/019 → TASK-020/021/022 → TASK-025

**Estimated Timeline**:
- Phase 1 (Setup): 30 minutes
- Phase 2 (Tests): 2.25 hours
- Phase 3 (Implementation): 2.75 hours
- Phase 4 (Integration): 2.25 hours
- **Total**: 6-8 hours

**Success Criteria**:
- grace_dates table created in Airtable
- All unit tests pass (15+ tests)
- Integration tests verify real Airtable queries
- Cache mechanism works correctly
- Admin documentation complete
- Grace dates ready for consumption by STORY-002

**Integration Points**:
- STORY-002 (Streak Calculation) will use getGraceDates and isGraceDate
- Check-in handler will call clearGraceDateCache at request start
- Admin uses Airtable UI directly (no API needed)

**Next Steps After Completion**:
Grace dates are ready to be consumed by STORY-002 (Streak Calculation Engine). This story can be developed in parallel with STORY-007 (Timezone Handling) as they are independent.

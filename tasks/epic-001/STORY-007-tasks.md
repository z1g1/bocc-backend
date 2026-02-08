# Tasks for STORY-007: Timezone Handling

**Story**: [[STORY-007]] - Timezone Handling
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: High (Foundation for Streak Calculation)
**Total Tasks**: 8
**Estimated Time**: 6-8 hours

## Overview

Implement timezone utilities to ensure all date/time calculations use Buffalo timezone (America/New_York) with proper DST handling. This is critical for accurate Tuesday detection and week boundary calculations for streak tracking.

## Task Execution Order

### Phase 1: Setup
- [[TASK-008]] - Install date-fns dependencies

### Phase 2: Test First (TDD Red Phase)
- [[TASK-009]] - Write unit tests for timezone conversion functions
- [[TASK-010]] - Write unit tests for week boundary logic
- [[TASK-011]] - Write unit tests for DST transitions

### Phase 3: Implementation (TDD Green Phase)
- [[TASK-012]] - Implement core timezone conversion utilities
- [[TASK-013]] - Implement week boundary functions
- [[TASK-014]] - Implement date formatting utilities

### Phase 4: Validation
- [[TASK-015]] - Verify DST edge cases and refine

## Tasks

---

### TASK-008: Install date-fns dependencies

**Type**: Setup
**Estimated Time**: 15 minutes
**Dependencies**: None
**Files**: `package.json`

**Objective**: Add date-fns and date-fns-tz libraries to project dependencies.

**Implementation Steps**:

1. Install dependencies:
```bash
npm install date-fns@^2.30.0 date-fns-tz@^2.0.0
```

2. Verify installation:
```bash
npm list date-fns date-fns-tz
```

3. Commit package.json and package-lock.json

**Definition of Done**:
- [ ] date-fns added to package.json dependencies
- [ ] date-fns-tz added to package.json dependencies
- [ ] package-lock.json updated
- [ ] Libraries install successfully (no errors)
- [ ] Committed to git

---

### TASK-009: Write unit tests for timezone conversion functions

**Type**: Test
**Estimated Time**: 1 hour
**Dependencies**: TASK-008
**Files**: `tests/streaks.test.js` (new file)

**Objective**: Write failing tests for core timezone conversion utilities.

**Test Specifications**:

```javascript
const { toBuffaloTime, getBuffaloDate, formatDateISO } = require('../netlify/functions/utils/streaks');

describe('Timezone Conversion', () => {
  test('converts UTC to Buffalo time (EST winter)', () => {
    // January 15, 2026 at 5:00 AM UTC = Midnight Buffalo time (EST = UTC-5)
    const utcDate = new Date('2026-01-15T05:00:00Z');
    const buffaloDate = toBuffaloTime(utcDate);

    expect(buffaloDate.getHours()).toBe(0);  // Midnight
    expect(buffaloDate.getDate()).toBe(15);
  });

  test('converts UTC to Buffalo time (EDT summer)', () => {
    // July 15, 2026 at 4:00 AM UTC = Midnight Buffalo time (EDT = UTC-4)
    const utcDate = new Date('2026-07-15T04:00:00Z');
    const buffaloDate = toBuffaloTime(utcDate);

    expect(buffaloDate.getHours()).toBe(0);  // Midnight
    expect(buffaloDate.getDate()).toBe(15);
  });

  test('getBuffaloDate returns current time in Buffalo timezone', () => {
    const buffaloDate = getBuffaloDate();
    expect(buffaloDate).toBeInstanceOf(Date);
  });

  test('formatDateISO returns YYYY-MM-DD format', () => {
    const date = new Date('2026-02-07T15:30:00Z');
    const formatted = formatDateISO(date);

    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatted).toBe('2026-02-07');
  });

  test('handles string date input (ISO 8601)', () => {
    const isoString = '2026-02-07T10:30:00Z';
    const buffaloDate = toBuffaloTime(isoString);

    expect(buffaloDate).toBeInstanceOf(Date);
  });

  test('throws error for invalid date input', () => {
    expect(() => toBuffaloTime('invalid-date')).toThrow();
  });
});
```

**Definition of Done**:
- [ ] Test file created: tests/streaks.test.js
- [ ] 6+ tests for timezone conversion utilities
- [ ] Tests cover EST and EDT seasons
- [ ] Tests verify error handling
- [ ] Tests fail when run (functions not implemented)

---

### TASK-010: Write unit tests for week boundary logic

**Type**: Test
**Estimated Time**: 1 hour
**Dependencies**: TASK-008
**Files**: `tests/streaks.test.js`

**Objective**: Write tests for Tuesday-based week boundary detection.

**Test Specifications**:

```javascript
describe('Week Boundary Logic', () => {
  test('identifies same Tuesday correctly', () => {
    const tuesday1 = new Date('2026-02-03T10:00:00Z');  // Tuesday morning
    const tuesday2 = new Date('2026-02-03T23:00:00Z');  // Tuesday night

    expect(isSameTuesday(tuesday1, tuesday2)).toBe(true);
  });

  test('different Tuesdays are not same week', () => {
    const tuesday1 = new Date('2026-02-03T10:00:00Z');  // Tuesday
    const tuesday2 = new Date('2026-02-10T10:00:00Z'); // Next Tuesday

    expect(isSameTuesday(tuesday1, tuesday2)).toBe(false);
  });

  test('Tuesday 11:59 PM counts as Tuesday week', () => {
    const tuesday = new Date('2026-02-03T05:00:00Z');  // Midnight Wed UTC = 11:59:59 PM Tue EST
    const refTuesday = new Date('2026-02-03T15:00:00Z');  // Tuesday afternoon

    expect(isSameTuesday(tuesday, refTuesday)).toBe(true);
  });

  test('Wednesday 12:01 AM is NOT Tuesday week', () => {
    const wednesday = new Date('2026-02-04T05:01:00Z');  // 12:01 AM Wed EST
    const tuesday = new Date('2026-02-03T15:00:00Z');    // Tuesday afternoon

    expect(isSameTuesday(wednesday, tuesday)).toBe(false);
  });

  test('getNextTuesday returns next week Tuesday', () => {
    const wednesday = new Date('2026-02-04T15:00:00Z');  // Wednesday
    const nextTuesday = getNextTuesday(wednesday);

    expect(nextTuesday.getDay()).toBe(2);  // Tuesday = day 2
    expect(nextTuesday.getDate()).toBe(10); // Feb 10
  });

  test('getNextTuesday from Tuesday returns following Tuesday', () => {
    const tuesday = new Date('2026-02-03T15:00:00Z');  // Tuesday
    const nextTuesday = getNextTuesday(tuesday);

    expect(nextTuesday.getDate()).toBe(10); // Next Tuesday, not same day
  });
});
```

**Definition of Done**:
- [ ] 6+ tests for week boundary logic
- [ ] Tests use Tuesday as week start (weekStartsOn: 2)
- [ ] Tests cover edge cases (11:59 PM, 12:01 AM)
- [ ] Tests verify getNextTuesday calculation
- [ ] Tests fail when run (functions not implemented)

---

### TASK-011: Write unit tests for DST transitions

**Type**: Test
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-008
**Files**: `tests/streaks.test.js`

**Objective**: Write comprehensive tests for Daylight Saving Time edge cases.

**Test Specifications**:

```javascript
describe('DST Transition Handling', () => {
  describe('Spring Forward (March 2024)', () => {
    test('DST transition does not break week calculation', () => {
      // March 10, 2024: 2 AM → 3 AM (spring forward)
      const beforeDST = new Date('2024-03-09T05:00:00Z');  // Sat before DST
      const afterDST = new Date('2024-03-12T04:00:00Z');   // Tue after DST

      const buffaloBeforeDST = toBuffaloTime(beforeDST);
      const buffaloAfterDST = toBuffaloTime(afterDST);

      expect(buffaloBeforeDST).toBeInstanceOf(Date);
      expect(buffaloAfterDST).toBeInstanceOf(Date);
    });

    test('Tuesday before and after spring DST are different weeks', () => {
      const tuesdayBeforeDST = new Date('2024-03-05T05:00:00Z');  // Tue before
      const tuesdayAfterDST = new Date('2024-03-12T04:00:00Z');   // Tue after

      expect(isSameTuesday(tuesdayBeforeDST, tuesdayAfterDST)).toBe(false);
    });
  });

  describe('Fall Back (November 2024)', () => {
    test('DST transition does not break week calculation', () => {
      // November 3, 2024: 2 AM → 1 AM (fall back)
      const beforeDST = new Date('2024-11-02T05:00:00Z');  // Sat before DST
      const afterDST = new Date('2024-11-05T05:00:00Z');   // Tue after DST

      const buffaloBeforeDST = toBuffaloTime(beforeDST);
      const buffaloAfterDST = toBuffaloTime(afterDST);

      expect(buffaloBeforeDST).toBeInstanceOf(Date);
      expect(buffaloAfterDST).toBeInstanceOf(Date);
    });

    test('Tuesday before and after fall DST are different weeks', () => {
      const tuesdayBeforeDST = new Date('2024-10-29T04:00:00Z');  // Tue before
      const tuesdayAfterDST = new Date('2024-11-05T05:00:00Z');   // Tue after

      expect(isSameTuesday(tuesdayBeforeDST, tuesdayAfterDST)).toBe(false);
    });
  });

  describe('Year Boundary', () => {
    test('handles December to January week boundary', () => {
      const dec31 = new Date('2024-12-31T05:00:00Z');  // Tuesday
      const jan7 = new Date('2025-01-07T05:00:00Z');   // Tuesday next week

      expect(isSameTuesday(dec31, jan7)).toBe(false);
    });

    test('leap year February 29 handled correctly', () => {
      const leapDay = new Date('2024-02-29T05:00:00Z');  // Thursday
      const buffaloDate = toBuffaloTime(leapDay);

      expect(buffaloDate.getDate()).toBe(29);
      expect(buffaloDate.getMonth()).toBe(1);  // February = 1
    });
  });
});
```

**Definition of Done**:
- [ ] 8+ tests for DST transitions
- [ ] Tests cover spring forward (March)
- [ ] Tests cover fall back (November)
- [ ] Tests cover year boundary
- [ ] Tests use specific dates (2024 DST transitions)
- [ ] Tests fail when run (functions not implemented)

---

### TASK-012: Implement core timezone conversion utilities

**Type**: Implementation
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-009 (tests written)
**Files**: `netlify/functions/utils/streaks.js` (new file)

**Objective**: Implement timezone conversion functions that pass the unit tests.

**Implementation**:

```javascript
const { toZonedTime, formatInTimeZone } = require('date-fns-tz');
const { parseISO } = require('date-fns');

const BUFFALO_TIMEZONE = 'America/New_York';

/**
 * Convert any date to Buffalo timezone (America/New_York)
 * Handles both EST (UTC-5) and EDT (UTC-4) automatically
 * @param {Date|string} date - UTC date or ISO 8601 string
 * @returns {Date} Date object in Buffalo timezone
 * @throws {Error} If date is invalid
 */
function toBuffaloTime(date) {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }

    return toZonedTime(dateObj, BUFFALO_TIMEZONE);
  } catch (error) {
    console.error('Error converting to Buffalo time:', error.message);
    throw new Error(`Invalid date format: ${date}`);
  }
}

/**
 * Get current date/time in Buffalo timezone
 * @returns {Date} Current date in Buffalo (America/New_York)
 */
function getBuffaloDate() {
  return toZonedTime(new Date(), BUFFALO_TIMEZONE);
}

/**
 * Format date as YYYY-MM-DD in Buffalo timezone
 * @param {Date} date - Date to format
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function formatDateISO(date) {
  return formatInTimeZone(date, BUFFALO_TIMEZONE, 'yyyy-MM-dd');
}

module.exports = {
  toBuffaloTime,
  getBuffaloDate,
  formatDateISO,
  BUFFALO_TIMEZONE
};
```

**Definition of Done**:
- [ ] File created: netlify/functions/utils/streaks.js
- [ ] All three functions implemented
- [ ] Uses date-fns-tz for timezone conversion
- [ ] Error handling for invalid dates
- [ ] Functions exported in module.exports
- [ ] Tests from TASK-009 now pass
- [ ] No linting errors

---

### TASK-013: Implement week boundary functions

**Type**: Implementation
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-010 (tests written), TASK-012 (core utilities exist)
**Files**: `netlify/functions/utils/streaks.js`

**Objective**: Implement Tuesday-based week boundary detection functions.

**Implementation**:

```javascript
const { isSameWeek, startOfWeek, addWeeks } = require('date-fns');

/**
 * Check if two dates are in the same Tuesday-based week
 * Week starts on Tuesday (weekStartsOn: 2) for BOCC events
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same week (both in same Tuesday-Monday period)
 */
function isSameTuesday(date1, date2) {
  const buffalo1 = toBuffaloTime(date1);
  const buffalo2 = toBuffaloTime(date2);

  // Week starts on Tuesday (0 = Sunday, 1 = Monday, 2 = Tuesday)
  return isSameWeek(buffalo1, buffalo2, { weekStartsOn: 2 });
}

/**
 * Get the next Tuesday after a given date
 * @param {Date} date - Starting date
 * @returns {Date} Next Tuesday in Buffalo timezone
 */
function getNextTuesday(date) {
  const buffaloDate = toBuffaloTime(date);

  // Get start of current week (Tuesday)
  const weekStart = startOfWeek(buffaloDate, { weekStartsOn: 2 });

  // If current date is same week as weekStart, add 1 week
  // Otherwise, weekStart IS the next Tuesday
  if (isSameWeek(buffaloDate, weekStart, { weekStartsOn: 2 })) {
    return addWeeks(weekStart, 1);
  }

  return weekStart;
}

module.exports = {
  // ... existing exports
  isSameTuesday,
  getNextTuesday
};
```

**Definition of Done**:
- [ ] isSameTuesday function implemented
- [ ] getNextTuesday function implemented
- [ ] Uses weekStartsOn: 2 (Tuesday)
- [ ] Converts to Buffalo time before comparison
- [ ] Functions exported in module.exports
- [ ] Tests from TASK-010 now pass
- [ ] Edge cases handled (11:59 PM, 12:01 AM)

---

### TASK-014: Implement date formatting utilities

**Type**: Implementation
**Estimated Time**: 30 minutes
**Dependencies**: TASK-012 (core utilities exist)
**Files**: `netlify/functions/utils/streaks.js`

**Objective**: Add any additional date formatting utilities needed for streak tracking.

**Implementation**:

```javascript
const { format } = require('date-fns');

/**
 * Format date as human-readable string in Buffalo timezone
 * @param {Date} date - Date to format
 * @param {string} formatString - date-fns format string (default: 'PPP')
 * @returns {string} Formatted date string
 */
function formatDateReadable(date, formatString = 'PPP') {
  return formatInTimeZone(date, BUFFALO_TIMEZONE, formatString);
}

/**
 * Get day of week name in Buffalo timezone
 * @param {Date} date - Date to check
 * @returns {string} Day name (e.g., 'Tuesday')
 */
function getDayOfWeek(date) {
  return formatInTimeZone(date, BUFFALO_TIMEZONE, 'EEEE');
}

module.exports = {
  // ... existing exports
  formatDateReadable,
  getDayOfWeek
};
```

**Definition of Done**:
- [ ] Additional formatting utilities implemented
- [ ] Functions use Buffalo timezone
- [ ] Functions exported in module.exports
- [ ] Documentation added (JSDoc comments)
- [ ] No linting errors

---

### TASK-015: Verify DST edge cases and refine

**Type**: Validation
**Estimated Time**: 1 hour
**Dependencies**: ALL previous implementation tasks
**Files**: `tests/streaks.test.js`

**Objective**: Run all DST tests, verify correctness, and refine implementation if needed.

**Validation Steps**:

1. **Run All Timezone Tests**:
```bash
npm test tests/streaks.test.js
```

2. **Verify Coverage**:
```bash
npm test -- --coverage tests/streaks.test.js
```
- Target: 100% coverage for timezone utilities

3. **Manual Verification** (specific dates):
```javascript
// Test in Node.js REPL or test file
const { toBuffaloTime, isSameTuesday } = require('./netlify/functions/utils/streaks');

// Verify March DST spring forward
const march9 = new Date('2024-03-09T05:00:00Z');   // Sat before DST
const march10 = new Date('2024-03-10T07:00:00Z');  // Sun during DST (2 AM → 3 AM)
console.log('March 9 Buffalo:', toBuffaloTime(march9));
console.log('March 10 Buffalo:', toBuffaloTime(march10));

// Verify November DST fall back
const nov2 = new Date('2024-11-02T05:00:00Z');   // Sat before DST
const nov3 = new Date('2024-11-03T06:00:00Z');   // Sun during DST (2 AM → 1 AM)
console.log('Nov 2 Buffalo:', toBuffaloTime(nov2));
console.log('Nov 3 Buffalo:', toBuffaloTime(nov3));
```

4. **Edge Case Refinement**:
- If any tests fail, refine implementation
- Document any DST quirks discovered
- Add additional tests for edge cases found

**Definition of Done**:
- [ ] All timezone tests pass (30+ tests)
- [ ] 100% coverage on timezone utilities
- [ ] DST transitions verified manually
- [ ] No edge cases found that break logic
- [ ] Documentation updated with DST notes

---

## Summary

**Total Tasks**: 8
**Critical Path**: TASK-008 → TASK-009/010/011 → TASK-012/013 → TASK-015

**Estimated Timeline**:
- Phase 1 (Setup): 15 minutes
- Phase 2 (Tests): 3.5 hours
- Phase 3 (Implementation): 3.5 hours
- Phase 4 (Validation): 1 hour
- **Total**: 6-8 hours

**Success Criteria**:
- All timezone tests pass (30+ tests)
- 100% coverage on timezone utilities
- DST transitions handled correctly
- Tuesday-based week boundaries work
- No timezone-related bugs in streak calculation

**Integration Points**:
- STORY-002 (Streak Calculation) will use these utilities
- STORY-005 (Airtable) will use formatDateISO
- All date comparisons throughout Epic use Buffalo time

**Next Steps After Completion**:
This provides the foundation for STORY-002 (Streak Calculation Engine). Can be developed in parallel with STORY-003 (Grace Dates).

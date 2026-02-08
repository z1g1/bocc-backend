# STORY-007: Timezone Handling

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Small
**Priority**: High (Critical for accuracy)
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a system,
I need all date/time calculations to use Buffalo timezone (America/New_York),
So that Tuesday check-ins are correctly identified regardless of server timezone or DST transitions.

## Context

BOCC meets in Buffalo, NY every Tuesday. The Netlify serverless functions run in **UTC timezone**, but streak calculations must be based on **Buffalo local time** to correctly identify:
- Which day of the week it is (Tuesday check-in vs Wednesday check-in)
- Week boundaries (when does a new week start?)
- DST transitions (spring forward, fall back)

**Problem Example Without Timezone Handling**:
- Member checks in Tuesday 11:30 PM EST (Buffalo time)
- Server time is Wednesday 4:30 AM UTC
- Without timezone conversion, system thinks it's Wednesday → breaks streak

**DST Transitions in Buffalo**:
- **Spring Forward** (early March): 2:00 AM → 3:00 AM
- **Fall Back** (early November): 2:00 AM → 1:00 AM
- These transitions must NOT break streaks or cause incorrect week calculations

**Timezone**: America/New_York
- EST (Eastern Standard Time): UTC-5 (winter)
- EDT (Eastern Daylight Time): UTC-4 (summer)
- Automatically handles DST transitions

This story is technically part of STORY-002 (Streak Calculation Engine) but separated for clarity. All date utilities and conversions are implemented here, then used by the streak calculation engine.

## Acceptance Criteria

### Functional Requirements
- [ ] All date comparisons use America/New_York timezone
- [ ] Week boundaries calculated correctly (Tuesday = start of week for BOCC)
- [ ] DST spring forward transition handled correctly (March)
- [ ] DST fall back transition handled correctly (November)
- [ ] UTC timestamps converted to Buffalo time before calculations
- [ ] Check-in on Tuesday 11:59 PM Buffalo time counts as Tuesday (not Wednesday)
- [ ] Check-in on Wednesday 12:01 AM Buffalo time counts as Wednesday (not Tuesday)

### Non-Functional Requirements
- [ ] Date conversions are fast (<5ms per operation)
- [ ] Timezone utilities are pure functions (no side effects)
- [ ] Clear documentation of timezone handling in code comments
- [ ] Errors thrown for invalid date inputs

### Testing Requirements
- [ ] Unit test: Convert UTC to America/New_York
- [ ] Unit test: Week boundary calculation (Tuesday start)
- [ ] Unit test: DST spring forward date (March 10, 2024 example)
- [ ] Unit test: DST fall back date (November 3, 2024 example)
- [ ] Unit test: Tuesday 11:59 PM check-in (edge case)
- [ ] Unit test: Wednesday 12:01 AM check-in (edge case)
- [ ] Unit test: Year boundary (Dec 31 → Jan 7)
- [ ] Unit test: Leap year February 29
- [ ] Test coverage: 100% for timezone utilities (critical correctness)

## Technical Implementation Notes

### Approach

Use `date-fns-tz` library to handle timezone conversions. Create utility functions that wrap date-fns-tz operations and enforce America/New_York timezone for all streak-related date calculations.

**Key Utilities**:
1. `toBuffaloTime(date)` - Convert any date to Buffalo timezone
2. `getBuffaloDate()` - Get current date/time in Buffalo
3. `isSameTuesday(date1, date2)` - Check if two dates are same Tuesday (Buffalo time)
4. `getNextTuesday(date)` - Get next Tuesday from given date
5. `formatDateISO(date)` - Format date as YYYY-MM-DD in Buffalo timezone

**Library**: `date-fns-tz` (must be added to package.json)
```bash
npm install date-fns date-fns-tz
```

### Components/Files Affected

**Modified File**: `netlify/functions/utils/streaks.js` (or new file `utils/timezones.js`)
- Add timezone utility functions
- Use in all date comparisons for streak calculation
- Import date-fns-tz functions

**Modified File**: `package.json`
- Add `date-fns` ^2.30.0
- Add `date-fns-tz` ^2.0.0

**Modified File**: `tests/streaks.test.js`
- Add extensive timezone tests
- Test DST transitions with specific dates
- Test edge cases (11:59 PM, 12:01 AM)

### Integration Points

**NPM Dependencies**:
- `date-fns` - Date manipulation utilities (peer dependency)
- `date-fns-tz` - Timezone-aware operations

**Used By**:
- STORY-002 (Streak Calculation Engine) - All date calculations
- STORY-005 (Airtable Streaks Table) - Date formatting for storage

**No External APIs**: Pure computation using library functions

### Technical Considerations

**Core Timezone Functions**:
```javascript
const { toZonedTime, formatInTimeZone } = require('date-fns-tz');
const { isSameWeek, startOfWeek, addWeeks, parseISO } = require('date-fns');

const BUFFALO_TIMEZONE = 'America/New_York';

/**
 * Convert any date to Buffalo timezone
 * @param {Date|string} date - UTC date or ISO string
 * @returns {Date} Date object in Buffalo timezone
 */
function toBuffaloTime(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, BUFFALO_TIMEZONE);
}

/**
 * Get current date/time in Buffalo
 * @returns {Date} Current date in Buffalo timezone
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

/**
 * Check if two dates are in the same week (Tuesday-based)
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same week
 */
function isSameTuesday(date1, date2) {
  const buffalo1 = toBuffaloTime(date1);
  const buffalo2 = toBuffaloTime(date2);

  // Week starts on Tuesday (weekStartsOn: 2)
  return isSameWeek(buffalo1, buffalo2, { weekStartsOn: 2 });
}

/**
 * Get the next Tuesday after a given date
 * @param {Date} date - Starting date
 * @returns {Date} Next Tuesday in Buffalo timezone
 */
function getNextTuesday(date) {
  const buffaloDate = toBuffaloTime(date);
  const tuesday = startOfWeek(buffaloDate, { weekStartsOn: 2 });

  // If we're already on Tuesday, get next week's Tuesday
  if (isSameWeek(buffaloDate, tuesday, { weekStartsOn: 2 })) {
    return addWeeks(tuesday, 1);
  }

  return tuesday;
}
```

**DST Handling**:
```javascript
// date-fns-tz automatically handles DST transitions
// No special code needed, but MUST test with specific dates

// Spring Forward: March 10, 2024 (2 AM → 3 AM)
const springDate = new Date('2024-03-10T07:00:00Z');  // 2 AM EST = 7 AM UTC
const buffaloSpring = toBuffaloTime(springDate);
// buffaloSpring is correctly 3 AM EDT (skipped 2 AM)

// Fall Back: November 3, 2024 (2 AM → 1 AM)
const fallDate = new Date('2024-11-03T06:00:00Z');  // 2 AM EDT = 6 AM UTC
const buffaloFall = toBuffaloTime(fallDate);
// buffaloFall is correctly 1 AM EST (repeated hour)
```

**Week Boundary Logic**:
```javascript
// Tuesday is day 2 (Sunday = 0, Monday = 1, Tuesday = 2)
const weekStartsOn = 2;

// Check if check-in is in same week as expected Tuesday
const isOnTime = isSameWeek(
  currentCheckin,
  expectedTuesday,
  { weekStartsOn: 2 }
);

// This correctly handles:
// - Tuesday 11:59 PM = still Tuesday's week ✓
// - Wednesday 12:01 AM = next week ✗
```

**Edge Case Testing Dates**:
```javascript
// DST Spring Forward: March 9-10, 2024
const beforeSpring = new Date('2024-03-09T03:00:00Z');  // Saturday
const duringSpring = new Date('2024-03-10T07:00:00Z');  // Sunday (DST)
const afterSpring = new Date('2024-03-12T02:00:00Z');  // Tuesday

// DST Fall Back: November 2-3, 2024
const beforeFall = new Date('2024-11-02T03:00:00Z');  // Saturday
const duringFall = new Date('2024-11-03T06:00:00Z');  // Sunday (DST)
const afterFall = new Date('2024-11-05T02:00:00Z');  // Tuesday

// Year Boundary: December 31, 2024 → January 7, 2025
const dec31 = new Date('2024-12-31T05:00:00Z');  // Tuesday
const jan7 = new Date('2025-01-07T05:00:00Z');   // Tuesday (next week)

// Leap Year: February 29, 2024 (was a Thursday)
const leapDay = new Date('2024-02-29T05:00:00Z');
```

**Validation**:
```javascript
/**
 * Validate date input
 * @param {Date|string} date - Date to validate
 * @throws {Error} If date is invalid
 */
function validateDate(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  return dateObj;
}
```

**Error Handling**:
```javascript
try {
  const buffaloDate = toBuffaloTime(inputDate);
  // Use buffaloDate for calculations
} catch (error) {
  console.error('Timezone conversion failed:', error.message);
  throw new Error('Invalid date format');
}
```

### Existing Patterns to Follow

**Module Pattern**: CommonJS (require/module.exports)
**Pure Functions**: No side effects, return new values
**Error Handling**: Throw errors for invalid inputs (caller handles)
**Documentation**: JSDoc comments for all exported functions

### Performance Considerations

- Timezone conversions: ~1-5ms per operation
- date-fns-tz is optimized for performance
- No external API calls
- Negligible impact on streak calculation (<10ms total for all conversions)

## Dependencies

### Blocks
- [[STORY-002]] - Streak Calculation Engine (uses these timezone utilities)

### Blocked By
- None (can start immediately)

### Related
- [[STORY-002]] - Streak Calculation Engine (primary consumer)
- [[STORY-008]] - Comprehensive Testing (extensive timezone tests)

## Out of Scope

**Explicitly NOT included in this story**:
- Support for multiple timezones (Buffalo only for MVP)
- User timezone preference (events are in Buffalo, use Buffalo time)
- Server timezone configuration (always convert to Buffalo regardless)
- Timezone display in UI (backend only, frontend can handle display)
- Historical timezone data (date-fns-tz includes IANA database)
- Custom DST rules (standard America/New_York rules only)

## Notes

**Why America/New_York (not EST or EDT)**:
- EST/EDT are ambiguous (which months?)
- America/New_York is IANA timezone identifier
- Automatically handles DST transitions
- Includes full historical and future timezone rules

**Netlify Functions Timezone**:
- Netlify Functions run in UTC timezone
- Node.js process.env.TZ can be set, but shouldn't be (avoid confusion)
- Always explicitly convert to Buffalo time in code

**Testing Strategy**:
- Use fixed dates (not "today") for reproducible tests
- Test specific DST transition dates (not approximate)
- Test week boundaries with exact times (11:59 PM, 12:01 AM)
- Mock Date.now() in tests for consistency

**DST Transition Dates** (for reference):
```javascript
// 2024
Spring Forward: March 10, 2024 at 2:00 AM → 3:00 AM EDT
Fall Back: November 3, 2024 at 2:00 AM → 1:00 AM EST

// 2025
Spring Forward: March 9, 2025 at 2:00 AM → 3:00 AM EDT
Fall Back: November 2, 2025 at 2:00 AM → 1:00 AM EST

// 2026
Spring Forward: March 8, 2026 at 2:00 AM → 3:00 AM EDT
Fall Back: November 1, 2026 at 2:00 AM → 1:00 AM EST
```

**Common Pitfalls to Avoid**:
- ❌ Using server's local time (UTC)
- ❌ Using JavaScript Date methods without timezone conversion
- ❌ Assuming DST transitions on specific dates (they change yearly)
- ❌ Hardcoding EST/EDT offsets (-5/-4 hours)
- ✅ Always use toBuffaloTime() before date comparisons
- ✅ Use date-fns-tz for all timezone operations
- ✅ Test with specific DST transition dates

**Future Considerations**:
- If BOCC adds events in other timezones, add timezone parameter
- If event schedule changes, update week start logic
- If multiple event types with different cadences, abstract timezone handling

**Documentation Requirements**:
- Comment every function explaining timezone handling
- Document why America/New_York is used
- Provide examples in code comments
- Update README with timezone information

---

**Next Steps**: This Story is READY for task breakdown. Should be implemented as part of STORY-002 (Streak Calculation Engine) or as a prerequisite to it. Critical for correctness of all streak calculations. Extensive testing required due to DST complexity.

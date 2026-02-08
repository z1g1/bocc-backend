# STORY-002: Implement Streak Calculation Engine

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Large
**Priority**: High (CORE ALGORITHM)
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a system,
I need to calculate week-to-week attendance streaks based on event cadence and timezone,
So that BOCC can accurately track and reward members for consistent attendance patterns.

## Context

BOCC meets every Tuesday in Buffalo, NY. A "streak" represents consecutive weeks of attendance. This story implements the core algorithm that determines whether a member's streak continues, breaks, or is a new personal best.

**Streak Definition**:
- **Current Streak**: Number of consecutive weeks attended (including today)
- **Longest Streak**: Personal best (highest consecutive weeks ever achieved)
- **Broken Streak**: When a member misses a non-grace-date Tuesday
- **Grace Dates**: Declared holidays where missing doesn't break streaks (handled in STORY-003)

**Week Boundaries**:
- Week starts on Tuesday (for BOCC events)
- Timezone: America/New_York (EST/EDT with DST handling)
- Same-day duplicate check-ins don't increment streak (handled by existing deduplication)

**Example Scenarios**:
1. **First check-in ever**: currentStreak = 1, longestStreak = 1
2. **Check-in next Tuesday**: currentStreak = 2, longestStreak = 2
3. **Check-in 3 weeks later (missed 2 Tuesdays)**: currentStreak = 1 (broken), longestStreak = 2 (maintained)
4. **New personal best**: currentStreak = 10, longestStreak = 10 (updated)

This is the algorithmic heart of the Epic. All other stories depend on this calculation being correct.

## Acceptance Criteria

### Functional Requirements
- [ ] Calculate streak for first-time check-in (returns: currentStreak = 1, longestStreak = 1)
- [ ] Calculate streak for consecutive weekly check-in (currentStreak increments by 1)
- [ ] Calculate streak for check-in after missed week (currentStreak resets to 1, longestStreak maintained)
- [ ] Calculate streak using America/New_York timezone (handle EST/EDT transitions)
- [ ] Determine if check-in is on-time (same week as expected, Tuesday-based)
- [ ] Update longestStreak when currentStreak exceeds previous best
- [ ] Handle DST transitions correctly (spring forward, fall back)
- [ ] Handle year boundaries correctly (December → January)

### Non-Functional Requirements
- [ ] Calculation completes in <100ms (no external API calls in this module)
- [ ] Pure functions (no side effects, testable in isolation)
- [ ] Extensible design (hardcoded "bocc" = Tuesday, but structured for future flexibility)
- [ ] Comprehensive logging for debugging streak calculations

### Testing Requirements
- [ ] Unit test: First check-in (no history) → streak = 1
- [ ] Unit test: Consecutive Tuesday check-ins → streak increments
- [ ] Unit test: Missed 1 week → streak resets to 1
- [ ] Unit test: Missed 2+ weeks → streak still resets to 1
- [ ] Unit test: Personal best achieved → longestStreak updates
- [ ] Unit test: DST spring forward (2am → 3am Sunday) doesn't break streak
- [ ] Unit test: DST fall back (2am → 1am Sunday) doesn't break streak
- [ ] Unit test: Year boundary (Dec 31 → Jan 7) maintains streak
- [ ] Unit test: Tuesday 11:59pm check-in (late but valid)
- [ ] Unit test: Wednesday 12:01am check-in (too late, breaks streak)
- [ ] Unit test: Grace date integration (covered in STORY-003, but prepare for it)
- [ ] Test coverage: 95%+ for this module (critical algorithm)

## Technical Implementation Notes

### Approach

Create a new utility module `netlify/functions/utils/streaks.js` that exports pure calculation functions. This module will NOT make API calls or database queries - it only performs date math and streak logic.

**Key Functions**:
1. `calculateStreak(lastCheckIn, currentCheckIn, previousStreak, longestStreak, eventCadence, graceDates = [])`
   - Core algorithm
   - Returns: `{ currentStreak, longestStreak, streakBroken, isPersonalBest }`

2. `getExpectedNextCheckIn(lastCheckInDate, eventCadence, timezone)`
   - Given last check-in date, calculate next expected Tuesday
   - Returns: Date object in specified timezone

3. `isOnTime(currentCheckIn, expectedCheckIn, timezone)`
   - Check if current check-in is within same week as expected
   - Returns: boolean

4. `isStreakBroken(lastCheckIn, currentCheckIn, eventCadence, graceDates, timezone)`
   - Determine if streak is broken (missed non-grace weeks)
   - Returns: boolean

5. `getEventCadence(eventId)`
   - Return cadence config for event type
   - For MVP: hardcoded { "bocc": { dayOfWeek: 2, frequency: "weekly" } }
   - Returns: object with schedule details

### Components/Files Affected

**New File**: `netlify/functions/utils/streaks.js`
- All streak calculation logic
- Pure functions (no API calls, no database queries)
- Uses date-fns and date-fns-tz for date manipulation

**New File**: `tests/streaks.test.js`
- Comprehensive unit tests for all streak scenarios
- Mock date inputs for deterministic testing
- Test DST edge cases with specific dates

**Modified File**: `package.json`
- Add dependencies: `date-fns` and `date-fns-tz`

### Integration Points

**Dependencies** (NPM packages):
- `date-fns` v2.x - Date manipulation utilities
- `date-fns-tz` v2.x - Timezone-aware operations

**Data Inputs** (from other modules):
- Last check-in date (from Airtable or Circle.so, provided by caller)
- Current streak and longest streak (from Circle.so or Airtable, provided by caller)
- Grace dates array (from STORY-003, optional parameter)

**No External API Calls**: This module is pure calculation logic only

### Technical Considerations

**Timezone Handling** (Critical):
```javascript
const { toZonedTime, formatInTimeZone } = require('date-fns-tz');

// Convert UTC timestamp to Buffalo timezone
const buffaloTime = toZonedTime(utcDate, 'America/New_York');

// All date comparisons MUST happen in Buffalo timezone
```

**Week Boundary Logic**:
```javascript
const { isSameWeek, startOfWeek, addWeeks } = require('date-fns');

// Week starts on Tuesday (dayOfWeek = 2)
const isSameWeekAsTuesday = isSameWeek(date1, date2, { weekStartsOn: 2 });
```

**DST Transitions**:
- Spring forward: 2:00am → 3:00am (early March)
- Fall back: 2:00am → 1:00am (early November)
- date-fns-tz handles these transitions automatically
- Test cases MUST include dates spanning DST transitions

**Event Cadence Structure** (hardcoded for MVP):
```javascript
const EVENT_CADENCES = {
  'bocc': {
    frequency: 'weekly',
    dayOfWeek: 2,  // Tuesday (0 = Sunday, 1 = Monday, 2 = Tuesday, etc.)
    timezone: 'America/New_York'
  }
  // Future: 'codeCoffee', other events
};
```

**Algorithm Pseudo-code**:
```javascript
function calculateStreak(lastCheckIn, currentCheckIn, previousStreak, longestStreak, eventCadence, graceDates = []) {
  // Convert to Buffalo timezone
  const timezone = eventCadence.timezone;
  const lastDate = lastCheckIn ? toZonedTime(lastCheckIn, timezone) : null;
  const currentDate = toZonedTime(currentCheckIn, timezone);

  // First check-in ever
  if (!lastDate) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      isPersonalBest: true
    };
  }

  // Calculate expected next check-in (last Tuesday + 1 week)
  const expectedDate = addWeeks(
    startOfWeek(lastDate, { weekStartsOn: eventCadence.dayOfWeek }),
    1
  );

  // Check if current check-in is on time (same week as expected)
  const isOnTime = isSameWeek(currentDate, expectedDate, { weekStartsOn: eventCadence.dayOfWeek });

  if (isOnTime) {
    // Streak continues
    const newStreak = previousStreak + 1;
    const newLongest = Math.max(newStreak, longestStreak);
    return {
      currentStreak: newStreak,
      longestStreak: newLongest,
      streakBroken: false,
      isPersonalBest: newStreak > longestStreak
    };
  }

  // Not on time - check grace dates
  const missedWeeks = calculateMissedWeeks(lastDate, currentDate, eventCadence);
  const missedNonGraceDates = missedWeeks.filter(date => !isGraceDate(date, graceDates));

  if (missedNonGraceDates.length === 0) {
    // Only grace dates were missed - streak continues
    const newStreak = previousStreak + 1;
    const newLongest = Math.max(newStreak, longestStreak);
    return {
      currentStreak: newStreak,
      longestStreak: newLongest,
      streakBroken: false,
      isPersonalBest: newStreak > longestStreak
    };
  }

  // Streak broken (missed non-grace Tuesday)
  return {
    currentStreak: 1,
    longestStreak: longestStreak,  // Maintain previous best
    streakBroken: true,
    isPersonalBest: false
  };
}
```

### Existing Patterns to Follow

**Module Pattern**: CommonJS (require/module.exports)
**Error Handling**: Throw errors for invalid inputs (caller handles try-catch)
**Logging**: Use `console.log()` for calculation details (helps debugging)
**Documentation**: JSDoc comments for all exported functions

### Performance Considerations

- No API calls (pure computation)
- date-fns operations are fast (<1ms per calculation)
- Grace date lookups are array iteration (acceptable for small lists <50 dates)
- Total calculation time: <100ms target

## Dependencies

### Blocks
- [[STORY-004]] - Circle.so Custom Field Integration (needs streak values to store)
- [[STORY-005]] - Airtable Streaks Table (needs streak values to store)
- [[STORY-006]] - Enhanced Check-in Response (needs streak values to display)

### Blocked By
- [[STORY-001]] - Fix Visit Count Bug (must be fixed first for reliable custom fields)

### Related
- [[STORY-003]] - Grace Date Management (provides graceDates input array)
- [[STORY-007]] - Timezone Handling (timezone logic is part of this story)
- [[STORY-008]] - Comprehensive Testing (extensive tests for this algorithm)

## Out of Scope

**Explicitly NOT included in this story**:
- Fetching last check-in date from database (caller provides this)
- Storing calculated streak values (handled in STORY-004 and STORY-005)
- Formatting streak messages for users (handled in STORY-006)
- Grace date management (handled in STORY-003)
- Multiple event type support (hardcoded "bocc" = Tuesday for MVP)
- Historical backfill of streaks (future Epic)
- Streak recovery/manual adjustment (future feature)

## Notes

**Design Decision: Pure Functions**
- This module contains NO side effects (no API calls, no database writes)
- Makes testing easy and reliable
- Caller is responsible for fetching inputs and storing outputs
- Follows functional programming best practices

**Hardcoded Event Cadence**:
- MVP hardcodes "bocc" = weekly Tuesday
- Structure designed for future flexibility (object with event configs)
- Document in code comments that this is intentional for MVP
- Future: Move to database configuration or config file

**DST Testing Strategy**:
- Test with specific dates that span DST transitions
- Spring forward: Test week of March 10, 2024 (DST start)
- Fall back: Test week of November 3, 2024 (DST end)
- Verify week boundaries are calculated correctly regardless of DST

**Timezone Justification**:
- BOCC events happen in Buffalo, NY (America/New_York)
- Server may run in different timezone (Netlify uses UTC)
- MUST convert all dates to Buffalo timezone before comparison
- This prevents "Tuesday" being misidentified due to UTC offset

**Grace Date Integration**:
- This story prepares for grace dates (optional parameter)
- Grace date logic is tested here but data comes from STORY-003
- If no grace dates provided, streak breaks for any missed Tuesday

**Testing Philosophy**:
- Use fixed dates in tests (not "today") for reproducibility
- Test boundary conditions (11:59pm Tuesday, 12:01am Wednesday)
- Test edge cases (year boundaries, DST transitions, leap years)
- Mock nothing (pure functions with no external dependencies)

**Error Scenarios**:
- Invalid date inputs: Throw error (caller should validate)
- Missing required parameters: Throw error
- Invalid eventId: Throw error (cadence not found)
- Future dates: Allow (for testing and manual corrections)

---

**Next Steps**: This Story is READY for task breakdown. Recommended TDD approach:
1. Write unit tests for all scenarios (test file first)
2. Implement functions to pass tests (implementation second)
3. Refine edge cases as discovered during implementation
4. Document assumptions in code comments

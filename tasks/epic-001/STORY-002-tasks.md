# Tasks for STORY-002: Streak Calculation Engine

**Story**: [[STORY-002]] - Streak Calculation Engine
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: High (CORE ALGORITHM)
**Total Tasks**: 18
**Estimated Time**: 12-16 hours

## Overview

Implement the core streak calculation algorithm - the algorithmic heart of the Epic. Pure functions (no API calls) that calculate consecutive week attendance streaks with timezone awareness and grace date support.

## Dependencies

**BLOCKED BY**:
- [[STORY-001]] - Fix Visit Count Bug (must complete first)
- [[STORY-007]] - Timezone Handling (uses timezone utilities)

**CONSUMES**:
- [[STORY-003]] - Grace Date Management (optional input)

## Task Execution Order

### Phase 1: Core Algorithm Tests (TDD Red)
- [[TASK-026]] - Write tests for calculateStreak (basic scenarios)
- [[TASK-027]] - Write tests for calculateStreak (edge cases)
- [[TASK-028]] - Write tests for calculateStreak (grace dates)
- [[TASK-029]] - Write tests for calculateStreak (DST transitions)

### Phase 2: Helper Function Tests (TDD Red)
- [[TASK-030]] - Write tests for streak helper functions
- [[TASK-031]] - Write tests for event cadence configuration

### Phase 3: Core Implementation (TDD Green)
- [[TASK-032]] - Implement event cadence configuration
- [[TASK-033]] - Implement calculateMissedWeeks helper
- [[TASK-034]] - Implement calculateStreak (basic logic)
- [[TASK-035]] - Add grace date support to calculateStreak
- [[TASK-036]] - Add personal best detection

### Phase 4: Helper Implementation (TDD Green)
- [[TASK-037]] - Implement isStreakBroken function
- [[TASK-038]] - Implement getExpectedNextCheckIn function

### Phase 5: Integration & Refactor
- [[TASK-039]] - Integrate with checkin handler
- [[TASK-040]] - Add comprehensive logging
- [[TASK-041]] - Refactor and optimize
- [[TASK-042]] - Documentation and examples
- [[TASK-043]] - Full integration testing

## Tasks

---

### TASK-026: Write tests for calculateStreak (basic scenarios)

**Type**: Test | **Time**: 1.5 hours | **Dependencies**: TASK-007 complete
**Files**: `tests/streaks.test.js`

**Objective**: Write comprehensive tests for basic streak scenarios.

**Test Specifications**:
```javascript
describe('calculateStreak - Basic Scenarios', () => {
  const eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' };

  test('first check-in ever returns streak 1', () => {
    const result = calculateStreak(null, new Date('2026-02-03'), 0, 0, eventCadence, []);
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      isPersonalBest: true
    });
  });

  test('consecutive Tuesday increments streak', () => {
    const last = new Date('2026-02-03T15:00:00Z');  // Tue Feb 3
    const current = new Date('2026-02-10T15:00:00Z');  // Tue Feb 10
    const result = calculateStreak(last, current, 1, 1, eventCadence, []);

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.streakBroken).toBe(false);
  });

  test('missed one week resets streak to 1', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-17T15:00:00Z');  // 2 weeks later
    const result = calculateStreak(last, current, 5, 10, eventCadence, []);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);  // Maintained
    expect(result.streakBroken).toBe(true);
  });

  test('missed multiple weeks still resets to 1', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-03-03T15:00:00Z');  // 4 weeks later
    const result = calculateStreak(last, current, 3, 5, eventCadence, []);

    expect(result.currentStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  test('same-day check-in maintains streak', () => {
    const last = new Date('2026-02-03T10:00:00Z');
    const current = new Date('2026-02-03T20:00:00Z');  // Same day
    const result = calculateStreak(last, current, 3, 5, eventCadence, []);

    expect(result.currentStreak).toBe(3);  // No change
    expect(result.streakBroken).toBe(false);
  });
});
```

**Definition of Done**:
- [ ] 5+ tests for basic scenarios
- [ ] Tests cover first check-in, consecutive, broken, same-day
- [ ] Tests verify all return fields (currentStreak, longestStreak, streakBroken, isPersonalBest)
- [ ] Tests fail when run (function not implemented)

---

### TASK-027: Write tests for calculateStreak (edge cases)

**Type**: Test | **Time**: 1 hour | **Dependencies**: None
**Files**: `tests/streaks.test.js`

**Objective**: Test edge cases and boundary conditions.

**Tests include**: Tuesday 11:59 PM, Wednesday 12:01 AM, year boundary (Dec→Jan), personal best scenarios, negative streak values (defensive), null/undefined inputs.

**Definition of Done**: 6+ edge case tests, all fail initially.

---

### TASK-028: Write tests for calculateStreak (grace dates)

**Type**: Test | **Time**: 1 hour | **Dependencies**: STORY-003 started
**Files**: `tests/streaks.test.js`

**Tests include**: Single grace date preserves streak, multiple grace dates, grace date + regular miss = break, empty grace dates array.

**Definition of Done**: 5+ grace date tests, all fail initially.

---

### TASK-029: Write tests for calculateStreak (DST transitions)

**Type**: Test | **Time**: 1 hour | **Dependencies**: STORY-007 complete
**Files**: `tests/streaks.test.js`

**Tests include**: Streak across spring forward DST, streak across fall back DST, consecutive weeks spanning DST, Tuesday before/after DST = different weeks.

**Definition of Done**: 4+ DST tests using specific 2024 dates, all fail initially.

---

### TASK-030: Write tests for streak helper functions

**Type**: Test | **Time**: 45 minutes | **Dependencies**: None
**Files**: `tests/streaks.test.js`

**Tests include**: calculateMissedWeeks, isStreakBroken, getExpectedNextCheckIn.

**Definition of Done**: 8+ helper function tests, all fail initially.

---

### TASK-031: Write tests for event cadence configuration

**Type**: Test | **Time**: 30 minutes | **Dependencies**: None
**Files**: `tests/streaks.test.js`

**Tests include**: getEventCadence('bocc') returns correct config, unknown eventId throws error, cadence has required fields.

**Definition of Done**: 3+ config tests, all fail initially.

---

### TASK-032: Implement event cadence configuration

**Type**: Implementation | **Time**: 30 minutes | **Dependencies**: TASK-031
**Files**: `netlify/functions/utils/streaks.js`

**Implementation**:
```javascript
const EVENT_CADENCES = {
  'bocc': {
    frequency: 'weekly',
    dayOfWeek: 2,  // Tuesday
    timezone: 'America/New_York'
  }
  // Future: codeCoffee, other events
};

function getEventCadence(eventId) {
  const cadence = EVENT_CADENCES[eventId];
  if (!cadence) {
    throw new Error(`Unknown event: ${eventId}`);
  }
  return cadence;
}
```

**Definition of Done**: getEventCadence implemented, TASK-031 tests pass.

---

### TASK-033: Implement calculateMissedWeeks helper

**Type**: Implementation | **Time**: 1 hour | **Dependencies**: TASK-030, STORY-007
**Files**: `netlify/functions/utils/streaks.js`

**Implementation**: Calculate array of missed Tuesday dates between last and current check-in.

**Definition of Done**: Helper returns array of Date objects for missed Tuesdays, tests pass.

---

### TASK-034: Implement calculateStreak (basic logic)

**Type**: Implementation | **Time**: 2 hours | **Dependencies**: TASK-026, TASK-032, TASK-033
**Files**: `netlify/functions/utils/streaks.js`

**Implementation**:
```javascript
function calculateStreak(lastCheckIn, currentCheckIn, previousStreak, longestStreak, eventCadence, graceDates = []) {
  const timezone = eventCadence.timezone;
  const currentDate = toBuffaloTime(currentCheckIn);

  // First check-in ever
  if (!lastCheckIn) {
    return {
      currentStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      isPersonalBest: true
    };
  }

  const lastDate = toBuffaloTime(lastCheckIn);

  // Check if on-time (same week or next consecutive week)
  const expectedNext = getExpectedNextCheckIn(lastDate, eventCadence);
  const isOnTime = isSameTuesday(currentDate, expectedNext);

  if (isOnTime) {
    const newStreak = previousStreak + 1;
    const newLongest = Math.max(newStreak, longestStreak);
    return {
      currentStreak: newStreak,
      longestStreak: newLongest,
      streakBroken: false,
      isPersonalBest: newStreak > longestStreak
    };
  }

  // Not on-time - for now, streak broken (grace dates in TASK-035)
  return {
    currentStreak: 1,
    longestStreak: longestStreak,
    streakBroken: true,
    isPersonalBest: false
  };
}
```

**Definition of Done**: Basic logic implemented, TASK-026 tests pass, grace date tests still fail.

---

### TASK-035: Add grace date support to calculateStreak

**Type**: Implementation | **Time**: 1.5 hours | **Dependencies**: TASK-034, STORY-003
**Files**: `netlify/functions/utils/streaks.js`

**Enhancement**: Add logic to check missed weeks against grace dates before breaking streak.

**Definition of Done**: Grace date logic integrated, TASK-028 tests now pass.

---

### TASK-036: Add personal best detection

**Type**: Implementation | **Time**: 30 minutes | **Dependencies**: TASK-034
**Files**: `netlify/functions/utils/streaks.js`

**Enhancement**: Ensure isPersonalBest flag set correctly when currentStreak exceeds previous longestStreak.

**Definition of Done**: Personal best logic refined, TASK-027 tests pass.

---

### TASK-037: Implement isStreakBroken function

**Type**: Implementation | **Time**: 45 minutes | **Dependencies**: TASK-030
**Files**: `netlify/functions/utils/streaks.js`

**Definition of Done**: isStreakBroken helper implemented, tests pass.

---

### TASK-038: Implement getExpectedNextCheckIn function

**Type**: Implementation | **Time**: 45 minutes | **Dependencies**: TASK-030, STORY-007
**Files**: `netlify/functions/utils/streaks.js`

**Implementation**: Calculate next expected Tuesday given last check-in and event cadence.

**Definition of Done**: Function implemented, returns correct next Tuesday, tests pass.

---

### TASK-039: Integrate with checkin handler

**Type**: Integration | **Time**: 1.5 hours | **Dependencies**: TASK-034, TASK-035
**Files**: `netlify/functions/checkin.js`

**Integration Steps**:
1. Import calculateStreak from streaks module
2. Fetch last check-in date from Circle.so/Airtable
3. Fetch current streak and longest streak
4. Fetch grace dates (STORY-003)
5. Call calculateStreak
6. Store results (placeholder for STORY-004/005)

**Definition of Done**: Check-in handler calls calculateStreak, streak values calculated correctly.

---

### TASK-040: Add comprehensive logging

**Type**: Enhancement | **Time**: 30 minutes | **Dependencies**: TASK-034
**Files**: `netlify/functions/utils/streaks.js`

**Logging to add**: Current/previous streak, expected next check-in, on-time status, missed weeks, grace dates applied, final result.

**Definition of Done**: All calculations logged, helps debugging in production.

---

### TASK-041: Refactor and optimize

**Type**: Refactor | **Time**: 1 hour | **Dependencies**: All implementation tasks
**Files**: `netlify/functions/utils/streaks.js`

**Refactoring**: Extract common logic, simplify conditions, optimize date calculations, add JSDoc comments.

**Definition of Done**: Code is clean, performant (<100ms), all tests still pass.

---

### TASK-042: Documentation and examples

**Type**: Documentation | **Time**: 1 hour | **Dependencies**: TASK-041
**Files**: `docs/streak-calculation.md` (new)

**Documentation**: Algorithm explanation, examples, edge cases, DST handling, grace dates, troubleshooting.

**Definition of Done**: Comprehensive documentation created, includes code examples.

---

### TASK-043: Full integration testing

**Type**: Integration Test | **Time**: 1.5 hours | **Dependencies**: ALL tasks
**Files**: `tests/checkin.test.js`, manual testing

**Integration Tests**: End-to-end check-in flow with streak calculation, multiple consecutive check-ins, broken streak recovery, grace date application.

**Definition of Done**: All integration tests pass, manual verification successful, 95%+ coverage on streaks.js.

---

## Summary

**Total Tasks**: 18
**Critical Path**: Tests → Core impl → Helpers → Integration
**Estimated Time**: 12-16 hours

**Success Criteria**:
- 50+ unit tests for streak calculation (all pass)
- 95%+ code coverage on streaks.js
- All edge cases handled (DST, grace dates, year boundary)
- Integration with check-in handler works
- Performance <100ms per calculation
- Comprehensive documentation

**Next Steps**: After completion, proceed to STORY-004 and STORY-005 (storage integration).

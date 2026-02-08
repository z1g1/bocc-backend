# STORY-008: Comprehensive Testing

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Medium
**Priority**: High (Quality Assurance)
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As a developer,
I need comprehensive unit and integration tests for streak tracking,
So that the system is reliable, bugs are caught early, and future changes don't break existing functionality.

## Context

Streak tracking is a **critical feature** where accuracy is essential - incorrect calculations would:
- Break trust with members (showing wrong streaks)
- Cause incorrect reward triggers in Circle.so workflows
- Create data inconsistencies between Circle.so and Airtable
- Require manual data correction (time-consuming, error-prone)

**Testing Philosophy**: Test-driven development (TDD)
- Write tests FIRST (define expected behavior)
- Implement code to pass tests
- Refactor while keeping tests green

**Coverage Target**: 90%+ for new code (streak logic, timezone handling, storage)

This story consolidates and expands testing across all previous stories, ensuring the Epic is production-ready.

## Acceptance Criteria

### Functional Requirements
- [ ] Unit tests cover all streak calculation scenarios (15+ tests)
- [ ] Unit tests cover timezone handling and DST transitions (8+ tests)
- [ ] Unit tests cover grace date functionality (6+ tests)
- [ ] Unit tests cover Circle.so custom field updates (8+ tests)
- [ ] Unit tests cover Airtable streak table operations (8+ tests)
- [ ] Unit tests cover message formatting (6+ tests)
- [ ] Integration tests verify end-to-end check-in with streak tracking
- [ ] Smoke tests cover realistic user scenarios
- [ ] All tests pass consistently (no flaky tests)
- [ ] Test coverage reports generated (use Jest coverage)

### Non-Functional Requirements
- [ ] Total test execution time <30 seconds (unit + integration)
- [ ] Tests are independent (can run in any order)
- [ ] Tests use mocks for external APIs (Airtable, Circle.so)
- [ ] Integration tests can run against staging environment
- [ ] Clear test documentation (describe blocks explain purpose)

### Testing Requirements
- [ ] 90%+ code coverage on new files (streaks.js, graceDates.js, etc.)
- [ ] 100% coverage on critical paths (streak calculation, timezone conversion)
- [ ] Zero skipped tests (all tests enabled and passing)
- [ ] Test output is readable (clear failure messages)

## Technical Implementation Notes

### Approach

Expand existing Jest test suite with comprehensive tests for all Epic-001 functionality. Organize tests by module (streaks, graceDates, circle, airtable, checkin) for maintainability.

**Test Organization**:
```
tests/
├── circle.test.js          # Enhanced with bug fix and custom field tests
├── streaks.test.js         # NEW - Streak calculation engine tests
├── graceDates.test.js      # NEW - Grace date functionality tests
├── airtable-streaks.test.js # NEW - Airtable streaks table operations
├── checkin.test.js         # Enhanced with streak integration tests
├── validation.test.js      # Existing tests (no changes needed)
├── smoke-test.sh           # Enhanced with streak scenarios
└── manual-streak-test.sh   # NEW - Manual testing script for streaks
```

**Test Categories**:
1. **Unit Tests** - Test individual functions in isolation (90% of tests)
2. **Integration Tests** - Test end-to-end check-in flow (10% of tests)
3. **Smoke Tests** - Test deployed API with real requests (manual/automated)

### Components/Files Affected

**New Test Files**:
- `tests/streaks.test.js` - Streak calculation engine (30+ tests)
- `tests/graceDates.test.js` - Grace date management (10+ tests)
- `tests/airtable-streaks.test.js` - Airtable operations (10+ tests)
- `tests/manual-streak-test.sh` - Manual testing scenarios (5 scenarios)

**Enhanced Test Files**:
- `tests/circle.test.js` - Add bug fix verification and custom field tests (15+ new tests)
- `tests/checkin.test.js` - Add streak integration tests (10+ new tests)
- `tests/smoke-test.sh` - Add streak verification (3+ new scenarios)

**Modified Files**:
- `package.json` - Ensure Jest coverage configuration
- `.gitignore` - Ignore coverage reports directory

### Integration Points

**Jest Configuration** (package.json):
```json
{
  "jest": {
    "testEnvironment": "node",
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "coveragePathIgnorePatterns": ["/node_modules/", "/tests/"],
    "coverageThreshold": {
      "global": {
        "branches": 85,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

**Mocking Strategy**:
- Mock Airtable SDK (`airtable` package)
- Mock axios for Circle.so API calls
- Mock date-fns-tz for deterministic date tests (optional, fixed dates better)
- No mocks for pure functions (streak calculation, timezone conversion)

### Technical Considerations

**Streak Calculation Tests** (`tests/streaks.test.js`):
```javascript
describe('Streak Calculation Engine', () => {
  describe('calculateStreak', () => {
    test('first check-in returns streak 1', () => {
      const result = calculateStreak(null, new Date(), 0, 0, eventCadence, []);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.isPersonalBest).toBe(true);
    });

    test('consecutive weekly check-in increments streak', () => {
      const lastCheckIn = new Date('2026-02-04');  // Tuesday
      const currentCheckIn = new Date('2026-02-11');  // Next Tuesday
      const result = calculateStreak(lastCheckIn, currentCheckIn, 1, 1, eventCadence, []);
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
    });

    test('missed week resets streak to 1', () => {
      const lastCheckIn = new Date('2026-02-04');  // Tuesday
      const currentCheckIn = new Date('2026-02-18');  // 2 weeks later
      const result = calculateStreak(lastCheckIn, currentCheckIn, 5, 10, eventCadence, []);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10);  // Maintained
      expect(result.streakBroken).toBe(true);
    });

    test('grace date prevents streak break', () => {
      const lastCheckIn = new Date('2026-12-23');  // Tuesday
      const currentCheckIn = new Date('2026-01-06');  // 2 weeks later
      const graceDates = ['2025-12-30'];  // Grace date on missed Tuesday
      const result = calculateStreak(lastCheckIn, currentCheckIn, 5, 10, eventCadence, graceDates);
      expect(result.currentStreak).toBe(6);  // Continues
      expect(result.streakBroken).toBe(false);
    });

    test('personal best updates when exceeded', () => {
      const lastCheckIn = new Date('2026-02-04');
      const currentCheckIn = new Date('2026-02-11');
      const result = calculateStreak(lastCheckIn, currentCheckIn, 10, 10, eventCadence, []);
      expect(result.currentStreak).toBe(11);
      expect(result.longestStreak).toBe(11);  // Updated
      expect(result.isPersonalBest).toBe(true);
    });
  });
});
```

**Timezone Tests** (`tests/streaks.test.js` or separate file):
```javascript
describe('Timezone Handling', () => {
  test('converts UTC to Buffalo time correctly', () => {
    const utcDate = new Date('2026-02-07T05:00:00Z');  // Midnight Buffalo time
    const buffaloDate = toBuffaloTime(utcDate);
    expect(buffaloDate.getHours()).toBe(0);  // Midnight
  });

  test('handles DST spring forward', () => {
    // March 10, 2024 at 2 AM → 3 AM EDT
    const beforeDST = new Date('2024-03-10T06:00:00Z');  // 1 AM EST
    const afterDST = new Date('2024-03-10T07:00:00Z');   // 3 AM EDT (skipped 2 AM)
    // Test that week boundaries still work correctly
  });

  test('Tuesday 11:59 PM is still Tuesday', () => {
    const lateCheckin = new Date('2026-02-11T04:59:00Z');  // 11:59 PM EST
    const tuesday = new Date('2026-02-11T05:00:00Z');      // Midnight (start of Wed)
    expect(isSameTuesday(lateCheckin, tuesday)).toBe(false);  // Different weeks
  });
});
```

**Grace Date Tests** (`tests/graceDates.test.js`):
```javascript
describe('Grace Date Management', () => {
  test('queries grace dates for specific event', async () => {
    // Mock Airtable response
    const mockRecords = [{ get: (field) => field === 'date' ? '2025-12-30' : 'bocc' }];
    // ... test implementation
  });

  test('returns empty array when no grace dates', async () => {
    // Mock empty Airtable response
    const result = await getGraceDates('bocc');
    expect(result).toEqual([]);
  });

  test('filters by eventId correctly', async () => {
    // Mock mixed grace dates (bocc and codeCoffee)
    // Verify only bocc dates returned
  });
});
```

**Circle.so Tests** (`tests/circle.test.js`):
```javascript
describe('Bug Fix: incrementCheckinCount', () => {
  test('fetches current count before incrementing', async () => {
    // Mock getMemberCustomField returning 5
    // Mock updateMemberCustomField
    await incrementCheckinCount('member123');
    // Verify updateMemberCustomField called with 6
  });

  test('handles null current count (new member)', async () => {
    // Mock getMemberCustomField returning null
    await incrementCheckinCount('member123');
    // Verify updateMemberCustomField called with 1
  });
});

describe('Streak Custom Fields', () => {
  test('updates all four streak fields', async () => {
    const streakData = {
      currentStreak: 5,
      longestStreak: 8,
      lastCheckinDate: '2026-02-07'
    };
    await updateStreakFields('member123', streakData);
    // Verify updateMemberCustomField called 3 times (+ incrementCheckinCount)
  });
});
```

**Airtable Streaks Tests** (`tests/airtable-streaks.test.js`):
```javascript
describe('Airtable Streaks Table', () => {
  test('creates new streak record', async () => {
    // Mock findStreakRecord returning null (no existing record)
    // Mock createStreakRecord
    const result = await upsertStreakRecord('attendee123', 'bocc', streakData);
    expect(result).toBeDefined();
  });

  test('updates existing streak record', async () => {
    // Mock findStreakRecord returning existing record
    // Mock updateStreakRecord
    const result = await upsertStreakRecord('attendee123', 'bocc', streakData);
    expect(result).toBeDefined();
  });
});
```

**Integration Tests** (`tests/checkin.test.js`):
```javascript
describe('Check-in with Streak Tracking', () => {
  test('full check-in flow calculates and stores streak', async () => {
    // Mock all dependencies (Airtable, Circle.so)
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        eventId: 'bocc',
        debug: '1',
        token: 'test-token'
      })
    };

    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.streakMessage).toBeDefined();
    expect(body.streakData).toBeDefined();
    expect(body.streakData.currentStreak).toBeGreaterThan(0);
  });
});
```

**Smoke Test Enhancement** (`tests/smoke-test.sh`):
```bash
# Test 1: First check-in (streak = 1)
echo "Testing first check-in..."
response=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d '{
  "email": "smoketest+first@example.com",
  "name": "First Timer",
  "eventId": "bocc",
  "debug": "1",
  "token": "test-token"
}')

streak=$(echo "$response" | jq -r '.streakData.currentStreak')
if [ "$streak" != "1" ]; then
  echo "FAIL: Expected streak 1, got $streak"
  exit 1
fi

# Test 2: Verify streak message in response
message=$(echo "$response" | jq -r '.streakMessage')
if [[ ! "$message" =~ "streak" ]]; then
  echo "FAIL: Missing streak message"
  exit 1
fi

echo "PASS: Smoke tests completed successfully"
```

**Manual Testing Script** (`tests/manual-streak-test.sh`):
```bash
#!/bin/bash
# Manual testing scenarios for streak tracking

echo "Scenario 1: New member check-in"
# ... test new check-in, verify streak = 1

echo "Scenario 2: Consecutive week check-in"
# ... test with different date, verify streak = 2

echo "Scenario 3: Broken streak"
# ... test with gap in dates, verify streak = 1

echo "Scenario 4: Grace date skip"
# ... test with grace date, verify streak continues

echo "Scenario 5: Personal best"
# ... test achieving new longest streak
```

### Existing Patterns to Follow

**Test Structure**: Existing Jest tests in `tests/` directory
**Mocking**: Mock external dependencies (Airtable, Circle.so APIs)
**Test Data**: Use fixed dates and deterministic inputs
**Assertions**: Use Jest matchers (toBe, toEqual, toBeDefined, etc.)

### Performance Considerations

- Unit tests should run quickly (<10 seconds total)
- Integration tests may take longer (~20 seconds with API mocks)
- Smoke tests require live API (~30 seconds)
- Total test suite: <30 seconds for fast feedback

## Dependencies

### Blocks
- None (testing doesn't block other work, but validates it)

### Blocked By
- [[STORY-001]] - Fix Visit Count Bug (tests verify fix)
- [[STORY-002]] - Streak Calculation Engine (tests verify algorithm)
- [[STORY-003]] - Grace Date Management (tests verify functionality)
- [[STORY-004]] - Circle.so Custom Fields (tests verify API calls)
- [[STORY-005]] - Airtable Streaks Table (tests verify storage)
- [[STORY-006]] - Enhanced Check-in Response (tests verify messages)
- [[STORY-007]] - Timezone Handling (tests verify conversions)

### Related
- All stories in EPIC-001 (this validates all of them)

## Out of Scope

**Explicitly NOT included in this story**:
- Load testing (concurrent check-ins) - future Epic
- Performance profiling (detailed timing) - future Epic
- Security testing (penetration testing) - separate effort
- User acceptance testing (UAT) - post-deployment
- Automated visual regression testing (no UI changes)
- End-to-end tests with real Circle.so/Airtable (staging only)

## Notes

**Test-Driven Development (TDD) Workflow**:
1. Write test for expected behavior (RED - test fails)
2. Implement minimal code to pass test (GREEN - test passes)
3. Refactor code while keeping tests green (REFACTOR)
4. Repeat for next feature

**Coverage Thresholds** (enforced by Jest):
- **90% statements**: Every line executed by tests
- **90% branches**: All if/else paths tested
- **90% functions**: All functions called by tests
- **85% branches**: Some edge cases may be unreachable (acceptable)

**Flaky Test Prevention**:
- Use fixed dates (not `new Date()`)
- Mock random values
- Avoid timing-dependent tests
- Run tests multiple times to verify consistency

**Test Naming Convention**:
```javascript
// Good: Describes behavior and expected outcome
test('calculateStreak returns 1 for first check-in', () => {});

// Bad: Vague description
test('streak test 1', () => {});
```

**Mocking Best Practices**:
```javascript
// Mock at top of test file
jest.mock('airtable');
jest.mock('axios');

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Restore mocks after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
```

**CI/CD Integration** (future):
- Run tests on every push (GitHub Actions)
- Fail build if tests don't pass
- Generate coverage reports
- Post coverage to PR comments

**Testing Documentation**:
- Update README with testing instructions
- Document how to run tests locally
- Document how to run smoke tests
- Include example test output

**Manual Testing Checklist** (for final validation):
- [ ] First check-in shows "Welcome" message
- [ ] Consecutive check-in shows streak increment
- [ ] Broken streak shows "Welcome back" message
- [ ] Personal best shows "New record" message
- [ ] Grace date prevents streak break
- [ ] DST transition doesn't break streaks
- [ ] Circle.so custom fields update correctly
- [ ] Airtable streaks table populates correctly
- [ ] Duplicate check-in returns existing streak

**Known Testing Challenges**:
- **Date/Time Testing**: Fixed dates help, but DST transitions are complex
- **External APIs**: Mocks may not match real API behavior (test in staging)
- **Race Conditions**: Multiple concurrent check-ins (acceptable for MVP, test in future)
- **Data Consistency**: Circle.so vs Airtable sync (test dual write, add reconciliation in future)

**Test Maintenance Strategy**:
- Review and update tests when behavior changes
- Add tests for every bug fix (regression prevention)
- Refactor tests when code is refactored
- Delete obsolete tests (avoid test cruft)

---

**Next Steps**: This Story is READY for task breakdown. Should be done incrementally alongside other stories (TDD approach). Final validation before Epic completion. Consider this story "done" when all other stories have comprehensive tests and overall coverage is 90%+.

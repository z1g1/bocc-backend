# Tasks for STORY-008: Comprehensive Testing

**Story**: [[STORY-008]] - Comprehensive Testing
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: High (Quality Assurance)
**Total Tasks**: 15
**Estimated Time**: 8-10 hours (ongoing throughout Epic)

## Overview

Ensure 90%+ test coverage, comprehensive unit and integration tests, realistic smoke tests. Validates all Epic functionality before production deployment.

## Dependencies
ALL other stories (validates their implementations)

## Tasks

### Phase 1: Unit Test Expansion (TDD throughout other stories)
### TASK-072: Ensure streaks.js has 95%+ coverage
**Type**: Test | **Time**: 1 hour
Verify all streak calculation paths covered, add missing edge case tests.
**Done**: 95%+ coverage on streaks.js.

### TASK-073: Ensure graceDates.js has 90%+ coverage
**Type**: Test | **Time**: 45 min
Verify all grace date functions covered, add cache and error scenario tests.
**Done**: 90%+ coverage on graceDates.js.

### TASK-074: Ensure circle.js bug fix has 90%+ coverage
**Type**: Test | **Time**: 45 min
Verify incrementCheckinCount and updateStreakFields fully tested.
**Done**: 90%+ coverage on Circle.so code.

### TASK-075: Ensure airtable.js streaks code has 90%+ coverage
**Type**: Test | **Time**: 45 min
Verify upsert pattern fully tested, all branches covered.
**Done**: 90%+ coverage on Airtable streaks code.

### Phase 2: Integration Tests
### TASK-076: End-to-end check-in with streak tracking
**Type**: Integration Test | **Time**: 1.5 hours
Test complete flow: check-in → calculate streak → update Circle.so → update Airtable → return message.
**Done**: 5+ integration tests, all pass.

### TASK-077: Multiple consecutive check-ins scenario
**Type**: Integration Test | **Time**: 1 hour
Simulate weekly check-ins over 10 weeks, verify streak increments correctly.
**Done**: Streak reaches 10, longestStreak updates.

### TASK-078: Broken streak recovery scenario
**Type**: Integration Test | **Time**: 1 hour
Simulate missed week, verify streak resets, then rebuilds.
**Done**: Streak breaks to 1, then increments again.

### TASK-079: Grace date scenario
**Type**: Integration Test | **Time**: 1 hour
Simulate missed week with grace date, verify streak continues.
**Done**: Grace date prevents break, streak increments.

### Phase 3: Smoke Tests
### TASK-080: Enhance smoke-test.sh with streak scenarios
**Type**: Test | **Time**: 1 hour
Add 5+ streak scenarios to smoke test: first check-in, consecutive, broken, grace date, personal best.
```bash
# Scenario 1: First check-in
# Scenario 2: Consecutive week
# Scenario 3: Broken streak
# Scenario 4: Grace date
# Scenario 5: Personal best
```
**Done**: Smoke test covers all major scenarios.

### TASK-081: Create manual-streak-test.sh
**Type**: Test | **Time**: 1 hour
Manual testing script with step-by-step verification, includes checking Circle.so and Airtable values.
**Done**: Manual test script created, documented.

### Phase 4: Coverage & Quality
### TASK-082: Run Jest coverage report
**Type**: Validation | **Time**: 30 min
```bash
npm test -- --coverage
```
Verify 90%+ overall coverage on new code.
**Done**: Coverage report shows 90%+, HTML report generated.

### TASK-083: Review and fix flaky tests
**Type**: Refactor | **Time**: 1 hour
Identify tests that fail intermittently, fix with deterministic data/mocking.
**Done**: All tests run consistently, no flaky tests.

### TASK-084: Add test documentation to README
**Type**: Documentation | **Time**: 45 min
Document how to run tests, interpret coverage, run smoke tests, manual testing procedures.
**Done**: README has testing section, clear instructions.

### Phase 5: Final Validation
### TASK-085: Staging environment full test
**Type**: Integration Test | **Time**: 2 hours
Deploy to staging, run all tests against real APIs, verify Circle.so and Airtable updates.
**Done**: All tests pass in staging, data verified.

### TASK-086: Performance testing
**Type**: Validation | **Time**: 1 hour
Verify check-in response time <2s, streak calculation <100ms, no memory leaks.
**Done**: Performance targets met, no issues found.

## Summary
**Total**: 15 tasks | **Time**: 8-10 hours (spread throughout Epic)
**Success**: 90%+ coverage, all tests pass, staging validated, production-ready.

**Testing Approach**: TDD throughout (tests first, then implementation). STORY-008 consolidates and validates all testing.

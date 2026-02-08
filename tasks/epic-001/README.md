# Tasks for EPIC-001: Visit Count and Streak Tracking System

## Overview

This directory contains task breakdowns for all 8 User Stories in EPIC-001. Tasks follow Test-Driven Development (TDD) approach: write tests first (RED), implement to pass tests (GREEN), refactor while keeping tests green.

**Total Stories**: 8
**Total Tasks**: 86
**Total Estimated Time**: 50-64 hours (3-4 weeks)

## Task Status Tracking

| Story | Tasks | Status | Est. Time | Notes |
|-------|-------|--------|-----------|-------|
| [[STORY-001]] Fix Visit Count Bug | 7 | Ready | 4-6 hours | CRITICAL - START HERE |
| [[STORY-007]] Timezone Handling | 8 | Ready | 6-8 hours | High priority, can parallel with STORY-001 |
| [[STORY-003]] Grace Date Management | 10 | Ready | 6-8 hours | Can parallel with above |
| [[STORY-002]] Streak Calculation Engine | 18 | Ready | 12-16 hours | CORE ALGORITHM - depends on 001, 007 |
| [[STORY-004]] Circle.so Custom Fields | 10 | Ready | 6-8 hours | Depends on 001, 002 |
| [[STORY-005]] Airtable Streaks Table | 12 | Ready | 7-9 hours | Depends on 002 |
| [[STORY-006]] Enhanced Check-in Response | 6 | Ready | 3-4 hours | Depends on 002, 004, 005 |
| [[STORY-008]] Comprehensive Testing | 15 | Ready | 8-10 hours | Ongoing - validates all stories |

## Recommended Execution Order

### Week 1: Foundation (CRITICAL)
**Priority: Fix bugs and set up infrastructure**

1. **Start Here**: [[STORY-001-tasks]] - Fix Visit Count Bug
   - Tasks: TASK-001 through TASK-007
   - Time: 4-6 hours
   - Why first: CRITICAL production bug, blocks all other stories
   - Deploy immediately after testing

2. **Parallel Work**: [[STORY-007-tasks]] - Timezone Handling
   - Tasks: TASK-008 through TASK-015
   - Time: 6-8 hours
   - Why: Foundation for streak calculation, no dependencies
   - Can start while STORY-001 is in review/deployment

3. **Parallel Work**: [[STORY-003-tasks]] - Grace Date Management
   - Tasks: TASK-016 through TASK-025
   - Time: 6-8 hours
   - Why: Independent infrastructure, no blockers
   - Can work alongside STORY-007

**Week 1 Deliverable**: Bug fixed in production, timezone utilities ready, grace dates infrastructure complete

---

### Week 2: Core Algorithm
**Priority: Implement streak calculation logic**

4. **Main Focus**: [[STORY-002-tasks]] - Streak Calculation Engine
   - Tasks: TASK-026 through TASK-043
   - Time: 12-16 hours
   - Why: Core algorithm for entire Epic
   - Depends on: STORY-001 (fixed custom fields), STORY-007 (timezone utils)
   - Consumes: STORY-003 (grace dates)

**Week 2 Deliverable**: Streak calculation working correctly with all edge cases (DST, grace dates, year boundary)

---

### Week 3: Storage Integration
**Priority: Dual write to Circle.so and Airtable**

5. **Parallel Work**: [[STORY-004-tasks]] - Circle.so Custom Field Integration
   - Tasks: TASK-044 through TASK-053
   - Time: 6-8 hours
   - Why: Primary storage for workflow automations
   - Depends on: STORY-001 (fixed updateMemberCustomField), STORY-002 (streak values)

6. **Parallel Work**: [[STORY-005-tasks]] - Airtable Streaks Table
   - Tasks: TASK-054 through TASK-065
   - Time: 7-9 hours
   - Why: Secondary storage for reporting/analytics
   - Depends on: STORY-002 (streak values)
   - Can develop alongside STORY-004

**Week 3 Deliverable**: Streak data stored in both Circle.so and Airtable, dual write working

---

### Week 4: Polish & Validation
**Priority: User experience and quality assurance**

7. **Quick Win**: [[STORY-006-tasks]] - Enhanced Check-in Response Messaging
   - Tasks: TASK-066 through TASK-071
   - Time: 3-4 hours
   - Why: User-facing messages, motivational
   - Depends on: STORY-002, STORY-004, STORY-005 (all streak data available)

8. **Ongoing**: [[STORY-008-tasks]] - Comprehensive Testing
   - Tasks: TASK-072 through TASK-086
   - Time: 8-10 hours (done incrementally throughout)
   - Why: Validates entire Epic before production
   - Depends on: All other stories

**Week 4 Deliverable**: User-facing messages live, 90%+ test coverage, staging fully validated, ready for production

---

## Task Numbering

Tasks are numbered sequentially across all stories:

- **TASK-001 to TASK-007**: STORY-001 (Fix Visit Count Bug)
- **TASK-008 to TASK-015**: STORY-007 (Timezone Handling)
- **TASK-016 to TASK-025**: STORY-003 (Grace Date Management)
- **TASK-026 to TASK-043**: STORY-002 (Streak Calculation Engine)
- **TASK-044 to TASK-053**: STORY-004 (Circle.so Custom Fields)
- **TASK-054 to TASK-065**: STORY-005 (Airtable Streaks Table)
- **TASK-066 to TASK-071**: STORY-006 (Enhanced Check-in Response)
- **TASK-072 to TASK-086**: STORY-008 (Comprehensive Testing)

## TDD Workflow

All tasks follow Test-Driven Development:

### Red Phase (Write Tests First)
- Write unit tests for expected behavior
- Tests should fail initially (function not implemented)
- Tests define the contract/API

### Green Phase (Implement to Pass)
- Write minimal code to make tests pass
- Focus on correctness, not optimization
- All tests should pass

### Refactor Phase (Improve Code)
- Clean up implementation
- Optimize performance
- Add documentation
- Keep all tests passing

**Example from STORY-001**:
1. TASK-001: Write tests for getMemberCustomField (RED)
2. TASK-003: Implement getMemberCustomField (GREEN)
3. TASK-005: Refactor and expand coverage (REFACTOR)

## Task Dependencies Graph

```
STORY-001 (CRITICAL - START HERE)
  ↓
STORY-002 (Streak Engine) ← STORY-007 (Timezone) + STORY-003 (Grace Dates)
  ↓
STORY-004 (Circle.so) + STORY-005 (Airtable) ← can parallel
  ↓
STORY-006 (Messaging)
  ↓
STORY-008 (Testing - ongoing validation)
```

**Legend**:
- `→` Sequential dependency (must complete before)
- `+` Can be developed in parallel
- `←` Consumes output from

## Parallel Work Opportunities

**Week 1**:
- STORY-001 (one person) + STORY-007 (another person) + STORY-003 (third person)

**Week 3**:
- STORY-004 (Circle.so) and STORY-005 (Airtable) can be developed simultaneously by different developers

**Ongoing**:
- STORY-008 (Testing) tasks are done incrementally alongside implementation tasks

## Manual Setup Required

Some tasks require manual steps before automation can proceed:

### Before STORY-003
- **TASK-016**: Create `grace_dates` table in Airtable (manual UI)

### Before STORY-004
- **TASK-044**: Add custom fields to Circle.so community settings (manual UI)

### Before STORY-005
- **TASK-054**: Create `streaks` table in Airtable (manual UI)

These are flagged with "MANUAL" type and include step-by-step instructions.

## Testing Strategy

### Unit Tests (80% of effort)
- Located in `tests/` directory
- Mock external APIs (Airtable, Circle.so)
- Fast execution (<10 seconds)
- Run on every code change

### Integration Tests (15% of effort)
- Test end-to-end flows
- Use staging APIs
- Verify data in external systems
- Run before deployment

### Smoke Tests (5% of effort)
- Test deployed API with realistic scenarios
- Verify production behavior
- Run after deployment
- Manual verification

**Coverage Target**: 90%+ on new code (streaks, graceDates, circle bug fix, airtable streaks)

## Success Metrics

### Functional
- [ ] Visit count increments correctly (verified in Circle.so)
- [ ] Streaks calculate accurately for weekly Tuesday events
- [ ] Grace dates prevent streak breaks
- [ ] Dual write to Circle.so and Airtable succeeds
- [ ] API response includes motivational streak messages

### Quality
- [ ] 90%+ unit test coverage on new code
- [ ] All smoke tests pass (local and production)
- [ ] API response time <2 seconds (including streak calculation)
- [ ] Zero production errors (first 2 weeks post-launch)

### Documentation
- [ ] Code comments explain streak logic
- [ ] README updated with new features
- [ ] CIRCLE_PERMISSIONS.md updated
- [ ] Grace date admin guide created

## Implementation Notes

### Technology Stack
- **Language**: Node.js (CommonJS modules, not ES6)
- **Serverless**: Netlify Functions
- **Date Handling**: date-fns + date-fns-tz (new dependencies)
- **Testing**: Jest (143 existing tests + 50+ new tests)
- **APIs**: Circle.so Admin API v2, Airtable SDK

### Code Patterns to Follow
- **Module System**: `require()` and `module.exports` (NO ES6 imports)
- **Error Handling**: try-catch with console.error, graceful degradation
- **Validation**: Use existing `escapeAirtableFormula()` for all Airtable queries
- **Pure Functions**: Streak calculation has no side effects (testable in isolation)

### Security Requirements
- Input validation on all external data
- Formula injection prevention for Airtable queries
- No new PII collection (streaks are derived from existing check-ins)
- Follow principle of least privilege for API permissions

## Files Created/Modified

### New Files
- `netlify/functions/utils/streaks.js` - Streak calculation engine
- `netlify/functions/utils/graceDates.js` - Grace date management
- `tests/streaks.test.js` - Streak engine tests (50+ tests)
- `tests/graceDates.test.js` - Grace date tests (15+ tests)
- `tests/airtable-streaks.test.js` - Airtable storage tests (12+ tests)
- `tests/manual-streak-test.sh` - Manual testing scenarios
- `docs/grace-dates-admin-guide.md` - Admin documentation
- `docs/streak-calculation.md` - Algorithm documentation

### Modified Files
- `netlify/functions/utils/circle.js` - Bug fix + streak custom fields
- `netlify/functions/utils/airtable.js` - Streaks table operations
- `netlify/functions/checkin.js` - Integrate streak tracking
- `tests/circle.test.js` - Expanded tests for bug fix and custom fields
- `tests/checkin.test.js` - Streak integration tests
- `tests/smoke-test.sh` - Enhanced with streak scenarios
- `package.json` - Add date-fns, date-fns-tz dependencies
- `CIRCLE_PERMISSIONS.md` - Updated with new custom fields

## Next Steps

**Immediate**: Start with TASK-001 (Write tests for getMemberCustomField)

**Handoff**: See `.claude-temp/handoff/task-implementation-ready.md` for detailed implementation context

**Questions**: Refer to story files for detailed acceptance criteria and technical notes

---

**Last Updated**: 2026-02-07
**Created By**: task-planner agent (autonomous mode)
**Total Tasks**: 86 across 8 stories
**All Stories**: Ready for implementation

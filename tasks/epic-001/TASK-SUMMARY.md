# EPIC-001 Task Breakdown Summary

## Task Planning Complete ✅

**Date**: 2026-02-07
**Epic**: Visit Count and Streak Tracking System
**Stories Processed**: 8 of 8 (100%)
**Tasks Created**: 86
**Documentation**: 2,752 lines
**Estimated Effort**: 50-64 hours (3-4 weeks)

---

## Quick Reference

### Start Here
**First Task**: TASK-001 - Write unit tests for getMemberCustomField
**File**: `/Users/zack/projects/bocc-backend/tasks/epic-001/STORY-001-tasks.md`
**Why**: CRITICAL production bug - visit counts stuck at 1

### Task Files Created
1. `STORY-001-tasks.md` - Fix Visit Count Bug (7 tasks, 4-6 hrs)
2. `STORY-007-tasks.md` - Timezone Handling (8 tasks, 6-8 hrs)
3. `STORY-003-tasks.md` - Grace Date Management (10 tasks, 6-8 hrs)
4. `STORY-002-tasks.md` - Streak Calculation Engine (18 tasks, 12-16 hrs)
5. `STORY-004-tasks.md` - Circle.so Custom Fields (10 tasks, 6-8 hrs)
6. `STORY-005-tasks.md` - Airtable Streaks Table (12 tasks, 7-9 hrs)
7. `STORY-006-tasks.md` - Enhanced Check-in Response (6 tasks, 3-4 hrs)
8. `STORY-008-tasks.md` - Comprehensive Testing (15 tasks, 8-10 hrs)

### Index Files
- `README.md` - Complete task index with execution order
- `TASK-SUMMARY.md` - This file (quick reference)

### Handoff File
- `.claude-temp/handoff/task-implementation-ready.md` - Implementation context

---

## Task Breakdown by Type

### Test Tasks (TDD Red Phase): 44 tasks
- Unit tests for all new functions
- Integration tests for end-to-end flows
- Smoke tests for realistic scenarios

### Implementation Tasks (TDD Green Phase): 30 tasks
- Core streak calculation algorithm
- Timezone conversion utilities
- Grace date management
- Storage integration (Circle.so + Airtable)
- Message formatting

### Setup Tasks (Manual): 3 tasks
- Create Airtable tables (grace_dates, streaks)
- Add Circle.so custom fields

### Validation Tasks: 9 tasks
- Manual testing in staging
- Coverage reports
- Performance testing
- Documentation

---

## Critical Path (Must Do in Order)

```
STORY-001 (Bug Fix)
    ↓
STORY-002 (Streak Engine) ← Requires STORY-007 (Timezone)
    ↓
STORY-004 (Circle.so) + STORY-005 (Airtable)
    ↓
STORY-006 (Messaging)
    ↓
STORY-008 (Final Testing)
```

**Parallel Opportunities**:
- Week 1: STORY-007 + STORY-003 (while STORY-001 in review)
- Week 3: STORY-004 + STORY-005 (independent storage systems)

---

## By Priority

### CRITICAL (Start Immediately)
1. **STORY-001**: Fix Visit Count Bug
   - Tasks: TASK-001 to TASK-007
   - Impact: Production bug, blocks all other stories
   - Deploy: Immediately after completion

### HIGH (Week 1-2)
2. **STORY-007**: Timezone Handling
3. **STORY-003**: Grace Date Management
4. **STORY-002**: Streak Calculation Engine

### MEDIUM (Week 3-4)
5. **STORY-004**: Circle.so Custom Fields
6. **STORY-005**: Airtable Streaks Table
7. **STORY-006**: Enhanced Check-in Response

### ONGOING (Throughout)
8. **STORY-008**: Comprehensive Testing

---

## TDD Task Distribution

### Red Phase (Write Tests First): 44 tasks
Examples:
- TASK-001: Write tests for getMemberCustomField
- TASK-009: Write tests for timezone conversion
- TASK-017: Write tests for grace date query
- TASK-026: Write tests for calculateStreak

### Green Phase (Implement): 30 tasks
Examples:
- TASK-003: Implement getMemberCustomField
- TASK-012: Implement timezone utilities
- TASK-020: Implement grace date query
- TASK-034: Implement calculateStreak

### Refactor Phase (Optimize): Built into tasks
Examples:
- TASK-005: Expand coverage
- TASK-015: Verify DST edge cases
- TASK-041: Refactor and optimize
- TASK-083: Review and fix flaky tests

---

## Dependencies

### External Libraries
```bash
npm install date-fns@^2.30.0 date-fns-tz@^2.0.0
```

### Manual Setup (Before Implementation)
1. Airtable `grace_dates` table (TASK-016)
2. Circle.so custom fields: currentStreak, longestStreak, lastCheckinDate (TASK-044)
3. Airtable `streaks` table (TASK-054)

### Story Dependencies
- STORY-002 depends on: STORY-001, STORY-007
- STORY-004 depends on: STORY-001, STORY-002
- STORY-005 depends on: STORY-002
- STORY-006 depends on: STORY-002, STORY-004, STORY-005

---

## Key Deliverables by Week

### Week 1
- [ ] Bug fixed: Visit counts increment correctly
- [ ] Timezone utilities: Buffalo time, DST handling
- [ ] Grace dates: Airtable table + query functions

### Week 2
- [ ] Streak calculation: Core algorithm complete
- [ ] Edge cases: DST, grace dates, year boundary
- [ ] Integration: Check-in handler calls streak engine

### Week 3
- [ ] Circle.so: Custom fields update on check-in
- [ ] Airtable: Streaks table populates
- [ ] Dual write: Both systems updated together

### Week 4
- [ ] Messages: Motivational streak messages
- [ ] Testing: 90%+ coverage achieved
- [ ] Production: Deployed and validated

---

## Success Metrics

### Code Quality
- [ ] 90%+ test coverage on new code
- [ ] 193+ total tests (143 existing + 50+ new)
- [ ] Zero linting errors
- [ ] Zero flaky tests

### Functionality
- [ ] Visit counts increment (not stuck at 1)
- [ ] Streaks calculate accurately
- [ ] Grace dates prevent breaks
- [ ] Dual write succeeds
- [ ] Messages motivational

### Performance
- [ ] API response <2 seconds
- [ ] Streak calculation <100ms
- [ ] No memory leaks
- [ ] No production errors

---

## File Organization

```
tasks/epic-001/
├── README.md                    (Full index + execution guide)
├── TASK-SUMMARY.md             (This quick reference)
├── STORY-001-tasks.md          (7 tasks - Bug Fix)
├── STORY-002-tasks.md          (18 tasks - Streak Engine)
├── STORY-003-tasks.md          (10 tasks - Grace Dates)
├── STORY-004-tasks.md          (10 tasks - Circle.so)
├── STORY-005-tasks.md          (12 tasks - Airtable)
├── STORY-006-tasks.md          (6 tasks - Messaging)
├── STORY-007-tasks.md          (8 tasks - Timezone)
└── STORY-008-tasks.md          (15 tasks - Testing)
```

---

## Implementation Ready ✅

All tasks have:
- Clear objectives
- Estimated time
- Dependencies documented
- Test specifications (TDD)
- Implementation guidance
- Definition of done
- File paths specified

**Next Step**: Open STORY-001-tasks.md and begin with TASK-001

---

## Questions?

**Detailed Context**: See `.claude-temp/handoff/task-implementation-ready.md`
**Story Requirements**: See `stories/epic-001/STORY-XXX-*.md`
**Epic Overview**: See `epics/EPIC-001-visit-streak-tracking.md`

**Ready to start? Begin with TASK-001!** 🚀

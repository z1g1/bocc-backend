# Task Planning Complete - Ready for Implementation

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Task Breakdown Complete**: 2026-02-07
**Total Tasks Created**: 86 tasks across 8 stories
**Total Estimated Effort**: 50-64 hours (3-4 weeks)

---

## Executive Summary

All 8 User Stories from EPIC-001 have been broken down into 86 actionable, test-driven tasks. Tasks follow TDD methodology (Red-Green-Refactor) and include clear definitions of done, time estimates, and dependencies.

### Critical Path to Production

**Week 1 (Foundation)**: Fix critical bug + infrastructure
**Week 2 (Algorithm)**: Implement core streak calculation
**Week 3 (Storage)**: Dual write to Circle.so + Airtable
**Week 4 (Polish)**: User messaging + comprehensive testing

### Recommended Starting Point

**START HERE**: [[TASK-001]] - Write unit tests for getMemberCustomField
**File**: `/Users/zack/projects/bocc-backend/tasks/epic-001/STORY-001-tasks.md`
**Why**: Fixes CRITICAL production bug that blocks all other work

---

## Task Distribution by Story

| Story | Task Range | Count | Est. Time | Priority |
|-------|------------|-------|-----------|----------|
| STORY-001: Fix Visit Count Bug | TASK-001 to TASK-007 | 7 | 4-6 hrs | CRITICAL |
| STORY-007: Timezone Handling | TASK-008 to TASK-015 | 8 | 6-8 hrs | High |
| STORY-003: Grace Date Management | TASK-016 to TASK-025 | 10 | 6-8 hrs | Medium |
| STORY-002: Streak Calculation Engine | TASK-026 to TASK-043 | 18 | 12-16 hrs | High |
| STORY-004: Circle.so Custom Fields | TASK-044 to TASK-053 | 10 | 6-8 hrs | High |
| STORY-005: Airtable Streaks Table | TASK-054 to TASK-065 | 12 | 7-9 hrs | Medium |
| STORY-006: Enhanced Check-in Response | TASK-066 to TASK-071 | 6 | 3-4 hrs | Medium |
| STORY-008: Comprehensive Testing | TASK-072 to TASK-086 | 15 | 8-10 hrs | High |

---

## Technology Stack & Dependencies

### NPM Packages to Install
```bash
npm install date-fns@^2.30.0 date-fns-tz@^2.0.0
```

### Environment Variables (already configured)
- `AIRTABLE_API_KEY` - Airtable authentication
- `AIRTABLE_BASE_ID` - BOCC base identifier
- `CIRCLE_API_TOKEN` - Circle.so Admin API v2 token

### Manual Setup Required

**Before STORY-003** (TASK-016):
- Create `grace_dates` table in Airtable
- Fields: id, date, eventId, reason, createdAt
- Add 2 sample grace dates for testing

**Before STORY-004** (TASK-044):
- Add 3 custom fields in Circle.so community settings:
  - `currentStreak` (Number)
  - `longestStreak` (Number)
  - `lastCheckinDate` (Text)

**Before STORY-005** (TASK-054):
- Create `streaks` table in Airtable
- Fields: id, attendeeId (link), eventId, currentStreak, longestStreak, lastCheckinDate, lastStreakUpdate
- Create views: Leaderboard, Active Streaks, Personal Bests

All manual setup tasks include detailed step-by-step instructions in their task files.

---

## Development Workflow

### TDD Cycle (Used Throughout)

**Red Phase**: Write failing tests
- Tests define expected behavior
- Tests should fail initially (function not implemented yet)
- Example: TASK-001, TASK-002

**Green Phase**: Implement to pass tests
- Write minimal code to make tests pass
- Focus on correctness, not optimization
- Example: TASK-003, TASK-004

**Refactor Phase**: Improve code while tests stay green
- Clean up implementation
- Optimize performance
- Add documentation
- Example: TASK-005, TASK-041

### Git Workflow

All development on `dev` branch:
```bash
git checkout dev
git pull origin dev

# After completing each task:
git add .
git commit -m "Complete TASK-XXX: Brief description

- Test implementation details
- What was accomplished
- Any notes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin dev
```

**Deploy STORY-001 immediately** after completion (critical bug fix).
**Deploy other stories together** after all complete (avoid partial feature deployment).

---

## Code Patterns & Best Practices

### Module System
**CRITICAL**: Use CommonJS, NOT ES6 modules
```javascript
// CORRECT
const { toBuffaloTime } = require('./utils/streaks');
module.exports = { calculateStreak };

// WRONG - DO NOT USE
import { toBuffaloTime } from './utils/streaks';
export { calculateStreak };
```

### Error Handling Pattern
```javascript
try {
  // Operation
  const result = await externalAPI();
  return result;
} catch (error) {
  console.error('Descriptive error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.status, error.response.data);
  }
  // Don't throw for non-critical operations (graceful degradation)
  return null;
}
```

### Airtable Query Pattern
**ALWAYS** use formula injection protection:
```javascript
const { escapeAirtableFormula } = require('./utils/validation');
const sanitizedId = escapeAirtableFormula(eventId);
const formula = `{eventId} = '${sanitizedId}'`;
```

### Date Handling Pattern
**ALWAYS** convert to Buffalo timezone before comparison:
```javascript
const { toBuffaloTime, isSameTuesday } = require('./utils/streaks');
const buffaloDate = toBuffaloTime(utcDate);
// Now safe to compare
```

---

## Task Dependency Graph

```
STORY-001 (Fix Bug) ← START HERE (CRITICAL)
    ↓
    ├─→ STORY-002 (Streak Engine) ← STORY-007 (Timezone)
    │                              ← STORY-003 (Grace Dates)
    │   ↓
    │   ├─→ STORY-004 (Circle.so Storage)
    │   ├─→ STORY-005 (Airtable Storage)
    │   ↓
    │   STORY-006 (Messaging)
    ↓
STORY-008 (Testing - ongoing)
```

**Critical Path**: STORY-001 → STORY-002 → STORY-004/005 → STORY-006
**Parallel Opportunities**: STORY-007 + STORY-003 (Week 1), STORY-004 + STORY-005 (Week 3)

---

## Test Coverage Requirements

### Target: 90%+ Coverage

**Critical Modules** (95%+ coverage required):
- `netlify/functions/utils/streaks.js` - Core algorithm
- `netlify/functions/utils/graceDates.js` - Infrastructure
- Bug fix code in `circle.js`

**Standard Modules** (90%+ coverage):
- Airtable streaks operations
- Check-in integration
- Message formatting

### Running Tests
```bash
# All unit tests
npm test

# With coverage
npm test -- --coverage

# Specific file
npm test tests/streaks.test.js

# Smoke tests (local)
npm run test:smoke-local

# Smoke tests (production - use debug flag)
npm run test:smoke-prod
```

---

## Implementation Checklist by Week

### Week 1: Foundation (CRITICAL)

**STORY-001 - Fix Visit Count Bug** (4-6 hours):
- [ ] TASK-001: Write tests for getMemberCustomField
- [ ] TASK-002: Write tests for fixed incrementCheckinCount
- [ ] TASK-003: Implement getMemberCustomField
- [ ] TASK-004: Fix incrementCheckinCount logic
- [ ] TASK-005: Expand test coverage
- [ ] TASK-006: Update smoke test
- [ ] TASK-007: Manual testing + deploy to production

**Deliverable**: Bug fixed in production, visit counts increment correctly

**STORY-007 - Timezone Handling** (6-8 hours):
- [ ] TASK-008: Install date-fns dependencies
- [ ] TASK-009 to TASK-011: Write timezone tests (conversion, week boundaries, DST)
- [ ] TASK-012 to TASK-014: Implement timezone utilities
- [ ] TASK-015: Verify DST edge cases

**Deliverable**: Timezone utilities ready for streak calculation

**STORY-003 - Grace Date Management** (6-8 hours):
- [ ] TASK-016: Create grace_dates table in Airtable (MANUAL)
- [ ] TASK-017 to TASK-019: Write grace date tests
- [ ] TASK-020 to TASK-022: Implement grace date functions
- [ ] TASK-023 to TASK-025: Integration and documentation

**Deliverable**: Grace dates infrastructure ready

### Week 2: Core Algorithm

**STORY-002 - Streak Calculation Engine** (12-16 hours):
- [ ] TASK-026 to TASK-029: Write calculateStreak tests (basic, edge cases, grace dates, DST)
- [ ] TASK-030 to TASK-031: Write helper function tests
- [ ] TASK-032 to TASK-036: Implement core streak calculation
- [ ] TASK-037 to TASK-038: Implement helper functions
- [ ] TASK-039 to TASK-043: Integration, logging, documentation

**Deliverable**: Streak calculation working with all edge cases

### Week 3: Storage Integration

**STORY-004 - Circle.so Custom Fields** (6-8 hours):
- [ ] TASK-044: Add custom fields to Circle.so (MANUAL)
- [ ] TASK-045 to TASK-046: Write custom field tests
- [ ] TASK-047 to TASK-048: Implement updateStreakFields
- [ ] TASK-049 to TASK-053: Integration, retry logic, documentation

**Deliverable**: Streak data stored in Circle.so for workflow automations

**STORY-005 - Airtable Streaks Table** (7-9 hours):
- [ ] TASK-054: Create streaks table in Airtable (MANUAL)
- [ ] TASK-055 to TASK-058: Write upsert tests
- [ ] TASK-059 to TASK-062: Implement find/create/update/upsert
- [ ] TASK-063 to TASK-065: Integration and validation

**Deliverable**: Streak data stored in Airtable for reporting

### Week 4: Polish & Validation

**STORY-006 - Enhanced Check-in Response** (3-4 hours):
- [ ] TASK-066: Write message formatting tests
- [ ] TASK-067 to TASK-069: Implement formatStreakMessage
- [ ] TASK-070 to TASK-071: Response structure and validation

**Deliverable**: Motivational messages in API responses

**STORY-008 - Comprehensive Testing** (8-10 hours, ongoing):
- [ ] TASK-072 to TASK-075: Ensure coverage targets met
- [ ] TASK-076 to TASK-079: Integration tests
- [ ] TASK-080 to TASK-081: Smoke tests
- [ ] TASK-082 to TASK-084: Coverage reports and documentation
- [ ] TASK-085 to TASK-086: Staging validation and performance testing

**Deliverable**: 90%+ coverage, staging validated, production-ready

---

## File Locations

### Task Documentation
```
/Users/zack/projects/bocc-backend/tasks/epic-001/
├── README.md                          (this index)
├── STORY-001-tasks.md                 (7 tasks)
├── STORY-002-tasks.md                 (18 tasks)
├── STORY-003-tasks.md                 (10 tasks)
├── STORY-004-tasks.md                 (10 tasks)
├── STORY-005-tasks.md                 (12 tasks)
├── STORY-006-tasks.md                 (6 tasks)
├── STORY-007-tasks.md                 (8 tasks)
└── STORY-008-tasks.md                 (15 tasks)
```

### Implementation Files (to be created)
```
netlify/functions/utils/
├── streaks.js                         (NEW - STORY-002, STORY-007)
└── graceDates.js                      (NEW - STORY-003)

tests/
├── streaks.test.js                    (NEW - 50+ tests)
├── graceDates.test.js                 (NEW - 15+ tests)
└── airtable-streaks.test.js          (NEW - 12+ tests)

docs/
├── grace-dates-admin-guide.md         (NEW - STORY-003)
└── streak-calculation.md              (NEW - STORY-002)
```

### Modified Files
- `netlify/functions/utils/circle.js` - Bug fix + streak custom fields
- `netlify/functions/utils/airtable.js` - Streaks table operations
- `netlify/functions/checkin.js` - Integrate streak tracking
- `tests/circle.test.js` - Expanded tests
- `tests/checkin.test.js` - Integration tests
- `tests/smoke-test.sh` - Enhanced scenarios
- `package.json` - Dependencies

---

## Success Criteria

### Functional ✓
- [ ] Visit counts increment correctly (not stuck at 1)
- [ ] Streaks calculate accurately for weekly Tuesday events
- [ ] Grace dates prevent streak breaks (declared holidays)
- [ ] Circle.so custom fields update (enables workflow automations)
- [ ] Airtable streaks table populates (enables reporting)
- [ ] API response includes motivational streak messages

### Quality ✓
- [ ] 90%+ code coverage on new modules
- [ ] All unit tests pass (193+ tests total: 143 existing + 50+ new)
- [ ] All integration tests pass
- [ ] All smoke tests pass (local and production)
- [ ] API response time <2 seconds (including streak calculation)
- [ ] Streak calculation <100ms (pure functions, no API calls)

### Deployment ✓
- [ ] STORY-001 deployed to production immediately (bug fix)
- [ ] Remaining stories deployed together (complete feature)
- [ ] Staging fully tested before production
- [ ] Zero production errors (first 2 weeks post-launch)
- [ ] Netlify function logs show correct behavior

### Documentation ✓
- [ ] Code comments explain streak logic
- [ ] README updated with streak features
- [ ] CIRCLE_PERMISSIONS.md updated with custom fields
- [ ] Admin guide created for managing grace dates
- [ ] Testing documentation complete

---

## Known Risks & Mitigation

### Risk 1: DST Transition Edge Cases
**Mitigation**: Extensive testing with specific DST dates (March 10, November 3, 2024), use date-fns-tz library that handles DST automatically.

### Risk 2: Race Conditions (Concurrent Check-ins)
**Mitigation**: Acceptable for MVP (last-write-wins), document limitation, consider atomic operations in future.

### Risk 3: Circle.so / Airtable API Failures
**Mitigation**: Graceful degradation (log error, don't block check-in), dual storage provides redundancy.

### Risk 4: Historical Data Inconsistency
**Mitigation**: Bug fix doesn't backfill historical counts, document as known limitation, plan future Epic for backfill if needed.

### Risk 5: Timezone Changes
**Mitigation**: Hardcoded to America/New_York for MVP, structure allows future expansion to multiple timezones.

---

## Next Actions

### Immediate (Today)
1. Review this handoff document
2. Open `/Users/zack/projects/bocc-backend/tasks/epic-001/STORY-001-tasks.md`
3. Start with **TASK-001**: Write unit tests for getMemberCustomField
4. Follow TDD cycle: Red → Green → Refactor

### This Week
1. Complete STORY-001 (CRITICAL - deploy to production)
2. Start STORY-007 (timezone utilities)
3. Start STORY-003 (grace dates) in parallel
4. Manual setup: Airtable grace_dates table, Circle.so custom fields

### This Sprint (3-4 weeks)
1. Week 1: Foundation (STORY-001, 007, 003)
2. Week 2: Core Algorithm (STORY-002)
3. Week 3: Storage (STORY-004, 005)
4. Week 4: Polish (STORY-006, 008)

---

## Questions or Issues?

**Story Details**: See `/Users/zack/projects/bocc-backend/stories/epic-001/`
**Epic Context**: See `/Users/zack/projects/bocc-backend/epics/EPIC-001-visit-streak-tracking.md`
**Original Requirements**: See `/Users/zack/projects/bocc-backend/.claude-temp/handoff/story-to-task.md`

**Codebase Patterns**: Refer to existing code in:
- `netlify/functions/utils/circle.js` - Circle.so patterns
- `netlify/functions/utils/airtable.js` - Airtable patterns
- `netlify/functions/utils/validation.js` - Validation patterns
- `tests/circle.test.js` - Testing patterns

---

**Task Planning Complete**: 2026-02-07
**Total Tasks**: 86
**Ready for Implementation**: ✅ YES
**Recommended Start**: TASK-001 (Fix Visit Count Bug)
**Estimated Completion**: 3-4 weeks with 1-2 developers

🚀 **All 8 stories are READY. Begin implementation with STORY-001 (CRITICAL bug fix).**

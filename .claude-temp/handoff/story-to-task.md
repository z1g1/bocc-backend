# Story Planning Complete - Handoff to Task Planning

## Epic Context
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Stories Created**: 8
**Total Complexity**: 1 Large, 5 Medium, 2 Small
**Estimated Effort**: 3-4 weeks

## Stories Ready for Task Breakdown

All 8 stories are marked as "Ready" and contain complete acceptance criteria, technical implementation notes, and testing requirements. Stories should be broken down into tasks in the dependency order below.

### Priority 1: Critical Foundation (Week 1)

#### 1. [[STORY-001]] - Fix Visit Count Bug (Small - CRITICAL BLOCKER)
   - **Why first**: Production bug where `incrementCheckinCount` always resets to 1 instead of incrementing
   - **Blocks**: STORY-002, STORY-004, STORY-006 (all depend on reliable custom field updates)
   - **Key technical notes**:
     - Add `getMemberCustomField(memberId, fieldName)` function to fetch current value
     - Modify `incrementCheckinCount` to fetch → calculate new value → update
     - File: `netlify/functions/utils/circle.js`
     - Must handle null/undefined (new member) → default to 0
   - **Test approach**: TDD - write tests first, then implement
   - **Estimated tasks**: 5-7 tasks (fetch function, increment fix, tests, integration)

#### 2. [[STORY-007]] - Timezone Handling (Small - High Priority)
   - **Why early**: Required by STORY-002 (streak calculation), no dependencies
   - **Key technical notes**:
     - Add date-fns and date-fns-tz to package.json
     - Create timezone utilities: `toBuffaloTime()`, `isSameTuesday()`, etc.
     - All calculations use America/New_York timezone (EST/EDT with DST)
     - File: `netlify/functions/utils/streaks.js` or separate `utils/timezones.js`
   - **Test approach**: Fixed dates for DST edge cases (March 10, November 3)
   - **Estimated tasks**: 6-8 tasks (install deps, utility functions, DST tests)

#### 3. [[STORY-003]] - Grace Date Management (Medium)
   - **Why parallel**: Independent infrastructure, no blockers
   - **Key technical notes**:
     - Create Airtable `grace_dates` table (manual setup documented)
     - Create `getGraceDates(eventId)` function with per-request caching
     - File: `netlify/functions/utils/graceDates.js`
     - Uses existing Airtable SDK and escapeAirtableFormula
   - **Test approach**: Mock Airtable responses
   - **Estimated tasks**: 8-10 tasks (table creation, query functions, cache, tests)

### Priority 2: Core Algorithm (Week 2)

#### 4. [[STORY-002]] - Streak Calculation Engine (Large - CORE ALGORITHM)
   - **Why next**: Foundation for all storage and messaging stories
   - **Depends on**: STORY-001 (reliable custom fields), STORY-007 (timezone utilities)
   - **Key technical notes**:
     - Pure calculation functions (no API calls, no side effects)
     - `calculateStreak(lastCheckIn, currentCheckIn, previousStreak, longestStreak, eventCadence, graceDates)`
     - Week starts on Tuesday (weekStartsOn: 2) for BOCC events
     - Returns: `{ currentStreak, longestStreak, streakBroken, isPersonalBest }`
     - File: `netlify/functions/utils/streaks.js`
   - **Test approach**: Extensive unit tests (first check-in, consecutive, broken, grace dates, DST)
   - **Estimated tasks**: 15-20 tasks (core algorithm, helper functions, extensive tests, edge cases)

### Priority 3: Storage Integration (Week 3)

#### 5. [[STORY-004]] - Circle.so Custom Field Integration (Medium)
   - **Why next**: Primary storage for Circle.so workflows (badges, rewards)
   - **Depends on**: STORY-001 (bug fix), STORY-002 (streak values)
   - **Key technical notes**:
     - Manual setup: Add custom fields to Circle.so community settings
       - `currentStreak` (Number), `longestStreak` (Number), `lastCheckinDate` (Text)
     - Create `updateStreakFields(memberId, streakData)` function
     - Uses existing `updateMemberCustomField` (from STORY-001)
     - File: `netlify/functions/utils/circle.js`
   - **Test approach**: Mock axios, verify PATCH calls
   - **Estimated tasks**: 8-10 tasks (manual setup, update function, error handling, tests)

#### 6. [[STORY-005]] - Airtable Streaks Table (Medium)
   - **Why parallel with STORY-004**: Secondary storage for reporting/analytics
   - **Depends on**: STORY-002 (streak values)
   - **Key technical notes**:
     - Manual setup: Create Airtable `streaks` table (schema documented)
     - Upsert pattern: find existing record → update or create
     - Functions: `findStreakRecord()`, `createStreakRecord()`, `updateStreakRecord()`, `upsertStreakRecord()`
     - File: `netlify/functions/utils/airtable.js`
   - **Test approach**: Mock Airtable SDK
   - **Estimated tasks**: 10-12 tasks (table creation, find/create/update/upsert, tests)

### Priority 4: Integration & User Experience (Week 4)

#### 7. [[STORY-006]] - Enhanced Check-in Response Messaging (Small)
   - **Why next**: User-facing feature, depends on all storage completed
   - **Depends on**: STORY-002 (streak values), STORY-004 + STORY-005 (data stored)
   - **Key technical notes**:
     - Pure string formatting (no computation, no API calls)
     - `formatStreakMessage(streakData, isFirstCheckIn)` function
     - Messages: "Welcome!", "5-week streak!", "New record!", "Welcome back!"
     - Enhance JSON response: add `streakMessage` and `streakData` fields
     - File: `netlify/functions/checkin.js`
   - **Test approach**: Unit tests for all message variations
   - **Estimated tasks**: 5-6 tasks (format function, response enhancement, tests)

#### 8. [[STORY-008]] - Comprehensive Testing (Medium)
   - **Why ongoing**: Validates all other stories, done incrementally
   - **Depends on**: All stories (validates all implementations)
   - **Key technical notes**:
     - Target: 90%+ code coverage on new files
     - Unit tests for each module (streaks, graceDates, circle, airtable, checkin)
     - Integration tests for end-to-end check-in flow
     - Enhanced smoke tests with streak scenarios
     - Files: `tests/streaks.test.js`, `tests/graceDates.test.js`, etc.
   - **Test approach**: TDD throughout (tests written first for each story)
   - **Estimated tasks**: 15-20 tasks (test files, coverage, smoke tests, manual scenarios)

## Technical Context from Codebase

### Patterns to Follow

**Module System**: CommonJS (require/module.exports)
- All files use `.js` extension
- NO ES6 imports (`import/export`) - will break

**Error Handling**: Try-catch with logging
```javascript
try {
  // Operation
} catch (error) {
  console.error('Descriptive error:', error.message);
  if (error.response) {
    console.error('Response:', error.response.status, error.response.data);
  }
  // Don't throw if non-critical (e.g., Circle.so update failure)
}
```

**API Client**: Existing axios instance
- Circle.so: `circleApi` instance in `netlify/functions/utils/circle.js`
- Airtable: `base` instance in `netlify/functions/utils/airtable.js`

**Validation**: Existing utilities
- Use `escapeAirtableFormula()` for all Airtable queries (prevent injection)
- Use existing validation patterns from `netlify/functions/utils/validation.js`

**Testing**: Jest + Bash
- Unit tests: `tests/*.test.js` (143 existing tests)
- Smoke tests: `tests/*.sh` (end-to-end API testing)
- Run: `npm test` (unit), `npm run test:smoke-local` (integration)

### Required Setup/Infrastructure

**NPM Dependencies** (add to package.json):
```json
{
  "dependencies": {
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  }
}
```

**Circle.so Manual Setup** (before STORY-004 deployment):
1. Log into Circle.so admin dashboard
2. Settings → Community Settings → Custom Fields
3. Add fields: `currentStreak` (Number), `longestStreak` (Number), `lastCheckinDate` (Text)
4. Set visibility: Members can view, Admins can edit
5. Verify `checkinCount` field exists (should already exist)

**Airtable Manual Setup** (before STORY-005 deployment):
1. **Create `streaks` table**:
   - Fields: id (Auto), attendeeId (Link to attendees), eventId (Text), currentStreak (Number), longestStreak (Number), lastCheckinDate (Date), lastStreakUpdate (DateTime)
   - Views: Leaderboard (sort by currentStreak desc), Active Streaks (filter currentStreak > 0)

2. **Create `grace_dates` table** (before STORY-003 deployment):
   - Fields: id (Auto), date (Date), eventId (Text), reason (Long Text), createdAt (DateTime)
   - Add sample grace dates for testing: Dec 23, 2025 and Dec 30, 2025 (holiday weeks)

### Testing Strategy

**TDD Workflow** (for all stories):
1. Write tests first (define expected behavior)
2. Run tests (RED - they fail)
3. Implement minimal code to pass tests (GREEN)
4. Refactor while keeping tests green
5. Repeat for next feature

**Coverage Target**: 90%+ on new code
- Use Jest coverage: `npm test -- --coverage`
- Critical files (streaks.js, graceDates.js) should be 95%+

**Test Data**:
- Use fixed dates (not `new Date()`) for reproducibility
- DST test dates: March 10, 2024 (spring forward), November 3, 2024 (fall back)
- Debug flag: All test check-ins use `debug: "1"` to mark as test data

### Security Requirements (applies to all tasks)

**Input Validation**:
- All Airtable queries use `escapeAirtableFormula()`
- Validate eventId format (alphanumeric + hyphens only)
- Validate date formats before storage

**API Permissions**:
- Circle.so: Verify token has custom field write permission (see CIRCLE_PERMISSIONS.md)
- Airtable: Existing key should work (read/write on attendees, checkins, new tables)

**Data Protection**:
- No new PII (streak data is derived from check-ins)
- Grace dates table has no PII
- Streak data deletion follows attendee deletion (GDPR compliance)

### Dependencies & Integration Points

**External APIs**:
- Circle.so Admin API v2: `https://app.circle.so/api/admin/v2`
  - GET/PATCH `/community_members/{id}` - Custom field operations
- Airtable API: Uses SDK (existing configuration)
  - New tables: `streaks`, `grace_dates`

**Internal Dependencies**:
- STORY-001 must complete before STORY-002 (reliable custom fields)
- STORY-002 must complete before STORY-004, STORY-005, STORY-006 (streak values)
- STORY-007 can parallel with STORY-001 or be part of STORY-002

**Data Flow** (final integrated flow):
```
Check-in Request
  ↓
Validate Input (existing)
  ↓
Fetch/Create Attendee (existing)
  ↓
Check Duplicate (existing)
  ↓
[NEW] Query Grace Dates (STORY-003)
  ↓
[NEW] Calculate Streak (STORY-002, uses STORY-007)
  ↓
[FIXED] Increment Visit Count (STORY-001)
  ↓
[NEW] Update Circle.so Custom Fields (STORY-004)
  ↓
[NEW] Update Airtable Streaks Table (STORY-005)
  ↓
Create Check-in Record (existing)
  ↓
[NEW] Format Streak Response Message (STORY-006)
  ↓
Return Enhanced Response
```

## Story Dependencies Graph

```
STORY-001 (Fix Bug)
    ↓
STORY-002 (Streak Engine) ← STORY-007 (Timezone)
    ↓                    ↘
STORY-003 (Grace Dates) →  [integrated into STORY-002]
    ↓
STORY-004 (Circle.so) + STORY-005 (Airtable)
    ↓
STORY-006 (Messaging)
    ↓
STORY-008 (Testing - ongoing validation)
```

## Open Questions for Task Planning

None - all stories have complete technical specifications. If questions arise during implementation:
- Check Epic file for additional context
- Check existing codebase patterns (circle.js, airtable.js, checkin.js)
- Refer to external docs (Circle.so API, Airtable API, date-fns-tz)

## Next Steps

**Recommended**: Start task breakdown with [[STORY-001]] as it's the critical blocker.

**Task Planner Workflow**:
1. Read STORY-001 file completely
2. Break down into 5-7 implementation tasks following TDD
3. Create task files with clear acceptance criteria
4. Generate implementation checklist
5. Move to next story in dependency order

**Estimated Timeline**:
- Week 1: STORY-001, STORY-007, STORY-003 (foundation)
- Week 2: STORY-002 (core algorithm)
- Week 3: STORY-004, STORY-005 (storage)
- Week 4: STORY-006, STORY-008 finalization (polish & validation)

**Deployment Strategy**:
- Deploy STORY-001 immediately after completion (critical bug fix)
- Deploy remaining stories together as complete feature (avoid partial deployment)
- Test thoroughly in staging before production

---

**Handoff prepared by**: story-planner agent
**Date**: 2026-02-07
**Ready for**: task-planner agent (autonomous mode enabled)
**Story files location**: `/Users/zack/projects/bocc-backend/stories/epic-001/`
**Total stories ready**: 8

# Epic Planning Complete - Handoff to Story Planning

## Summary

Epic planning complete for BOCC Backend visit count and streak tracking system. This Epic addresses a **critical production bug** where the `incrementCheckinCount` function always resets to 1 instead of incrementing, making all visit count data unreliable. Beyond the bug fix, we're implementing comprehensive week-to-week streak tracking for BOCC's Tuesday events with grace date support, dual storage (Circle.so + Airtable), and enhanced user engagement messaging.

**Project Context**: Buffalo Open Coffee Club (BOCC) is a weekly networking event held every Tuesday. The backend API (`bocc-backend`) handles event check-ins via Airtable and integrates with Circle.so community platform. The frontend (`bocc-website`) provides check-in forms that POST to this API.

**Business Driver**: Fix broken engagement tracking and implement streak gamification to drive member retention and enable automated rewards through Circle.so workflows.

## Epics Created

1. **EPIC-001**: Visit Count and Streak Tracking System - Priority: Critical - Effort: Medium (2-4 weeks)
   - Status: Draft (ready for Story breakdown)
   - File: `/Users/zack/projects/bocc-backend/epics/EPIC-001-visit-streak-tracking.md`

## Recommended Sequencing

Based on dependencies and business value:

1. **Start with: EPIC-001** - Only Epic in this planning session
   - **Rationale**: Production bug blocking accurate engagement tracking
   - **Critical path**: Bug fix must happen first, then streak features build on fixed foundation
   - **Risk mitigation**: Fix bug in isolation before adding complexity

## Critical Context for Story Planning

### Architecture Patterns Found

**Module System**: CommonJS (require/module.exports)
- All files use `.js` extension with `require()` syntax
- DO NOT use ES6 imports (`import/export`) - will break

**Serverless Functions**: Netlify Functions
- Entry point: `netlify/functions/checkin.js` (POST handler)
- Utilities: `netlify/functions/utils/*.js` (airtable, circle, validation)
- Tests: `tests/*.test.js` (Jest), `tests/*.sh` (smoke tests)

**Data Storage Pattern**: Dual storage with consistency
- Primary: Circle.so (enables workflows, custom fields)
- Secondary: Airtable (reporting, analytics)
- Pattern: Write to both, degrade gracefully if Circle.so fails

**Error Handling Pattern**: Try-catch with logging
- Log errors to console (visible in Netlify function logs)
- Return generic error messages to client (security)
- Don't fail check-in if non-critical operations fail (Circle.so)

**Testing Pattern**: Unit tests + smoke tests
- Jest for unit tests (143 existing tests)
- Bash scripts for end-to-end smoke tests
- `npm test` runs all unit tests
- `npm run test:smoke-local` for local E2E testing

**Current Bug Location**:
- File: `/Users/zack/projects/bocc-backend/netlify/functions/utils/circle.js`
- Function: `incrementCheckinCount(memberId, currentCount)`
- Issue: Ignores `currentCount` parameter, always sets to 1
- Fix: Fetch current value from Circle.so before incrementing

### Security Requirements

**Input Validation** (existing, must maintain):
- All inputs validated via `netlify/functions/utils/validation.js`
- Email, phone, token, eventId validation
- Formula injection protection for Airtable queries
- XSS prevention through text sanitization

**API Keys** (existing, must maintain):
- `AIRTABLE_API_KEY` - Minimum permissions (read/write attendees, checkins tables)
- `CIRCLE_API_TOKEN` - Minimum permissions (member read/write, custom fields)
- See `CIRCLE_PERMISSIONS.md` for detailed Circle.so permissions

**New Security Considerations**:
- Grace dates table: Admin-only writes (Airtable permission level)
- Streak calculations: No new PII, derived data only
- Custom fields: Ensure Circle.so API key has custom field write permission
- Data deletion: Cascade delete streaks when attendee deleted (GDPR)

### Technical Constraints

**Timezone Requirement**:
- All date calculations MUST use `America/New_York` timezone (Buffalo, NY)
- Handles EST/EDT transitions (DST aware)
- Library: `date-fns-tz` (NEW dependency, must add to package.json)
- Critical: Week boundaries determined by Tuesday start (weekStartsOn: 2)

**Event Cadence** (hardcoded for MVP):
- `eventId: "bocc"` = Weekly on Tuesdays
- Acceptable to hardcode for MVP
- MUST document in code comments for future extensibility
- Future: Abstract for Code Coffee and other events

**Performance Targets**:
- API response time: <2 seconds (currently ~500ms)
- New operations: Grace date query, streak calculation, dual write
- Optimization: Cache grace dates per request, index Airtable tables

**Backward Compatibility**:
- Check-in API must remain backward compatible (no breaking changes)
- Existing fields: email, name, phone, businessName, okToEmail, eventId, debug, token
- New response fields: Add streak data without removing existing fields

**Testing Requirements**:
- 90%+ unit test coverage on new code
- All smoke tests must pass (local + production)
- Test DST edge cases (spring forward, fall back)
- Test timezone boundaries (11:59pm vs 12:01am check-ins)

### Data Model (New Schemas)

**Circle.so Custom Fields** (add to community settings):
```javascript
{
  checkinCount: 42,              // EXISTING - BUG FIX REQUIRED
  currentStreak: 5,              // NEW - consecutive weeks
  longestStreak: 12,             // NEW - personal best
  lastCheckinDate: "2026-02-07"  // NEW - ISO 8601 date string
}
```

**Airtable Table: `streaks`**:
```
Fields:
- id: Auto Number (primary key)
- attendeeId: Link to attendees table (foreign key)
- eventId: Single Line Text ("bocc", "codeCoffee")
- currentStreak: Number
- longestStreak: Number
- lastCheckinDate: Date
- lastStreakUpdate: Date/Time (audit timestamp)

Indexes: attendeeId + eventId (composite for fast lookup)
```

**Airtable Table: `grace_dates`**:
```
Fields:
- id: Auto Number (primary key)
- date: Date (the grace date, e.g., 2025-12-24)
- eventId: Single Line Text (which event type)
- reason: Long Text (why, e.g., "Christmas Eve")
- createdAt: Date/Time (audit timestamp)

Indexes: eventId + date (for query optimization)
```

### Key Technical Decisions

**Decision 1: Bug Fix Approach**
- Chosen: Option A - Fetch current count before incrementing
- Rationale: Most reliable, handles race conditions, clear audit trail
- Implementation: Add `await getMemberCustomField(memberId, 'checkinCount')` before update
- Alternative rejected: Circle.so doesn't support atomic increment operations

**Decision 2: Streak Definition**
- Chosen: Week-to-week (not daily), Tuesday-based for "bocc"
- Rationale: Aligns with event schedule (weekly Tuesdays), realistic for members
- Implementation: `isSameWeek(date1, date2, { weekStartsOn: 2 })` using date-fns

**Decision 3: Dual Storage**
- Chosen: Write to both Circle.so (custom fields) and Airtable (streaks table)
- Rationale: Circle.so enables workflows, Airtable enables reporting
- Trade-off: Increased complexity, but necessary for both use cases
- Failure mode: Degrade gracefully if Circle.so fails (log error, continue with Airtable)

**Decision 4: Grace Date Management**
- Chosen: Manual entry via Airtable, no UI for MVP
- Rationale: Admin tool, low frequency (few dates per year), defer UI complexity
- Future: Admin dashboard Epic can add UI for grace date management

**Decision 5: Hardcoded Event Cadence**
- Chosen: Hardcode "bocc" = weekly Tuesday in MVP
- Rationale: Only one event type with streaks currently, avoid premature abstraction
- Mitigation: Design streak calculation engine with extensibility hooks
- Document: Clear code comments about hardcoded assumption

**Decision 6: Timezone Handling**
- Chosen: Server-side timezone conversion to America/New_York
- Rationale: Check-ins happen locally in Buffalo, server may be in different timezone
- Library: date-fns-tz (lightweight, tree-shakeable, battle-tested)
- Alternative rejected: Client-side timezone (unreliable, can be spoofed)

**Decision 7: Response Messaging**
- Chosen: Emphasize STREAK over total visit count
- Rationale: User testing showed streaks are more motivating than raw numbers
- Format: "3-week streak! Longest: 8 weeks!" vs "Total visits: 42"
- Implementation: Format in `checkin.js` before returning response

### Implementation Approach

**Phase 1: Foundation (Stories 1-2)**
1. Fix `incrementCheckinCount` bug in `circle.js`
   - Add fetch current count before update
   - Add unit tests to prevent regression
   - Deploy and verify in staging

2. Add new dependencies and timezone utilities
   - `npm install date-fns date-fns-tz`
   - Create timezone helper functions
   - Test DST transitions

**Phase 2: Streak Engine (Stories 3-4)**
3. Create streak calculation engine (`utils/streaks.js`)
   - Implement week-to-week logic
   - Handle grace dates
   - Calculate current and longest streaks
   - Comprehensive unit tests (DST, boundaries, etc.)

4. Create grace date utilities (`utils/graceDates.js`)
   - Query Airtable grace_dates table
   - Cache per request
   - Validation helpers

**Phase 3: Storage Integration (Stories 5-6)**
5. Circle.so custom field updates
   - Add custom fields to Circle.so community settings (manual step)
   - Implement `updateMemberCustomField` calls for streak fields
   - Error handling and retry logic
   - Unit tests with mocks

6. Airtable streaks table
   - Create table schema in Airtable (manual step)
   - Implement upsert operations in `utils/airtable.js`
   - Link to attendees table
   - Unit tests

**Phase 4: Integration (Story 7)**
7. Integrate into check-in flow (`checkin.js`)
   - Call streak calculation after attendee fetch/create
   - Dual write to Circle.so and Airtable
   - Format enhanced response message
   - Error handling (degrade gracefully)

**Phase 5: Testing & Deployment (Story 8)**
8. Comprehensive testing
   - Expand unit test coverage to 90%+
   - Update smoke tests for streak scenarios
   - Manual testing script for grace dates
   - Staging environment testing
   - Performance testing (response time <2s)
   - Documentation updates (README, code comments)

### Dependencies & Blockers

**External Dependencies**:
- Circle.so community settings: Must add custom fields (currentStreak, longestStreak, lastCheckinDate)
- Airtable base: Must create new tables (streaks, grace_dates)
- NPM packages: date-fns, date-fns-tz (add to package.json)

**No Blockers**: Can start immediately, all dependencies are under our control

**Future Work Dependencies**:
- Admin Dashboard Epic will consume streaks table (not blocking)
- Historical Backfill Epic will use streak engine (not blocking)

### Testing Strategy

**Unit Tests (Jest)**:
- `tests/circle.test.js` - Bug fix and custom field updates
- `tests/streaks.test.js` - NEW - Streak calculation engine
- `tests/graceDates.test.js` - NEW - Grace date functionality
- `tests/checkin.test.js` - Enhanced for streak integration

**Smoke Tests (Bash)**:
- `tests/smoke-test.sh` - Enhanced for streak scenarios
- `tests/streak-scenarios.sh` - NEW - Manual testing script

**Coverage Target**: 90%+ for new code

**Critical Test Scenarios**:
1. Bug fix: Verify increment works correctly (not reset to 1)
2. First check-in: streak = 1
3. Consecutive weeks: streak increments
4. Missed week: streak resets to 1
5. Grace date skip: streak maintains
6. DST transitions: dates calculated correctly
7. Timezone boundaries: 11:59pm vs 12:01am
8. Dual write: Both Circle.so and Airtable updated
9. Circle.so failure: Check-in succeeds, logs error
10. Personal best: longestStreak updates

### Files to Create/Modify

**New Files**:
- `netlify/functions/utils/streaks.js` - Streak calculation engine
- `netlify/functions/utils/graceDates.js` - Grace date query utilities
- `tests/streaks.test.js` - Unit tests for streak engine
- `tests/graceDates.test.js` - Unit tests for grace dates
- `tests/streak-scenarios.sh` - Manual testing script

**Modified Files**:
- `netlify/functions/utils/circle.js` - Fix bug, add custom field updates
- `netlify/functions/utils/airtable.js` - Add streaks table operations
- `netlify/functions/checkin.js` - Integrate streak tracking
- `tests/circle.test.js` - Expand tests for bug fix
- `tests/checkin.test.js` - Add streak integration tests
- `tests/smoke-test.sh` - Add streak scenarios
- `package.json` - Add date-fns dependencies
- `README.md` - Document new features

**Manual Steps** (not code):
- Circle.so: Add custom fields to community settings
- Airtable: Create streaks and grace_dates tables
- Airtable: Create indexes on new tables

### Success Criteria for Epic Completion

**Functional**:
- [ ] Visit count increments correctly (verified by tests)
- [ ] Streaks calculate accurately for weekly Tuesday "bocc" events
- [ ] Grace dates prevent streak breaks
- [ ] Dual write to Circle.so and Airtable succeeds
- [ ] API response includes streak messaging

**Quality**:
- [ ] 90%+ unit test coverage on new code
- [ ] All smoke tests pass (local and production)
- [ ] API response time <2 seconds
- [ ] Zero production errors (first 2 weeks post-launch)

**Documentation**:
- [ ] Code comments explain streak logic
- [ ] README updated with new features
- [ ] CIRCLE_PERMISSIONS.md updated if needed
- [ ] Grace date entry instructions documented

## Next Subagent

Call the `story-planner` subagent to break down **EPIC-001** into User Stories.

**Context for Story-Planner**:
- Epic file: `/Users/zack/projects/bocc-backend/epics/EPIC-001-visit-streak-tracking.md`
- Codebase: `/Users/zack/projects/bocc-backend/`
- Priority: Start with bug fix story (blocks all other work)
- Target: 8 stories (per Epic document recommendations)
- Testing: Each story should include unit tests
- Documentation: Update README at end

**Command**: Use story-planner subagent to break down EPIC-001 into Stories

**Autonomous Mode**: story-planner should:
1. Read Epic file for complete context
2. Create 8 Story files (STORY-001 through STORY-008)
3. Create Stories README index
4. Create handoff file for task-planner
5. Auto-invoke task-planner for STORY-001 (bug fix - highest priority)

---

**Handoff prepared by**: epic-planner agent
**Date**: 2026-02-07
**Ready for**: story-planner agent (autonomous mode enabled)

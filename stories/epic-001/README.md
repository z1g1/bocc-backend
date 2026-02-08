# Stories for EPIC-001: Visit Count and Streak Tracking System

## Overview

This directory contains 8 User Stories that break down the Visit Count and Streak Tracking System Epic into implementable, testable units of work. The Epic addresses a critical production bug (visit count always resets to 1) and implements comprehensive week-to-week attendance streak tracking for Buffalo Open Coffee Club events.

**Epic File**: [[EPIC-001-visit-streak-tracking]]

**Business Value**: Fix broken engagement tracking, enable automated rewards through Circle.so workflows, and motivate member retention through gamified streak recognition.

## Story List

### Critical Priority (Must Complete First)

1. **[[STORY-001]]** - Fix Visit Count Bug - **Complexity: Small** - **CRITICAL BLOCKER**
   - Fix `incrementCheckinCount` to fetch current value before incrementing
   - Restores accurate visit counting (currently all counts show "1")
   - Blocks all other stories (must have reliable custom field updates)
   - Dependencies: None - Start immediately

### Core Algorithm (High Priority)

2. **[[STORY-002]]** - Streak Calculation Engine - **Complexity: Large** - **CORE ALGORITHM**
   - Implement week-to-week streak calculation logic
   - Handle consecutive weeks, broken streaks, personal bests
   - Pure functions (no API calls), timezone-aware
   - Dependencies: STORY-001 (needs reliable custom field updates)

7. **[[STORY-007]]** - Timezone Handling - **Complexity: Small** - **HIGH PRIORITY**
   - All date calculations use America/New_York timezone
   - Handle DST transitions correctly (spring/fall)
   - Week boundaries based on Tuesday (BOCC meeting day)
   - Dependencies: None - Can start with or before STORY-002

### Storage & Integration (Medium Priority)

3. **[[STORY-003]]** - Grace Date Management - **Complexity: Medium**
   - Create Airtable `grace_dates` table for declared holidays
   - Query and cache grace dates per request
   - Prevents streak breaks for excused absences
   - Dependencies: None - Independent infrastructure

4. **[[STORY-004]]** - Circle.so Custom Field Integration - **Complexity: Medium**
   - Store streak data in Circle.so custom fields
   - Enables Circle.so workflow automations (e.g., "5-visit badge")
   - Update `currentStreak`, `longestStreak`, `lastCheckinDate`
   - Dependencies: STORY-001 (fixed bug), STORY-002 (streak values)

5. **[[STORY-005]]** - Airtable Streaks Table - **Complexity: Medium**
   - Create Airtable `streaks` table for reporting/analytics
   - Upsert pattern (create or update streak records)
   - Dual storage with Circle.so (both updated together)
   - Dependencies: STORY-002 (streak values)

### User Experience (Final Steps)

6. **[[STORY-006]]** - Enhanced Check-in Response Messaging - **Complexity: Small**
   - Return personalized streak messages in API response
   - "5-week streak!", "New record!", "Welcome back!"
   - Motivational and celebratory tone
   - Dependencies: STORY-002, STORY-004, STORY-005 (need streak data)

### Quality Assurance

8. **[[STORY-008]]** - Comprehensive Testing - **Complexity: Medium** - **HIGH PRIORITY**
   - 90%+ unit test coverage on new code
   - Integration tests for end-to-end check-in flow
   - Smoke tests for realistic scenarios
   - Dependencies: All other stories (validates all of them)

## Story Dependencies Graph

```
STORY-001 (Fix Bug) - CRITICAL FOUNDATION
    ↓
STORY-002 (Streak Engine) + STORY-007 (Timezone) - CORE ALGORITHM
    ↓
STORY-003 (Grace Dates) ←─── Independent
    ↓
STORY-004 (Circle.so) + STORY-005 (Airtable) - DUAL STORAGE
    ↓
STORY-006 (Messaging) - USER EXPERIENCE
    ↓
STORY-008 (Testing) - QUALITY ASSURANCE (ongoing)
```

**Legend**:
- `→` Direct dependency (must complete before)
- `+` Can be developed in parallel
- `←───` Independent (can start anytime)

## Implementation Sequence

### Phase 1: Foundation (Week 1)
**Priority**: Fix critical bug and set up infrastructure
1. **STORY-001** - Fix Visit Count Bug (1-2 days)
2. **STORY-007** - Timezone Handling (1 day)
3. **STORY-003** - Grace Date Management (2 days, can parallel with above)

### Phase 2: Core Logic (Week 2)
**Priority**: Implement streak calculation algorithm
4. **STORY-002** - Streak Calculation Engine (3-4 days)
   - Uses timezone utilities from STORY-007
   - Consumes grace dates from STORY-003

### Phase 3: Storage Integration (Week 3)
**Priority**: Dual write to Circle.so and Airtable
5. **STORY-004** - Circle.so Custom Fields (2 days)
6. **STORY-005** - Airtable Streaks Table (2 days)
   - Can develop these in parallel (both needed for dual write)

### Phase 4: Polish & Validation (Week 4)
**Priority**: User experience and quality assurance
7. **STORY-006** - Enhanced Check-in Response (1 day)
8. **STORY-008** - Comprehensive Testing (ongoing, 2-3 days final validation)

**Total Estimated Effort**: 3-4 weeks (matches Epic estimate)

## Story Status Tracking

| Story | Status | Complexity | Dependencies | Notes |
|-------|--------|------------|--------------|-------|
| STORY-001 | Ready | Small | None | Start here - CRITICAL |
| STORY-002 | Ready | Large | STORY-001 | Core algorithm |
| STORY-003 | Ready | Medium | None | Can parallel with STORY-001 |
| STORY-004 | Ready | Medium | STORY-001, STORY-002 | Circle.so storage |
| STORY-005 | Ready | Medium | STORY-002 | Airtable storage |
| STORY-006 | Ready | Small | STORY-002, STORY-004, STORY-005 | Messaging |
| STORY-007 | Ready | Small | None | Part of STORY-002, can start early |
| STORY-008 | Ready | Medium | All stories | Ongoing validation |

**Status Legend**:
- **Ready**: Story defined, acceptance criteria clear, ready for task breakdown
- **In Progress**: Tasks created, development started
- **Done**: All acceptance criteria met, tests passing, deployed

## Technical Context

### New Files Created
- `netlify/functions/utils/streaks.js` - Streak calculation engine
- `netlify/functions/utils/graceDates.js` - Grace date management
- `tests/streaks.test.js` - Streak engine tests
- `tests/graceDates.test.js` - Grace date tests
- `tests/airtable-streaks.test.js` - Airtable storage tests
- `tests/manual-streak-test.sh` - Manual testing scenarios

### Modified Files
- `netlify/functions/utils/circle.js` - Bug fix + custom field updates
- `netlify/functions/utils/airtable.js` - Streaks table operations
- `netlify/functions/checkin.js` - Integrate streak tracking
- `tests/circle.test.js` - Expanded tests
- `tests/checkin.test.js` - Streak integration tests
- `tests/smoke-test.sh` - Streak scenarios
- `package.json` - Add date-fns, date-fns-tz dependencies

### Manual Setup Required
**Circle.so** (before deployment):
- Add custom fields: `currentStreak`, `longestStreak`, `lastCheckinDate` (Number/Text types)
- Verify API token has custom field write permissions

**Airtable** (before deployment):
- Create table: `streaks` (attendeeId, eventId, currentStreak, longestStreak, lastCheckinDate, lastStreakUpdate)
- Create table: `grace_dates` (date, eventId, reason, createdAt)
- Create views: Leaderboard, Active Streaks, Personal Bests

## Success Criteria (Epic Completion)

### Functional
- [x] Visit count increments correctly (verified by tests)
- [x] Streaks calculate accurately for weekly Tuesday events
- [x] Grace dates prevent streak breaks
- [x] Dual write to Circle.so and Airtable succeeds
- [x] API response includes streak messaging

### Quality
- [x] 90%+ unit test coverage on new code
- [x] All smoke tests pass (local and production)
- [x] API response time <2 seconds
- [x] Zero production errors (first 2 weeks post-launch)

### Documentation
- [x] Code comments explain streak logic
- [x] README updated with new features
- [x] CIRCLE_PERMISSIONS.md updated
- [x] Grace date entry instructions documented

## Notes

**Testing Strategy**:
- Follow TDD (test-driven development) - write tests first
- Each story includes test requirements in acceptance criteria
- STORY-008 consolidates and validates all testing

**Deployment Strategy**:
1. Deploy STORY-001 (bug fix) ASAP to staging
2. Test bug fix thoroughly before proceeding
3. Deploy remaining stories together (avoid partial feature deployment)
4. Monitor Netlify function logs for errors
5. Verify data in Circle.so and Airtable after deployment

**Rollback Plan**:
- If critical issues found, disable streak tracking via feature flag
- Check-in will still succeed (graceful degradation)
- Fix issues and redeploy

**Future Enhancements** (Out of Scope):
- Historical backfill (calculate streaks for past check-ins)
- Admin dashboard (visualize streaks, leaderboards)
- Multiple event types (Code Coffee, other events)
- Automated grace date detection (holidays API)
- Streak recovery (manual admin adjustment)

---

**Next Steps**: Start with STORY-001 (Fix Visit Count Bug). Use task-planner agent to break down into implementation tasks following TDD approach. All stories are READY for task breakdown.

**Last Updated**: 2026-02-07

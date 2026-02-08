# EPIC-001: Visit Count and Streak Tracking System

## Epic Overview
**Status**: Draft
**Priority**: Critical
**Estimated Effort**: Medium (2-4 weeks)
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## Business Value

The Buffalo Open Coffee Club (BOCC) needs a robust engagement tracking system to recognize and reward consistent attendee participation. Currently, the visit count feature is fundamentally broken - the `incrementCheckinCount` function resets to 1 instead of incrementing, making it impossible to track member engagement accurately. Beyond fixing this critical bug, implementing streak tracking will drive member retention by gamifying attendance and providing encouraging feedback to attendees who maintain weekly participation.

This Epic focuses on building accurate, reliable engagement metrics that will:
1. **Fix broken functionality** - Restore accurate visit counting that currently fails in production
2. **Drive engagement** - Motivate members to attend consistently through streak recognition
3. **Enable future rewards** - Provide data foundation for Circle.so workflows that trigger automated rewards
4. **Improve member experience** - Return encouraging, personalized messages about attendance patterns

The system will track streaks on a week-to-week basis (BOCC meets every Tuesday) and handle real-world scenarios like year-end holidays through a grace date system.

### Success Metrics
- Visit count increments correctly 100% of the time (currently: 0% - always resets to 1)
- Streak calculations are accurate within timezone (America/New_York EST/EDT)
- API response time remains under 2 seconds with new calculations
- Zero data loss during dual-write to Circle.so and Airtable
- 95%+ of attendees receive streak messaging in check-in response

## Description

This Epic addresses a critical production bug and implements a complete engagement tracking system for BOCC events. The current `incrementCheckinCount` function in `netlify/functions/utils/circle.js` fails to fetch the current count before incrementing, causing it to always reset to 1. This makes all visit count data unreliable.

The solution involves:

**Bug Fix (Critical)**:
- Modify `incrementCheckinCount` to fetch member's current `checkinCount` custom field value
- Calculate new value (current + 1)
- Update Circle.so member profile with correct incremented value
- Add comprehensive error handling and logging
- Write unit tests to prevent regression

**Streak Tracking (New Feature)**:
- Implement week-to-week streak calculation based on eventId cadence
- For "bocc" events: weekly on Tuesdays (hardcoded for MVP)
- Track current streak (consecutive weeks) and longest streak (personal best)
- Handle grace dates (holidays/exceptions) via new Airtable table
- All date calculations use America/New_York timezone (Buffalo, NY)

**Dual Storage Architecture**:
- Primary storage: Circle.so custom fields (enables Circle.so automated workflows)
- Secondary storage: New Airtable `streaks` table (easier reporting and analytics)
- Both systems kept in sync during check-in process
- Airtable table linked to existing `attendees` table

**Enhanced User Experience**:
- Check-in API response emphasizes STREAK messaging over raw count
- Return encouraging messages: "3-week streak!", "Longest streak: 8 weeks!", "Welcome back!"
- Provide context about streak status (maintained, broken, new personal best)

**Grace Date System**:
- New Airtable `grace_dates` table to declare exception dates
- Manual entry by admins (e.g., last 2 Tuesdays of December)
- Grace dates don't break streaks when attendees miss them
- Linked to specific eventId (future-proofing for multiple event types)

## Acceptance Criteria

### Must Have (Critical Path)
- [ ] `incrementCheckinCount` fetches current value before incrementing (bug fix)
- [ ] Visit count increments correctly on every check-in
- [ ] Streak calculation works for weekly Tuesday "bocc" events
- [ ] Grace dates can be manually added to Airtable and affect streak logic
- [ ] New Circle.so custom fields: `currentStreak`, `longestStreak`, `lastCheckinDate`
- [ ] New Airtable table: `streaks` (attendeeId, eventId, currentStreak, longestStreak, lastCheckinDate)
- [ ] New Airtable table: `grace_dates` (date, eventId, reason)
- [ ] All date/time calculations use America/New_York timezone
- [ ] API response includes streak messaging ("3-week streak!", "Longest: 8 weeks!")
- [ ] Dual write to both Circle.so and Airtable succeeds or fails together
- [ ] Unit tests cover bug fix, streak calculation, grace date logic, timezone handling
- [ ] Smoke tests verify end-to-end streak tracking in local and production

### Should Have (Important)
- [ ] Logging for streak calculations (debug and audit trail)
- [ ] Error handling when Circle.so API fails (degrade gracefully, still track in Airtable)
- [ ] Validation for grace_dates table entries (prevent invalid dates)
- [ ] API response differentiates: new streak, maintained streak, broken streak, personal best
- [ ] Documentation in code comments explaining streak logic
- [ ] Performance monitoring for new database queries

### Could Have (Nice to Have)
- [ ] Streak calculation abstraction to support future event types (Code Coffee, etc.)
- [ ] API endpoint to query streak status without check-in
- [ ] Webhook notification when member achieves personal best streak
- [ ] Analytics query examples in documentation

## User Stories (High-Level)

1. **Story: Fix Visit Count Bug**
   - As a BOCC admin, I want visit counts to increment correctly so that member engagement data is accurate
   - Estimated complexity: Small (critical foundation for other stories)

2. **Story: Implement Streak Calculation Engine**
   - As a system, I need to calculate week-to-week streaks based on event cadence and timezone so that streak tracking is accurate
   - Estimated complexity: Large (core algorithmic work)

3. **Story: Grace Date Management**
   - As a BOCC admin, I want to declare grace dates so that members' streaks aren't broken during holidays
   - Estimated complexity: Medium (new table + query logic)

4. **Story: Circle.so Custom Field Integration**
   - As a system, I need to store streak data in Circle.so custom fields so that Circle workflows can trigger automated rewards
   - Estimated complexity: Medium (API integration + field management)

5. **Story: Airtable Streaks Table**
   - As a BOCC admin, I want streak data in Airtable so that I can easily generate reports and analytics
   - Estimated complexity: Medium (schema design + dual write logic)

6. **Story: Enhanced Check-in Response Messaging**
   - As an attendee, I want to see my streak status when I check in so that I feel motivated to maintain my attendance
   - Estimated complexity: Small (message formatting)

7. **Story: Timezone Handling**
   - As a system, I need all date calculations to use Buffalo timezone so that Tuesday check-ins are correctly identified
   - Estimated complexity: Small (date-fns-tz integration)

8. **Story: Comprehensive Testing**
   - As a developer, I need unit and integration tests for streak logic so that the system is reliable
   - Estimated complexity: Medium (test scenarios + edge cases)

## Dependencies

### Blocks
- None (this is a foundational Epic)

### Blocked By
- None (can start immediately - bug is in production)

### Related
- **Future: Admin Dashboard** - Will consume streak data for visualization
- **Future: Historical Backfill** - Will use streak calculation logic to backfill historical data
- **Future: Data Cleanup** - May require streak recalculation after deduplication

## Technical Considerations

### Architecture Impact

**New Components**:
- `netlify/functions/utils/streaks.js` - Streak calculation engine
- `netlify/functions/utils/graceDates.js` - Grace date query functions
- Enhanced `netlify/functions/utils/circle.js` - Fixed increment + new custom field updates
- Enhanced `netlify/functions/utils/airtable.js` - New tables (streaks, grace_dates)

**Modified Components**:
- `netlify/functions/checkin.js` - Orchestrate streak tracking during check-in
- `tests/circle.test.js` - Expanded tests for bug fix and new fields
- `tests/checkin.test.js` - New tests for streak logic integration
- New `tests/streaks.test.js` - Dedicated tests for streak calculation engine
- New `tests/graceDates.test.js` - Tests for grace date functionality

**Data Flow**:
```
Check-in Request
  ↓
Validate Input
  ↓
Fetch/Create Attendee (existing)
  ↓
[NEW] Query Grace Dates Table
  ↓
[NEW] Calculate Streak (week-to-week, timezone-aware)
  ↓
[FIXED] Increment Visit Count (fetch current, then increment)
  ↓
[NEW] Update Circle.so Custom Fields (checkinCount, currentStreak, longestStreak, lastCheckinDate)
  ↓
[NEW] Update Airtable Streaks Table (dual write)
  ↓
Create Check-in Record (existing)
  ↓
[NEW] Format Streak Response Message
  ↓
Return Enhanced Response
```

**Database Schema Changes**:

*Circle.so Custom Fields* (added to community settings):
- `checkinCount` (number) - EXISTING, BUG FIX REQUIRED
- `currentStreak` (number) - NEW
- `longestStreak` (number) - NEW
- `lastCheckinDate` (date string, ISO 8601) - NEW

*Airtable Table: `streaks`*:
| Field | Type | Description |
|-------|------|-------------|
| id | Auto Number | Primary key |
| attendeeId | Link to attendees | Foreign key |
| eventId | Single Line Text | "bocc", "codeCoffee", etc. |
| currentStreak | Number | Consecutive weeks |
| longestStreak | Number | Personal best |
| lastCheckinDate | Date | Last check-in (for calculation) |
| lastStreakUpdate | Date/Time | Audit timestamp |

*Airtable Table: `grace_dates`*:
| Field | Type | Description |
|-------|------|-------------|
| id | Auto Number | Primary key |
| date | Date | The grace date (e.g., 2025-12-24) |
| eventId | Single Line Text | Which event type |
| reason | Long Text | Why (e.g., "Christmas Eve") |
| createdAt | Date/Time | Audit timestamp |

**Integration Points**:
- Circle.so Admin API v2 (existing) - Add custom field update calls
- Airtable API (existing) - Add new table queries
- date-fns-tz library (NEW dependency) - Timezone-aware date calculations

### Security Considerations

**Authentication/Authorization**:
- No changes to existing API authentication (public endpoint with token)
- Grace dates table: admin-only writes (enforced at Airtable permission level)
- Circle.so API key: minimum permissions (member read/write, custom field access)

**Data Protection**:
- Streak data is derived from check-in data (no new PII)
- Grace dates table contains no PII
- Existing validation layer protects against injection attacks
- No sensitive data in API response (public streak counts)

**Compliance**:
- GDPR: Streak data is tied to attendee records (same retention policy)
- Data deletion: When attendee deleted, cascade delete streaks records
- No changes to existing privacy policy needed (derived data)

### Technical Debt

**Refactoring Needed Before**:
- None required - can build on existing architecture

**Technical Debt This Epic Will Address**:
- **Critical Bug**: `incrementCheckinCount` always resets to 1 (production issue)
- **Missing Test Coverage**: Circle.so integration has minimal tests (will expand)
- **Hardcoded Assumptions**: Event cadence is implicit (will make explicit for "bocc")

**Technical Debt This Epic Might Create**:
- **Hardcoded Event Cadence**: "bocc" = weekly Tuesdays (acceptable for MVP, document for future)
- **Dual Write Complexity**: Two storage systems to keep in sync (acceptable trade-off, needed for Circle.so workflows + reporting)
- **Manual Grace Date Entry**: No UI, requires Airtable access (defer admin UI to future Epic)

**Mitigation Strategies**:
- Document hardcoded cadence in code comments and README
- Implement dual write as atomic operation (both succeed or both fail)
- Provide clear instructions for grace date entry in documentation
- Design streak calculation engine to be extensible for future event types

### Technology Stack

**Existing Stack** (no changes):
- Runtime: Node.js 18+ (Netlify Functions)
- Module System: CommonJS (require/module.exports)
- Database: Airtable (airtable SDK v0.12+)
- Community Platform: Circle.so (Admin API v2, axios for HTTP)
- Testing: Jest (unit tests), Bash (smoke tests)

**New Dependencies**:
- `date-fns` v2.x - Date manipulation utilities
- `date-fns-tz` v2.x - Timezone-aware date operations (America/New_York)

**Rationale for Technology Choices**:
- **date-fns/date-fns-tz**: Lightweight, tree-shakeable, excellent timezone support, better than moment.js (deprecated)
- **No ORM**: Continue using native Airtable SDK (simple queries, avoid overhead)
- **CommonJS**: Match existing codebase (avoid module system migration)
- **Jest**: Existing test framework (avoid introducing new test tooling)

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Circle.so API rate limits on custom field updates | High | Low | Implement exponential backoff retry, log failures, degrade gracefully to Airtable-only mode |
| Timezone calculation errors (DST transitions) | High | Medium | Use date-fns-tz library (battle-tested), write extensive tests for DST edge cases (spring/fall) |
| Dual write failures (Circle.so succeeds, Airtable fails or vice versa) | Medium | Medium | Wrap in try-catch, log inconsistencies, implement eventual consistency check (future Epic) |
| Performance degradation with new database queries | Medium | Low | Index Airtable streaks table on attendeeId+eventId, monitor API response times, optimize if >2s |
| Grace date logic complexity (missed edge cases) | Medium | Medium | Write comprehensive test suite with real-world scenarios (holidays, multiple grace dates, etc.) |
| Hardcoded event cadence blocks future events | Low | High | Document limitation clearly, design streak engine with abstraction layer for future extensibility |
| Bug fix breaks existing Circle.so workflows | High | Low | Test in staging environment first, verify Circle.so automation still triggers, maintain backward compatibility |

## Out of Scope

Explicitly call out what is NOT included in this Epic:

- **Admin Dashboard**: Visualization of streak data, leaderboards, analytics UI (separate future Epic)
- **Historical Backfill**: Calculating streaks for past check-ins before this system launched (deferred, needs data cleanup first)
- **Duplicate Data Cleanup**: Deduplicating check-ins or attendees (separate Epic, may require streak recalculation afterward)
- **Configurable Event Cadences**: UI or API to define event schedules (hardcoded "bocc" = Tuesday for MVP)
- **Multi-Event Streak Views**: Cross-event streak tracking (e.g., combined BOCC + Code Coffee streak)
- **Automated Grace Date Suggestions**: System detecting holidays and suggesting grace dates (manual entry only)
- **Streak Recovery Feature**: Allowing admins to manually restore broken streaks (future enhancement)
- **Push Notifications**: Alerting members about streaks or upcoming check-ins (separate integration Epic)
- **API v2**: Versioning or breaking changes to check-in API (maintain backward compatibility)
- **Mobile App**: Native check-in app with streak visualization (web-only for now)

## Resources

### Documentation
- [Circle.so Admin API v2 Documentation](https://api.circle.so/) - Custom field updates
- [Airtable API Documentation](https://airtable.com/api) - Table creation, linked records
- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz) - Timezone handling
- [BOCC Backend README.md](/Users/zack/projects/bocc-backend/README.md) - Current architecture
- [CIRCLE_PERMISSIONS.md](/Users/zack/projects/bocc-backend/CIRCLE_PERMISSIONS.md) - Required Circle.so permissions

### Existing Codebase
- `/Users/zack/projects/bocc-backend/netlify/functions/utils/circle.js` - Circle.so integration (BUG HERE)
- `/Users/zack/projects/bocc-backend/netlify/functions/utils/airtable.js` - Database operations
- `/Users/zack/projects/bocc-backend/netlify/functions/checkin.js` - Main check-in handler
- `/Users/zack/projects/bocc-backend/tests/` - Existing test suite (143 tests)

### Team
- **Product Owner**: Zack (BOCC organizer)
- **Tech Lead**: Claude Code (autonomous development)
- **Key Stakeholders**: BOCC attendees, Circle.so community members

## Implementation Notes

### Streak Calculation Logic (Pseudo-code)

```javascript
// Fetch last check-in date for this attendee + eventId
// Fetch grace dates for this eventId
// Get current date in America/New_York timezone
// Determine event cadence (bocc = weekly Tuesday)

function calculateStreak(attendeeId, eventId, currentCheckInDate) {
  const lastCheckIn = getLastCheckInDate(attendeeId, eventId);
  const graceDates = getGraceDates(eventId);
  const timezone = "America/New_York";

  // Convert to Buffalo timezone
  const currentDate = toZonedTime(currentCheckInDate, timezone);
  const lastDate = lastCheckIn ? toZonedTime(lastCheckIn, timezone) : null;

  // First check-in ever
  if (!lastDate) {
    return { currentStreak: 1, streakBroken: false };
  }

  // Get expected check-in date (last Tuesday + 1 week for "bocc")
  const expectedDate = addWeeks(startOfWeek(lastDate, { weekStartsOn: 2 }), 1); // Tuesday = 2

  // Check if current check-in is on expected date (or within same week)
  const isOnTime = isSameWeek(currentDate, expectedDate, { weekStartsOn: 2 });

  // If not on time, check grace dates
  const missedDates = eachWeekOfInterval({ start: lastDate, end: currentDate }, { weekStartsOn: 2 });
  const missedNonGraceDates = missedDates.filter(date => !isGraceDate(date, graceDates));

  // Streak continues if on time OR only grace dates were missed
  if (isOnTime || missedNonGraceDates.length === 0) {
    return { currentStreak: previousStreak + 1, streakBroken: false };
  } else {
    // Streak broken
    return { currentStreak: 1, streakBroken: true };
  }
}
```

### Dual Write Pattern

```javascript
async function updateStreakData(attendeeId, email, name, eventId, streakData) {
  try {
    // Step 1: Update Circle.so (primary for workflows)
    const member = await ensureMember(email, name);
    await updateMemberCustomField(member.id, 'currentStreak', streakData.currentStreak);
    await updateMemberCustomField(member.id, 'longestStreak', streakData.longestStreak);
    await updateMemberCustomField(member.id, 'lastCheckinDate', streakData.lastCheckinDate);

    // Step 2: Update Airtable (secondary for reporting)
    await upsertStreakRecord(attendeeId, eventId, streakData);

    // Both succeeded
    return { success: true, data: streakData };
  } catch (error) {
    // Log failure, implement eventual consistency in future Epic
    console.error('Dual write failed:', error);
    throw error; // Don't fail check-in if streak tracking fails
  }
}
```

### Grace Date Query Optimization

```javascript
// Cache grace dates per request (avoid multiple Airtable queries)
let graceDateCache = null;

async function getGraceDates(eventId) {
  if (!graceDateCache) {
    // Fetch all future grace dates for this event
    const records = await airtableBase('grace_dates')
      .select({
        filterByFormula: `AND({eventId} = '${eventId}', {date} >= TODAY())`,
        sort: [{ field: 'date', direction: 'asc' }]
      })
      .all();

    graceDateCache = records.map(r => r.get('date'));
  }
  return graceDateCache;
}
```

## Testing Strategy

### Unit Tests (Jest)

**New Test Files**:
- `tests/streaks.test.js` - Streak calculation engine
  - Calculate first check-in (streak = 1)
  - Calculate consecutive weekly check-ins (streak increments)
  - Calculate missed week (streak resets to 1)
  - Calculate grace date skip (streak maintained)
  - Calculate multiple grace dates (streak maintained)
  - Calculate longest streak tracking (personal best)
  - DST transition edge cases (spring forward, fall back)
  - Timezone boundary cases (check-in at 11:59pm vs 12:01am)

- `tests/graceDates.test.js` - Grace date functionality
  - Query grace dates for event
  - Filter future vs past grace dates
  - Validate date format
  - Handle empty grace date table

**Enhanced Test Files**:
- `tests/circle.test.js` - Bug fix and new custom fields
  - `incrementCheckinCount` fetches current value (bug fix)
  - `incrementCheckinCount` handles missing current value (0 → 1)
  - `updateMemberCustomField` works for streak fields
  - Error handling for API failures

- `tests/checkin.test.js` - End-to-end streak integration
  - Check-in calculates and stores streak
  - Response includes streak messaging
  - Dual write to Circle.so and Airtable
  - Graceful degradation if Circle.so fails

**Test Coverage Target**: 90%+ for new code

### Integration Tests (Smoke Tests)

**Enhanced `tests/smoke-test.sh`**:
- Test first check-in (streak = 1)
- Test same-day duplicate check-in (dedup still works)
- Test consecutive week check-in (verify streak increments)
- Test response includes streak message
- Verify data in both Circle.so and Airtable (manual verification step)

**New `tests/streak-scenarios.sh`** (manual testing script):
- Scenario 1: New attendee check-in (expect: streak = 1)
- Scenario 2: Same attendee next Tuesday (expect: streak = 2)
- Scenario 3: Miss a week, then check in (expect: streak = 1, broken)
- Scenario 4: Miss grace date week, then check in (expect: streak continues)
- Scenario 5: Personal best streak (expect: longestStreak updates)

### Performance Tests
- Baseline: Measure current check-in API response time (~500ms)
- Target: Keep response time under 2 seconds with streak calculations
- Monitor: Airtable query count (minimize duplicate queries)
- Load test: 50 concurrent check-ins (simulate event start rush)

### Staging Environment Testing
- Deploy to Netlify staging branch
- Test with real Circle.so test community
- Verify Airtable table creation
- Test grace date scenarios with real dates
- Verify timezone handling on server (not local machine)

## Success Metrics (Measurable Outcomes)

**Functional Success**:
- ✅ Visit count bug fixed (100% accuracy, verified by unit tests)
- ✅ Streak calculations accurate (0 errors in test scenarios)
- ✅ Dual write consistency (Circle.so and Airtable match 100% of time)
- ✅ API response time <2s (95th percentile)

**User Engagement** (measured post-launch):
- 📊 80%+ of check-ins receive streak messaging
- 📊 Track streak "personal best" achievements (analytics)
- 📊 Monitor return rate for attendees with active streaks vs broken streaks

**Technical Quality**:
- ✅ 90%+ unit test coverage on new code
- ✅ All smoke tests pass in staging and production
- ✅ Zero production errors related to streak tracking (first 2 weeks post-launch)
- ✅ Documentation complete (code comments, README updates)

**Future Enablement**:
- ✅ Data model supports admin dashboard (future Epic)
- ✅ Data model supports historical backfill (future Epic)
- ✅ Streak calculation engine extensible for other event types

## Notes

**Key Design Decisions**:
1. **Option A for Bug Fix**: Fetch current count before incrementing (most reliable, chosen by user)
2. **Week-to-Week Streaks**: Not daily, aligns with BOCC's weekly Tuesday schedule
3. **Dual Storage**: Accept complexity for Circle.so workflows + Airtable reporting benefits
4. **Hardcoded Cadence**: "bocc" = Tuesday is acceptable for MVP, document for future flexibility
5. **Manual Grace Dates**: Admin manually enters dates in Airtable (defer UI to future)
6. **Buffalo Timezone**: All calculations use America/New_York (EST/EDT with DST handling)

**Open Questions** (to resolve during Story breakdown):
- Should grace dates be retroactive or future-only? (Future-only for MVP)
- How to handle multiple check-ins same day? (Dedup prevents, but worth documenting)
- Should API return streak data even if Circle.so write fails? (Yes - degrade gracefully)
- Cache grace dates per request or per hour? (Per request for MVP, optimize later)

**Assumptions**:
- BOCC continues to meet weekly on Tuesdays (if schedule changes, requires code update)
- Circle.so custom fields have no character limits for date strings (ISO 8601 format)
- Airtable base has capacity for new tables and linked records (no quota issues)
- Network latency to Circle.so API is acceptable (<500ms per request)

**Dependencies on Future Work**:
- Admin dashboard will consume Airtable `streaks` table (not blocking)
- Historical backfill will use streak calculation engine (not blocking)
- Data cleanup may require streak recalculation (acceptable - idempotent logic)

---

**Next Steps**: This Epic will be broken down into Stories by the story-planner subagent. Recommended story sequencing:
1. Fix `incrementCheckinCount` bug (blocks everything else)
2. Implement streak calculation engine with timezone handling
3. Add grace date table and query logic
4. Integrate Circle.so custom fields
5. Create Airtable streaks table with dual write
6. Enhance API response messaging
7. Comprehensive testing (unit + smoke)
8. Documentation and deployment

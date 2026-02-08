# Tasks for STORY-005: Airtable Streaks Table

**Story**: [[STORY-005]] - Airtable Streaks Table
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: Medium
**Total Tasks**: 12
**Estimated Time**: 7-9 hours

## Overview

Store streak data in Airtable for reporting and analytics. Implement upsert pattern (find existing record, update if found, create if not).

## Dependencies
- [[STORY-002]] - Streak Calculation Engine (provides streak values)

## Tasks

### TASK-054: Manual setup - Create streaks table in Airtable
**Type**: Setup (MANUAL) | **Time**: 30 min
Create table: streaks (fields: id, attendeeId link, eventId, currentStreak, longestStreak, lastCheckinDate, lastStreakUpdate).
Create views: Leaderboard, Active Streaks, Personal Bests.
**Done**: Table exists, views created, sample data added.

### TASK-055: Write tests for findStreakRecord
**Type**: Test | **Time**: 45 min
Test find by attendeeId + eventId, returns null when not found, escapes formula injection.
**Done**: 4+ tests written, all fail.

### TASK-056: Write tests for createStreakRecord
**Type**: Test | **Time**: 45 min
Test creates record with correct fields, links to attendee, sets lastStreakUpdate.
**Done**: 4+ tests written, all fail.

### TASK-057: Write tests for updateStreakRecord
**Type**: Test | **Time**: 45 min
Test updates existing record, preserves attendeeId, updates timestamp.
**Done**: 4+ tests written, all fail.

### TASK-058: Write tests for upsertStreakRecord
**Type**: Test | **Time**: 1 hour
Test upsert logic: creates when missing, updates when exists, handles errors gracefully.
**Done**: 6+ tests written, all fail.

### TASK-059: Implement findStreakRecord
**Type**: Implementation | **Time**: 1 hour
```javascript
async function findStreakRecord(attendeeId, eventId) {
  const formula = `AND({attendeeId} = '${attendeeId}', {eventId} = '${escapeAirtableFormula(eventId)}')`;
  const records = await base('streaks').select({ filterByFormula: formula, maxRecords: 1 }).firstPage();
  return records.length > 0 ? records[0] : null;
}
```
**Done**: Function implemented, TASK-055 tests pass.

### TASK-060: Implement createStreakRecord
**Type**: Implementation | **Time**: 45 min
Create new streak record, link to attendeeId array, set all fields including timestamp.
**Done**: Function implemented, TASK-056 tests pass.

### TASK-061: Implement updateStreakRecord
**Type**: Implementation | **Time**: 45 min
Update existing record by recordId, update streak fields and timestamp.
**Done**: Function implemented, TASK-057 tests pass.

### TASK-062: Implement upsertStreakRecord
**Type**: Implementation | **Time**: 1 hour
```javascript
async function upsertStreakRecord(attendeeId, eventId, streakData) {
  const existing = await findStreakRecord(attendeeId, eventId);
  if (existing) {
    return await updateStreakRecord(existing.id, streakData);
  } else {
    return await createStreakRecord(attendeeId, eventId, streakData);
  }
}
```
**Done**: Upsert logic implemented, TASK-058 tests pass.

### TASK-063: Integrate with check-in handler
**Type**: Integration | **Time**: 1 hour
Call upsertStreakRecord in checkin.js after streak calculation (dual write with Circle.so).
**Done**: Integration complete, both Circle and Airtable updated.

### TASK-064: Add validation for streakData
**Type**: Enhancement | **Time**: 30 min
Validate streakData has required fields, positive numbers, valid date format.
**Done**: Validation added, throws on invalid data.

### TASK-065: Integration testing with real Airtable
**Type**: Validation | **Time**: 1.5 hours
Test upsert in staging: create new, update existing, verify linked fields, check views.
**Done**: All scenarios verified, leaderboard view works.

## Summary
**Total**: 12 tasks | **Time**: 7-9 hours
**Success**: Dual storage working, Airtable views show correct data, reporting enabled.

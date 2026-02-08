# Tasks for STORY-004: Circle.so Custom Field Integration

**Story**: [[STORY-004]] - Circle.so Custom Field Integration
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: High
**Total Tasks**: 10
**Estimated Time**: 6-8 hours

## Overview

Store streak data in Circle.so custom fields to enable workflow automations. Update currentStreak, longestStreak, lastCheckinDate custom fields after each check-in.

## Dependencies
- [[STORY-001]] - Fix Visit Count Bug (fixed updateMemberCustomField)
- [[STORY-002]] - Streak Calculation Engine (provides streak values)

## Tasks

### TASK-044: Manual setup - Add custom fields to Circle.so
**Type**: Setup (MANUAL) | **Time**: 30 min
Add 3 custom fields in Circle.so admin: currentStreak (Number), longestStreak (Number), lastCheckinDate (Text).
**Done**: Fields visible in Circle member profiles.

### TASK-045: Write tests for updateStreakFields
**Type**: Test | **Time**: 1 hour
Test updateStreakFields calls updateMemberCustomField 3 times with correct values, handles errors gracefully, logs updates.
**Done**: 6+ tests written, all fail.

### TASK-046: Write tests for field format validation
**Type**: Test | **Time**: 30 min
Test lastCheckinDate formatted as ISO 8601 (YYYY-MM-DD), numeric fields are numbers, null handling.
**Done**: 4+ tests written, all fail.

### TASK-047: Implement updateStreakFields function
**Type**: Implementation | **Time**: 1 hour
```javascript
async function updateStreakFields(memberId, streakData) {
  try {
    await updateMemberCustomField(memberId, 'currentStreak', streakData.currentStreak);
    await updateMemberCustomField(memberId, 'longestStreak', streakData.longestStreak);
    await updateMemberCustomField(memberId, 'lastCheckinDate', streakData.lastCheckinDate);
    return { success: true };
  } catch (error) {
    console.error('Failed to update Circle streak fields:', error.message);
    return { success: false, error: error.message };
  }
}
```
**Done**: Function implemented, TASK-045 tests pass.

### TASK-048: Add date formatting for lastCheckinDate
**Type**: Implementation | **Time**: 30 min
Ensure lastCheckinDate formatted as YYYY-MM-DD using formatDateISO from STORY-007.
**Done**: Date formatting correct, TASK-046 tests pass.

### TASK-049: Integrate with check-in handler
**Type**: Integration | **Time**: 1 hour
Call updateStreakFields in checkin.js after streak calculation, pass streakData object.
**Done**: Integration complete, fields updated on check-in.

### TASK-050: Add retry logic for Circle.so failures
**Type**: Enhancement | **Time**: 45 min
Implement simple retry (1 attempt) on network errors.
**Done**: Retry logic added, tested with mock failures.

### TASK-051: Expand circle.test.js coverage
**Type**: Test | **Time**: 45 min
Add integration-style tests for complete flow: calculate streak → update fields.
**Done**: 8+ new tests, 90%+ coverage on Circle.so code.

### TASK-052: Manual testing in staging Circle.so
**Type**: Validation | **Time**: 1 hour
Check-in via staging API, verify custom fields update in Circle.so admin panel.
**Done**: Fields verified in Circle.so, values correct.

### TASK-053: Update CIRCLE_PERMISSIONS.md
**Type**: Documentation | **Time**: 30 min
Document required permissions for custom field updates, add troubleshooting.
**Done**: Documentation updated with new custom fields.

## Summary
**Total**: 10 tasks | **Time**: 6-8 hours
**Success**: Custom fields update correctly, workflow automations enabled, non-blocking failures.

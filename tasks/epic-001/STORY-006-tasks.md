# Tasks for STORY-006: Enhanced Check-in Response Messaging

**Story**: [[STORY-006]] - Enhanced Check-in Response Messaging
**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Priority**: Medium
**Total Tasks**: 6
**Estimated Time**: 3-4 hours

## Overview

Add personalized streak messages to check-in API response. Motivational, celebratory tone that encourages continued attendance.

## Dependencies
- [[STORY-002]] - Streak Calculation Engine (provides streak data)
- [[STORY-004]] - Circle.so storage (provides stored values)
- [[STORY-005]] - Airtable storage (provides stored values)

## Tasks

### TASK-066: Write tests for formatStreakMessage
**Type**: Test | **Time**: 1 hour
Test all message variations: first check-in ("Welcome!"), continued ("5-week streak!"), personal best ("New record!"), broken ("Welcome back!"), grammar (1-week vs 2-week).
**Done**: 8+ tests written, all fail.

### TASK-067: Implement formatStreakMessage function
**Type**: Implementation | **Time**: 45 min
```javascript
function formatStreakMessage(streakData, isFirstCheckIn) {
  if (isFirstCheckIn) return "Welcome! Your streak begins today";
  if (streakData.isPersonalBest) {
    const weeks = streakData.currentStreak;
    const word = weeks === 1 ? 'week' : 'weeks';
    return `New record! ${weeks}-${word} streak!`;
  }
  if (streakData.streakBroken) return "Welcome back! New streak started";
  const weeks = streakData.currentStreak;
  const word = weeks === 1 ? 'week' : 'weeks';
  return `${weeks}-${word} streak!`;
}
```
**Done**: Function implemented, TASK-066 tests pass.

### TASK-068: Enhance check-in response structure
**Type**: Implementation | **Time**: 30 min
Add streakMessage and streakData fields to JSON response, maintain backward compatibility with existing message field.
**Done**: Response structure enhanced, includes all streak info.

### TASK-069: Integrate formatStreakMessage in checkin.js
**Type**: Integration | **Time**: 45 min
Call formatStreakMessage after streak calculation, include in response body.
**Done**: Integration complete, streak messages returned.

### TASK-070: Write tests for response structure
**Type**: Test | **Time**: 30 min
Test response has message, streakMessage, streakData fields, backward compatible, debug mode includes debug flag.
**Done**: 4+ response tests, all pass.

### TASK-071: Manual testing - verify message tone
**Type**: Validation | **Time**: 30 min
Test all scenarios manually, verify positive/encouraging tone, check grammar, get user feedback.
**Done**: Messages verified, tone appropriate, no negative language.

## Summary
**Total**: 6 tasks | **Time**: 3-4 hours
**Success**: Motivational messages displayed, positive tone, all scenarios covered, backward compatible.

# STORY-006: Enhanced Check-in Response Messaging

**Epic**: [[EPIC-001]] - Visit Count and Streak Tracking System
**Status**: Ready
**Complexity**: Small
**Priority**: Medium
**Created**: 2026-02-07
**Last Updated**: 2026-02-07

## User Story

As an attendee,
I want to see my attendance streak status when I check in,
So that I feel motivated to maintain consistent attendance and celebrate my engagement milestones.

## Context

Currently, the check-in API returns a simple "Check-in successful" message. User testing showed that **streak messaging is more motivating than raw visit counts**. Members respond better to "3-week streak!" than "Total visits: 42".

This story enhances the API response to include personalized, encouraging streak messages that:
- Celebrate continued streaks ("5-week streak!")
- Highlight personal bests ("New record! 10-week streak!")
- Welcome back members who broke streaks ("Welcome back! New streak started")
- Provide context ("Current: 3 weeks, Longest: 8 weeks")

**Message Priority** (order of display):
1. Streak status (new, maintained, broken)
2. Personal best notification (if applicable)
3. Total visit count (secondary info)

**Tone**: Encouraging, positive, celebratory (avoid negative language about broken streaks)

## Acceptance Criteria

### Functional Requirements
- [ ] API response includes `streakMessage` field (primary display message)
- [ ] API response includes structured streak data: `currentStreak`, `longestStreak`, `isPersonalBest`, `streakBroken`
- [ ] API response includes `checkinCount` (total visits)
- [ ] First check-in message: "Welcome! Your streak begins today"
- [ ] Maintained streak message: "{N}-week streak!" (e.g., "5-week streak!")
- [ ] Personal best message: "New record! {N}-week streak!" (emphasis on achievement)
- [ ] Broken streak message: "Welcome back! New streak started" (positive framing)
- [ ] Response format is backward compatible (existing `message` field unchanged)

### Non-Functional Requirements
- [ ] Message generation is fast (<10ms, no external calls)
- [ ] Messages are grammatically correct (singular vs plural: "1-week streak" vs "2-week streak")
- [ ] Response JSON structure is documented for frontend integration
- [ ] Works for all check-in scenarios (first, continued, broken, debug)

### Testing Requirements
- [ ] Unit test: First check-in message format
- [ ] Unit test: Continued streak message (2-10 weeks)
- [ ] Unit test: Personal best message
- [ ] Unit test: Broken streak message (positive framing)
- [ ] Unit test: Grammar correctness (1 week vs 2 weeks)
- [ ] Unit test: Debug check-ins receive appropriate message
- [ ] Integration test: Verify message in actual check-in response

## Technical Implementation Notes

### Approach

Create a message formatting function in the check-in handler that generates personalized messages based on streak calculation results. This is a simple formatting layer - no business logic, just string construction.

**Key Function**:
```javascript
/**
 * Format streak message for check-in response
 * @param {object} streakData - Results from streak calculation
 * @param {number} streakData.currentStreak - Current consecutive weeks
 * @param {number} streakData.longestStreak - Personal best
 * @param {boolean} streakData.streakBroken - Whether streak was broken this check-in
 * @param {boolean} streakData.isPersonalBest - Whether this is a new personal best
 * @param {boolean} isFirstCheckIn - Whether this is member's first check-in ever
 * @returns {string} Formatted message
 */
function formatStreakMessage(streakData, isFirstCheckIn) {
  // Implementation
}
```

**Response Structure** (new fields added):
```json
{
  "message": "Check-in successful",
  "streakMessage": "5-week streak!",
  "streakData": {
    "currentStreak": 5,
    "longestStreak": 8,
    "isPersonalBest": false,
    "streakBroken": false,
    "checkinCount": 23
  }
}
```

### Components/Files Affected

**Modified File**: `netlify/functions/checkin.js`
- Add `formatStreakMessage(streakData, isFirstCheckIn)` function
- Enhance response object with `streakMessage` and `streakData` fields
- Call after streak calculation and storage

**Modified File**: `tests/checkin.test.js`
- Add test suite for message formatting
- Test all message scenarios
- Verify response structure

**No New Files**: This is a simple formatting enhancement to existing check-in handler

### Integration Points

**Input Data** (from previous stories):
- Streak calculation results (STORY-002)
- Check-in count (STORY-001, fixed increment)
- First check-in flag (from attendee lookup)

**Output**:
- JSON response to check-in API caller (frontend)
- No external API calls or database writes

### Technical Considerations

**Message Logic** (pseudo-code):
```javascript
function formatStreakMessage(streakData, isFirstCheckIn) {
  // First check-in ever
  if (isFirstCheckIn) {
    return "Welcome! Your streak begins today";
  }

  // Personal best achieved
  if (streakData.isPersonalBest) {
    const weeks = streakData.currentStreak;
    const weekWord = weeks === 1 ? 'week' : 'weeks';
    return `New record! ${weeks}-${weekWord} streak!`;
  }

  // Streak broken (positive framing)
  if (streakData.streakBroken) {
    return "Welcome back! New streak started";
  }

  // Continued streak (normal case)
  const weeks = streakData.currentStreak;
  const weekWord = weeks === 1 ? 'week' : 'weeks';
  return `${weeks}-${weekWord} streak!`;
}
```

**Grammar Handling**:
```javascript
// Singular vs plural
const weekWord = count === 1 ? 'week' : 'weeks';

// Examples:
// 1-week streak
// 2-week streak
// 10-week streak
```

**Debug Check-ins**:
```javascript
// For debug check-ins, still return streak message but maybe add indicator
if (sanitized.debug === '1') {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Check-in successful (debug)',
      streakMessage: formatStreakMessage(streakData, isFirstCheckIn),
      streakData: streakData,
      debug: true
    })
  };
}
```

**Message Variations** (examples):
```javascript
// First check-in
"Welcome! Your streak begins today"

// Week 1
"1-week streak!"

// Week 5
"5-week streak!"

// Personal best (first time hitting this number)
"New record! 10-week streak!"

// Broken streak (missed week, coming back)
"Welcome back! New streak started"

// Broken streak, new check-in (now at week 1 again)
"1-week streak!"
```

**Extended Context** (optional, for future enhancement):
```javascript
// Could add secondary message with more context
const contextMessage = `Current: ${currentStreak} weeks, Longest: ${longestStreak} weeks`;

// Response:
{
  "streakMessage": "5-week streak!",
  "contextMessage": "Current: 5 weeks, Longest: 8 weeks"
}
```

**Edge Cases**:
1. **No streak data available** (calculation failed): Return generic success message
2. **First check-in with error**: Return welcome message without streak details
3. **Duplicate check-in**: Return existing message from earlier check-in
4. **Debug mode**: Include streak message but mark as debug

**Response Backward Compatibility**:
```javascript
// Old response (still works for old clients)
{
  "message": "Check-in successful"
}

// New response (new clients can use streakMessage)
{
  "message": "Check-in successful",  // Keep for compatibility
  "streakMessage": "5-week streak!",  // NEW
  "streakData": { ... }  // NEW
}
```

### Existing Patterns to Follow

**Response Format**: Existing JSON structure in checkin.js
**Error Handling**: If formatting fails, fall back to generic message
**Logging**: Console.log streak data for debugging

### Performance Considerations

- Pure string formatting (no computation)
- No external API calls
- No database queries
- Execution time: <1ms
- Negligible impact on check-in response time

## Dependencies

### Blocks
- None (final step in check-in flow)

### Blocked By
- [[STORY-002]] - Streak Calculation Engine (provides streakData to format)
- [[STORY-004]] - Circle.so Custom Fields (provides streak values)
- [[STORY-005]] - Airtable Streaks Table (provides streak values)

### Related
- [[STORY-008]] - Comprehensive Testing (test message variations)

## Out of Scope

**Explicitly NOT included in this story**:
- Frontend UI implementation (this is backend API only)
- Email notifications about streaks (future enhancement)
- Push notifications (future enhancement)
- Streak visualization (charts, graphs) (future dashboard Epic)
- Localization/translation (English only for MVP)
- Custom messages per event type (all events use same messages)
- Message personalization by member name (could add in future)
- Social sharing of streaks (future enhancement)

## Notes

**Message Tone Guidelines**:
- **Positive**: Always frame messages positively (no "streak broken" language)
- **Celebratory**: Use exclamation marks for achievements
- **Encouraging**: Welcome members back without guilt
- **Clear**: Use simple, direct language
- **Motivating**: Emphasize current achievement, not deficits

**Broken Streak Messaging Strategy**:
- OLD (negative): "Your streak was broken" ❌
- NEW (positive): "Welcome back! New streak started" ✅
- Rationale: Avoid discouragement, focus on fresh start

**Frontend Integration Notes** (for reference):
```javascript
// Frontend can display streakMessage prominently
if (response.streakMessage) {
  displayStreakBanner(response.streakMessage);
}

// Secondary display of details
if (response.streakData) {
  showStreakDetails(response.streakData);
}

// Fallback for old API version
if (!response.streakMessage) {
  displayMessage(response.message);
}
```

**Future Message Enhancements**:
- Milestone messages: "5 visits milestone!", "10-week legend!", "Year-long member!"
- Seasonal messages: "Summer streak champion!", "Holiday consistency award!"
- Comparative messages: "Top 10% of attendees!", "Longest active streak!"
- Personalized messages: "Great to see you, John! 5-week streak!"

**A/B Testing Opportunities** (future):
- Test different message tones (casual vs formal)
- Test emoji usage: "🔥 5-week streak!" vs "5-week streak!"
- Test emphasis: "5-week streak!" vs "Amazing! 5-week streak!"
- Test context inclusion: With vs without "Longest: 8 weeks"

**Accessibility Considerations**:
- Messages should be readable by screen readers
- Avoid emoji for critical information (supplementary only)
- Clear, plain language (no jargon)

**Testing Strategy**:
- Unit tests cover all message variations
- Manual testing with real check-ins to verify feel/tone
- User feedback collection post-launch (future iteration)

**Duplicate Check-in Message** (existing behavior, confirm it still works):
```json
{
  "message": "Already checked in for this event today",
  "alreadyCheckedIn": true,
  "checkinDate": "2026-02-07T10:30:00.000Z"
}
```
- This should NOT show streak message (not a new check-in)
- Existing logic already handles this - no changes needed

---

**Next Steps**: This Story is READY for task breakdown. Simple implementation, should be quick to complete. Depends on STORY-002, STORY-004, and STORY-005 being complete. This is typically the last step in the check-in flow before returning response to client.

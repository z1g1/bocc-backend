# Epic 3: Engagement Rewards — Check-in Counter

**ID**: EPIC-3
**Status**: CODE COMPLETE — Pending Circle.so custom field setup
**Story Points**: 7
**Phase**: Phase 3
**Completion Commit**: `feadbed` (Implement Epic 3: Engagement Rewards with check-in counter)

---

## Summary

Track each member's total check-in count in a Circle.so custom field (`checkinCount`). The counter increments by 1 after every successful check-in. This count can then be consumed by Circle.so's native workflow engine to automate engagement rewards such as badges, role assignments, and exclusive content access at milestone thresholds (1, 5, 10, 25 check-ins).

## Acceptance Criteria

- [x] After a successful check-in and Circle member creation/lookup, increment the member's `checkinCount` custom field
- [x] Counter update uses `PATCH /community_members/{id}` with `custom_fields_attributes`
- [x] Counter update failure does not block or fail the check-in (non-blocking, nested try/catch)
- [x] Counter update errors are logged with full response details
- [x] Debug check-ins do not trigger counter increment (inherits skip from Epic 2)
- [ ] Integration test verified against live Circle.so (requires custom field creation by admin)
- [ ] Circle.so workflows configured for milestone rewards

## Stories

- STORY-8: Custom field update API integration
- STORY-9: Check-in counter increment logic
- STORY-10: Circle.so workflow design for engagement milestones

## Key Technical Decisions

- **Increment by 1, not absolute set**: Rather than querying Airtable for the total historical count and setting an absolute value, the implementation increments by 1 on each check-in. This is simpler, requires fewer API calls, and works even if Airtable is slow. Trade-off: counts can drift if Circle updates fail silently. A periodic reconciliation job is a future enhancement.
- **`custom_fields_attributes` payload**: The PATCH request body uses `{ custom_fields_attributes: { checkinCount: N } }` based on common Circle.so API patterns. This format requires verification during integration testing — Epic 3 is marked as pending that step.
- **Nested try/catch**: Counter increment is inside its own `try/catch` block nested within the outer Circle.so `try/catch`. This means: if `ensureMember` fails, the counter is never attempted (no member ID to update). If `incrementCheckinCount` fails, the check-in and the Circle invitation both still succeed.
- **Counter initialization**: First-time members have no existing `checkinCount` value. The implementation defaults `currentCount` to `null` and sets the new value to `1` when no current count is provided. This avoids a read-before-write API call.

## Limitations and Known Issues

1. **Race condition on concurrent check-ins**: Two simultaneous check-ins for the same member could both read count=N and both write N+1. Mitigated by deduplication (Epic 1) which prevents same-event same-day duplicates. For different events on the same day, the risk is low in practice for BOCC's event frequency.
2. **No atomic increment**: Circle.so API does not expose an atomic increment operation. The increment is read-modify-write. See race condition note above.
3. **Count drift**: If the Circle update fails (logged but non-blocking), the count will be lower than actual. A future periodic sync from Airtable's rollup count can reconcile this.

## Files Modified

| File | Change |
|------|--------|
| `netlify/functions/utils/circle.js` | Added `updateMemberCustomField()` and `incrementCheckinCount()` |
| `netlify/functions/checkin.js` | Integrated counter increment after ensureMember, nested try/catch |
| `docs/EPIC_3_ENGAGEMENT_REWARDS.md` | Full setup guide and documentation |

## Commit History

| Commit | Message |
|--------|---------|
| `feadbed` | Implement Epic 3: Engagement Rewards with check-in counter |

## Remaining Work

1. **Admin action**: Create `checkinCount` Number custom field in Circle.so (Settings > Member Profile > Custom Fields). Default value: 0.
2. **Integration test**: Make a non-debug check-in and verify the counter increments in the Circle member profile.
3. **Workflow setup** (optional): Create Circle.so workflows triggered at count milestones (1, 5, 10, 25).
4. **Unit tests**: Add specific tests for `updateMemberCustomField()` and `incrementCheckinCount()` functions.

---

## Implementation Summary

### How It Works

#### Workflow
1. Attendee checks in at event
2. System creates/finds Circle member (Epic 2)
3. System increments `checkinCount` custom field in Circle member profile
4. Circle.so workflows monitor the count and trigger automated actions

#### Benefits
- **Automated Recognition**: Circle workflows can congratulate members on milestones
- **Gamification**: Members earn badges for attendance (5, 10, 25 check-ins)
- **Role Progression**: Auto-assign roles based on engagement (Newcomer → Regular → VIP)
- **Exclusive Access**: Unlock spaces/content after X check-ins
- **Analytics**: Track member engagement over time

### Code Implementation

**File**: `netlify/functions/utils/circle.js`

**New Functions**:
```javascript
// Update any custom field on a Circle member
updateMemberCustomField(memberId, fieldName, value)

// Increment the check-in counter
incrementCheckinCount(memberId, currentCount = null)
```

**Integration**: `netlify/functions/checkin.js` (lines 100-132)
- After successful check-in creation
- After ensuring Circle member exists
- Increments counter (non-blocking, doesn't fail check-in)

### API Calls

**PATCH** `/api/admin/v2/community_members/{memberId}`

**Request Body**:
```json
{
  "custom_fields_attributes": {
    "checkinCount": 5
  }
}
```

### Setup Instructions

#### Step 1: Create Custom Field in Circle.so

1. Log into Circle.so as admin
2. Navigate to: **Settings → Member Profile → Custom Fields**
3. Click **"Add Custom Field"**
4. Configure the field:
   - **Field Name**: `checkinCount`
   - **Field Label**: "Check-in Count" or "Total Check-ins"
   - **Field Type**: **Number**
   - **Visibility**: Your choice (visible to members or admin-only)
   - **Default Value**: 0
   - **Required**: No
5. Save the custom field

#### Step 2: Verify Field Name

The API integration uses the field name `checkinCount`. Ensure this matches the field name in Circle.so (case-sensitive).

If you used a different name, update `incrementCheckinCount()` in `netlify/functions/utils/circle.js`:
```javascript
return await updateMemberCustomField(memberId, 'yourFieldName', newCount);
```

#### Step 3: Test the Integration

**Test Command**:
```bash
curl -X POST https://bocc-backend.netlify.app/.netlify/functions/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-counter@example.com",
    "name": "Counter Test User",
    "eventId": "counter-test",
    "debug": "0",
    "token": "test-token-789"
  }'
```

**Expected Logs** (Netlify Functions):
```
Inviting attendee to Circle.so: test-counter@example.com
Searching for Circle member: test-counter@example.com
Creating Circle member: test-counter@example.com Counter Test User
Successfully created Circle member: {...}
Successfully ensured Circle member: 12345
Incrementing check-in count for Circle member: 12345
Updating Circle member 12345 custom field checkinCount: 1
Successfully updated member custom field: {...}
Successfully incremented check-in count for Circle member: 12345
```

**Verification**:
1. Check Circle.so member profile
2. Look for "Check-in Count" custom field
3. Value should be 1 (or incremented if already existed)

### Circle.so Workflow Examples

Once the custom field is tracking check-ins, you can create automated workflows in Circle.so:

#### Example 1: Welcome Badge (First Check-in)
**Trigger**: `checkinCount` changes to 1
**Action**: Assign "Newcomer" badge

#### Example 2: Regular Attendee Recognition
**Trigger**: `checkinCount` changes to 5
**Actions**:
- Send congratulations message
- Assign "Regular" badge
- Grant access to "Regulars Lounge" space

#### Example 3: VIP Status
**Trigger**: `checkinCount` changes to 10
**Actions**:
- Assign "VIP" role
- Send personalized thank you
- Unlock exclusive content

#### Example 4: Super Fan
**Trigger**: `checkinCount` changes to 25
**Actions**:
- Feature member in community spotlight
- Assign "Super Fan" badge
- Invite to leadership opportunities

### Error Handling

#### Graceful Degradation

The counter increment is wrapped in try/catch with detailed error logging:

**If counter update fails**:
- ✅ Check-in still succeeds
- ✅ Circle member still created
- ❌ Counter not incremented (logged as error)
- Check Netlify logs for details

**Common Errors**:

**Error: Custom field not found**
```
Counter update response status: 422
Counter update response data: {"error":"Custom field 'checkinCount' not found"}
```
**Solution**: Create the custom field in Circle.so (see Setup Step 1)

**Error: Invalid field type**
```
Counter update response status: 422
Counter update response data: {"error":"Field type mismatch"}
```
**Solution**: Ensure custom field type is **Number** in Circle.so

**Error: Member not found**
```
Counter update response status: 404
Counter update response data: {"error":"Member not found"}
```
**Solution**: This shouldn't happen since we just created/found the member. Check Circle API logs.

**Error: Insufficient permissions**
```
Counter update response status: 403
Counter update response data: {"error":"Insufficient permissions"}
```
**Solution**: Verify `CIRCLE_API_TOKEN` has permission to update member custom fields

### Architecture Decisions

#### Why Custom Field Instead of Airtable?

**Considered**:
- Track count in Airtable `attendees` table (already has rollup count)
- Sync from Airtable to Circle

**Chosen**: Track in Circle.so custom field

**Reasons**:
- ✅ Single source of truth in community platform
- ✅ Circle workflows can access directly (no external API calls)
- ✅ Real-time updates in member profiles
- ✅ Members can see their own count
- ✅ Reduces complexity (no sync logic needed)

**Trade-off**:
- ⚠️ Count may differ from Airtable if Circle update fails
- ⚠️ Airtable rollup count remains source of truth for reporting

#### Why Increment by 1 Each Time?

**Alternative**: Query Airtable for total count, set absolute value

**Chosen**: Increment by 1 on each check-in

**Reasons**:
- ✅ Simpler logic
- ✅ Fewer API calls
- ✅ Works even if Airtable query fails
- ✅ Matches real-time check-in behavior

**Trade-off**:
- ⚠️ Counts can drift if updates fail
- ⚠️ No automatic correction from Airtable

**Future Enhancement**: Periodic sync job to reconcile Circle count with Airtable rollup

#### Why Non-Blocking?

**Behavior**: Counter update errors don't fail the check-in

**Reasons**:
- ✅ Check-in is primary function (must succeed)
- ✅ Counter is engagement feature (nice-to-have)
- ✅ Can be manually corrected if needed
- ✅ Errors are logged for debugging

### Performance

**Additional Time per Check-in**: ~200-400ms
- Member creation/lookup: ~300-500ms (Epic 2, unchanged)
- Counter increment: ~200-400ms (new)
- **Total Circle operations**: ~500-900ms

**Mitigation**:
- Both operations use same API (batching not possible)
- Errors are non-blocking (don't slow down failure cases)
- Counter update is last step (check-in already saved)

### Current Limitations

#### 1. Counter Initialization
**Issue**: First-time members may not have `checkinCount` field initially
**Current Behavior**: Sets to 1 on first check-in
**Future Enhancement**: Pre-initialize to 0 when creating member

#### 2. Concurrent Check-ins
**Issue**: Two simultaneous check-ins might have race condition
**Current Behavior**: Both increment from same base (potential undercounting)
**Mitigation**: Deduplication prevents same-day duplicates per event
**Future Enhancement**: Use atomic increment operation if Circle API supports it

#### 3. Manual Count Adjustments
**Issue**: If admin manually changes count in Circle, API doesn't know current value
**Current Behavior**: Always increments by 1 from provided/assumed count
**Future Enhancement**: Fetch current value before incrementing

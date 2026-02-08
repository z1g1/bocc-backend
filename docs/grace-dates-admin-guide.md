# Grace Dates Admin Guide

## What are Grace Dates?

Grace dates are declared holidays or exceptions where BOCC does not meet. Members who miss these dates will NOT have their attendance streak broken.

**Examples**: Christmas week, New Year's week, summer break, weather cancellations

## When to Add Grace Dates

Add grace dates for:
- **Holiday weeks**: Christmas, New Year's, Thanksgiving
- **Planned community breaks**: Summer break, winter break
- **Event cancellations**: Weather, venue issues, community-wide breaks
- **Special circumstances**: Conference weeks, major community events

## Setup: Create grace_dates Table (One-Time)

**⚠️ IMPORTANT**: This must be done once before grace dates can be used.

### Step 1: Create Table

1. Open your BOCC Airtable base
2. Click "Add or import" → "Create new table"
3. Name it: `grace_dates`

### Step 2: Add Fields

Add these fields in the order shown:

| Field Name | Field Type | Configuration |
|------------|------------|---------------|
| `id` | Auto Number | (Created automatically) |
| `date` | Date | Format: Local, no time |
| `eventId` | Single Line Text | - |
| `reason` | Long Text | - |
| `createdAt` | Created time | (Auto-populated) |

### Step 3: Create Views

Create these views for easier management:

1. **All Grace Dates** (Default view)
   - Sort by: `date` (descending)
   - Shows all grace dates

2. **BOCC Events**
   - Filter: `eventId` = "bocc"
   - Sort by: `date` (descending)

3. **Upcoming**
   - Filter: `date` >= TODAY()
   - Sort by: `date` (ascending)
   - Shows future grace dates

### Step 4: Add Test Data

Add these sample records for testing:

```
Record 1:
date: 2025-12-23
eventId: bocc
reason: Week before Christmas - community break

Record 2:
date: 2025-12-30
eventId: bocc
reason: Between holidays - office closed
```

## How to Add a Grace Date

Once the table is set up, adding grace dates is simple:

### Quick Steps

1. **Open Airtable**
   - Navigate to BOCC Airtable base
   - Open `grace_dates` table

2. **Add New Record**
   - Click "+ New record" button or press "+" key
   - Fill in the required fields:
     - **date**: Select the Tuesday date (use calendar picker)
     - **eventId**: Enter "bocc" (or other event type)
     - **reason**: Brief explanation of why this is a grace date
   - Click Save (or press Enter)
   - **createdAt** will auto-populate

3. **Verify**
   - Check that the date appears in "Upcoming" view
   - Verify eventId is correct ("bocc" for BOCC events)
   - Confirm the reason is clear

### Example Grace Dates

```
📅 Holiday Breaks:
date: 2025-12-23
eventId: bocc
reason: Week before Christmas

date: 2025-12-30
eventId: bocc
reason: Between holidays - community break

📅 Summer Break:
date: 2026-07-07
eventId: bocc
reason: Summer break week 1

date: 2026-07-14
eventId: bocc
reason: Summer break week 2

📅 Weather Cancellations:
date: 2026-02-03
eventId: bocc
reason: Snowstorm - event cancelled

📅 Special Events:
date: 2026-03-10
eventId: bocc
reason: SXSW week - community at conference
```

## Best Practices

### Planning Ahead
- ✅ Add grace dates **BEFORE** the date occurs (ideally at start of year)
- ✅ Give members at least 1 week notice when possible
- ✅ Plan for known holidays at the beginning of each year

### Consistency
- ✅ Be consistent with `reason` formatting (helps with reporting)
- ✅ Use clear, descriptive reasons (others will see these)
- ✅ Always use "bocc" for BOCC Tuesday events (case-sensitive!)

### Data Management
- ❌ Don't delete grace dates (historical record is useful)
- ✅ Keep old grace dates for reporting and analysis
- ✅ Use views to filter upcoming vs past grace dates

### Communication
- ✅ Announce grace dates to members in advance
- ✅ Update community calendar when adding grace dates
- ✅ Consider posting in Circle.so about upcoming breaks

## Troubleshooting

### Q: Grace date not preventing streak break?

**A**: Check these items:
1. Verify `eventId` matches exactly (case-sensitive: "bocc" not "BOCC")
2. Verify date is in YYYY-MM-DD format
3. Check that date is within ±1 year from today (older dates ignored)
4. Ensure grace_dates table exists and is accessible

### Q: Can I add grace dates retroactively?

**A**: Yes, but with caveats:
- Grace dates can be added after the fact
- However, streaks already broken won't automatically restore
- Requires manual streak correction for affected members
- Best to add grace dates in advance

### Q: How far in advance should I add grace dates?

**A**: Recommended timeline:
- **Known holidays**: Add at start of year (January)
- **Planned breaks**: Add at least 4 weeks in advance
- **Unexpected cancellations**: Add as soon as decided

### Q: What if I entered the wrong date?

**A**:
1. **Before the date**: Simply edit the record (click the date field)
2. **After the date**: Edit if needed, but won't affect already-calculated streaks
3. **Never delete**: Edit instead to maintain history

### Q: Can I use grace dates for other events (not BOCC)?

**A**: Yes! Use different `eventId` values:
- `bocc` - Regular BOCC Tuesday meetings
- `codeCoffee` - Code Coffee events
- `networkingNight` - Networking nights
- etc.

### Q: How do I see all grace dates for the year?

**A**: Use the "All Grace Dates" view:
1. Sort by date (descending to see most recent first)
2. Filter by year if needed
3. Export to CSV for planning purposes

## Technical Notes

### How Grace Dates Work

1. **Check-in Time**: When a member checks in, the system:
   - Queries grace dates for that event type (`eventId`)
   - Checks if there are any grace dates between last check-in and today
   - If yes, those dates are "excused" and don't break the streak

2. **Caching**: Grace dates are cached per-request for performance
   - Each API request queries once, then caches results
   - Reduces load on Airtable
   - Cache clears between requests

3. **Date Range**: System queries ±1 year from today
   - Older grace dates are ignored (performance optimization)
   - Future grace dates up to 1 year ahead are included

### Database Schema

```
Table: grace_dates
├── id (Auto Number) - Unique identifier
├── date (Date) - The grace date (YYYY-MM-DD)
├── eventId (Text) - Event type ("bocc", "codeCoffee", etc.)
├── reason (Long Text) - Why this is a grace date
└── createdAt (Created time) - When record was added
```

### API Integration

Grace dates are automatically:
- Queried during streak calculations
- Cached for performance
- Used to determine if a missed week should break streak

No manual API calls needed - system handles it automatically!

## Support

Need help with grace dates?
- Check this guide first
- Review troubleshooting section above
- Contact development team if technical issues persist

---

**Last Updated**: February 2026
**Related Documentation**:
- Epic 1: Visit Count and Streak Tracking System
- Story 3: Grace Date Management
- Streak Calculation Logic Documentation

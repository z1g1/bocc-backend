# BOCC Backend - Epic Planning

This directory contains Epic-level planning documentation for the Buffalo Open Coffee Club (BOCC) backend API.

## Epic Hierarchy

```
Epic (this level) → Story → Task
```

Epics define large bodies of work that deliver significant business value. Each Epic is broken down into User Stories, which are then decomposed into implementation Tasks.

## Active Epics

### EPIC-001: Visit Count and Streak Tracking System
**Status**: Draft
**Priority**: Critical
**Effort**: Medium (2-4 weeks)
**Created**: 2026-02-07

Fix critical visit count bug (always resets to 1) and implement week-to-week streak tracking for BOCC Tuesday events. Includes grace date system for holidays, dual storage (Circle.so + Airtable), and enhanced check-in messaging.

**Key Features**:
- Fix `incrementCheckinCount` bug (production issue)
- Streak calculation engine (weekly, timezone-aware)
- Grace date functionality
- Circle.so custom fields integration
- Airtable streaks table for reporting
- Enhanced API response with streak messaging

**File**: [EPIC-001-visit-streak-tracking.md](EPIC-001-visit-streak-tracking.md)

---

## Epic Status Definitions

- **Draft**: Epic is being defined, not yet approved
- **Planned**: Epic is approved and ready for Story breakdown
- **In Progress**: Stories are being implemented
- **Completed**: All Stories completed and Epic goals achieved

## Priority Levels

- **Critical**: Production bug or blocking issue - must fix immediately
- **High**: Important for business goals, significant user impact
- **Medium**: Valuable enhancement, moderate user impact
- **Low**: Nice to have, minor improvement

## Effort Estimates

- **Small**: 1-2 weeks (1-3 Stories)
- **Medium**: 2-4 weeks (3-8 Stories)
- **Large**: 1-2 months (8-15 Stories)
- **XL**: 2+ months (15+ Stories, consider splitting)

## Future Epics (Planned)

These Epics are identified but not yet documented:

- **Admin Dashboard**: Visualization and analytics for streak data, leaderboards, engagement metrics
- **Historical Backfill**: Calculate streaks for past check-ins after data cleanup
- **Data Cleanup**: Deduplicate attendees and check-ins, normalize data quality
- **Multi-Event Support**: Extend streak tracking to Code Coffee and other events
- **Automated Rewards**: Circle.so workflow integration for streak milestones

## Out of Scope (Deferred)

These items are explicitly not planned for the current roadmap:

- Mobile app development
- Push notification system
- Real-time dashboard updates
- Third-party calendar integrations
- Payment processing for events

---

**Last Updated**: 2026-02-07
**Next Review**: After EPIC-001 completion

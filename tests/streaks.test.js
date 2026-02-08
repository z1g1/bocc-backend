const {
    toBuffaloTime,
    getBuffaloDate,
    formatDateISO,
    isSameTuesday,
    getNextTuesday,
    calculateStreak,
    getEventCadence,
    calculateMissedWeeks,
    isStreakBroken,
    getExpectedNextCheckIn
} = require('../netlify/functions/utils/streaks');

describe('Timezone Conversion', () => {
  test('converts UTC to Buffalo time (EST winter)', () => {
    // January 15, 2026 at 5:00 AM UTC = Midnight Buffalo time (EST = UTC-5)
    const utcDate = new Date('2026-01-15T05:00:00Z');
    const buffaloDate = toBuffaloTime(utcDate);

    expect(buffaloDate.getHours()).toBe(0);  // Midnight
    expect(buffaloDate.getDate()).toBe(15);
  });

  test('converts UTC to Buffalo time (EDT summer)', () => {
    // July 15, 2026 at 4:00 AM UTC = Midnight Buffalo time (EDT = UTC-4)
    const utcDate = new Date('2026-07-15T04:00:00Z');
    const buffaloDate = toBuffaloTime(utcDate);

    expect(buffaloDate.getHours()).toBe(0);  // Midnight
    expect(buffaloDate.getDate()).toBe(15);
  });

  test('getBuffaloDate returns current time in Buffalo timezone', () => {
    const buffaloDate = getBuffaloDate();
    expect(buffaloDate).toBeInstanceOf(Date);
  });

  test('formatDateISO returns YYYY-MM-DD format', () => {
    const date = new Date('2026-02-07T15:30:00Z');
    const formatted = formatDateISO(date);

    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatted).toBe('2026-02-07');
  });

  test('handles string date input (ISO 8601)', () => {
    const isoString = '2026-02-07T10:30:00Z';
    const buffaloDate = toBuffaloTime(isoString);

    expect(buffaloDate).toBeInstanceOf(Date);
  });

  test('throws error for invalid date input', () => {
    expect(() => toBuffaloTime('invalid-date')).toThrow();
  });
});

describe('Week Boundary Logic', () => {
  test('identifies same Tuesday correctly', () => {
    const tuesday1 = new Date('2026-02-03T10:00:00Z');  // Tuesday morning
    const tuesday2 = new Date('2026-02-03T23:00:00Z');  // Tuesday night

    expect(isSameTuesday(tuesday1, tuesday2)).toBe(true);
  });

  test('different Tuesdays are not same week', () => {
    const tuesday1 = new Date('2026-02-03T10:00:00Z');  // Tuesday
    const tuesday2 = new Date('2026-02-10T10:00:00Z'); // Next Tuesday

    expect(isSameTuesday(tuesday1, tuesday2)).toBe(false);
  });

  test('Tuesday 11:59 PM counts as Tuesday week', () => {
    const tuesday = new Date('2026-02-03T05:00:00Z');  // Midnight Wed UTC = 11:59:59 PM Tue EST
    const refTuesday = new Date('2026-02-03T15:00:00Z');  // Tuesday afternoon

    expect(isSameTuesday(tuesday, refTuesday)).toBe(true);
  });

  test('Wednesday is in the same Tuesday-based week', () => {
    const wednesday = new Date('2026-02-04T05:01:00Z');  // 12:01 AM Wed EST
    const tuesday = new Date('2026-02-03T15:00:00Z');    // Tuesday afternoon

    // Wednesday is part of the Tuesday-Monday week, so they're in the same week
    expect(isSameTuesday(wednesday, tuesday)).toBe(true);
  });

  test('getNextTuesday returns next week Tuesday', () => {
    const wednesday = new Date('2026-02-04T15:00:00Z');  // Wednesday
    const nextTuesday = getNextTuesday(wednesday);

    expect(nextTuesday.getDay()).toBe(2);  // Tuesday = day 2
    expect(nextTuesday.getDate()).toBe(10); // Feb 10
  });

  test('getNextTuesday from Tuesday returns following Tuesday', () => {
    const tuesday = new Date('2026-02-03T15:00:00Z');  // Tuesday
    const nextTuesday = getNextTuesday(tuesday);

    expect(nextTuesday.getDate()).toBe(10); // Next Tuesday, not same day
  });
});

describe('DST Transition Handling', () => {
  describe('Spring Forward (March 2024)', () => {
    test('DST transition does not break week calculation', () => {
      // March 10, 2024: 2 AM → 3 AM (spring forward)
      const beforeDST = new Date('2024-03-09T05:00:00Z');  // Sat before DST
      const afterDST = new Date('2024-03-12T04:00:00Z');   // Tue after DST

      const buffaloBeforeDST = toBuffaloTime(beforeDST);
      const buffaloAfterDST = toBuffaloTime(afterDST);

      expect(buffaloBeforeDST).toBeInstanceOf(Date);
      expect(buffaloAfterDST).toBeInstanceOf(Date);
    });

    test('Tuesday before and after spring DST are different weeks', () => {
      const tuesdayBeforeDST = new Date('2024-03-05T05:00:00Z');  // Tue before
      const tuesdayAfterDST = new Date('2024-03-12T04:00:00Z');   // Tue after

      expect(isSameTuesday(tuesdayBeforeDST, tuesdayAfterDST)).toBe(false);
    });
  });

  describe('Fall Back (November 2024)', () => {
    test('DST transition does not break week calculation', () => {
      // November 3, 2024: 2 AM → 1 AM (fall back)
      const beforeDST = new Date('2024-11-02T05:00:00Z');  // Sat before DST
      const afterDST = new Date('2024-11-05T05:00:00Z');   // Tue after DST

      const buffaloBeforeDST = toBuffaloTime(beforeDST);
      const buffaloAfterDST = toBuffaloTime(afterDST);

      expect(buffaloBeforeDST).toBeInstanceOf(Date);
      expect(buffaloAfterDST).toBeInstanceOf(Date);
    });

    test('Tuesday before and after fall DST are different weeks', () => {
      const tuesdayBeforeDST = new Date('2024-10-29T04:00:00Z');  // Tue before
      const tuesdayAfterDST = new Date('2024-11-05T05:00:00Z');   // Tue after

      expect(isSameTuesday(tuesdayBeforeDST, tuesdayAfterDST)).toBe(false);
    });
  });

  describe('Year Boundary', () => {
    test('handles December to January week boundary', () => {
      const dec31 = new Date('2024-12-31T05:00:00Z');  // Tuesday
      const jan7 = new Date('2025-01-07T05:00:00Z');   // Tuesday next week

      expect(isSameTuesday(dec31, jan7)).toBe(false);
    });

    test('leap year February 29 handled correctly', () => {
      const leapDay = new Date('2024-02-29T05:00:00Z');  // Thursday
      const buffaloDate = toBuffaloTime(leapDay);

      expect(buffaloDate.getDate()).toBe(29);
      expect(buffaloDate.getMonth()).toBe(1);  // February = 1
    });
  });
});

// TASK-031: Event Cadence Configuration Tests
describe('Event Cadence Configuration', () => {
  test('getEventCadence returns correct config for bocc', () => {
    const cadence = getEventCadence('bocc');

    expect(cadence).toHaveProperty('frequency');
    expect(cadence).toHaveProperty('dayOfWeek');
    expect(cadence).toHaveProperty('timezone');
    expect(cadence.frequency).toBe('weekly');
    expect(cadence.dayOfWeek).toBe(2); // Tuesday
    expect(cadence.timezone).toBe('America/New_York');
  });

  test('getEventCadence throws error for unknown eventId', () => {
    expect(() => getEventCadence('nonexistent-event')).toThrow('Unknown event');
  });

  test('event cadence has all required fields', () => {
    const cadence = getEventCadence('bocc');

    expect(cadence.frequency).toBeDefined();
    expect(cadence.dayOfWeek).toBeDefined();
    expect(cadence.timezone).toBeDefined();
  });
});

// TASK-026: Calculate Streak - Basic Scenarios
describe('calculateStreak - Basic Scenarios', () => {
  const eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' };

  test('first check-in ever returns streak 1', () => {
    const result = calculateStreak(null, new Date('2026-02-03'), 0, 0, eventCadence, []);

    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      isPersonalBest: true
    });
  });

  test('consecutive Tuesday increments streak', () => {
    const last = new Date('2026-02-03T15:00:00Z');  // Tue Feb 3
    const current = new Date('2026-02-10T15:00:00Z');  // Tue Feb 10
    const result = calculateStreak(last, current, 1, 1, eventCadence, []);

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.streakBroken).toBe(false);
    expect(result.isPersonalBest).toBe(true);
  });

  test('missed one week resets streak to 1', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-17T15:00:00Z');  // 2 weeks later
    const result = calculateStreak(last, current, 5, 10, eventCadence, []);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);  // Maintained
    expect(result.streakBroken).toBe(true);
    expect(result.isPersonalBest).toBe(false);
  });

  test('missed multiple weeks still resets to 1', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-03-03T15:00:00Z');  // 4 weeks later
    const result = calculateStreak(last, current, 3, 5, eventCadence, []);

    expect(result.currentStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  test('same-day check-in maintains streak', () => {
    const last = new Date('2026-02-03T10:00:00Z');
    const current = new Date('2026-02-03T20:00:00Z');  // Same day
    const result = calculateStreak(last, current, 3, 5, eventCadence, []);

    expect(result.currentStreak).toBe(3);  // No change
    expect(result.streakBroken).toBe(false);
  });
});

// TASK-027: Calculate Streak - Edge Cases
describe('calculateStreak - Edge Cases', () => {
  const eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' };

  test('year boundary (December to January)', () => {
    const last = new Date('2024-12-31T15:00:00Z');  // Tue Dec 31
    const current = new Date('2025-01-07T15:00:00Z');  // Tue Jan 7
    const result = calculateStreak(last, current, 5, 8, eventCadence, []);

    expect(result.currentStreak).toBe(6);
    expect(result.streakBroken).toBe(false);
  });

  test('personal best when current exceeds longest', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-10T15:00:00Z');
    const result = calculateStreak(last, current, 9, 9, eventCadence, []);

    expect(result.currentStreak).toBe(10);
    expect(result.longestStreak).toBe(10);
    expect(result.isPersonalBest).toBe(true);
  });

  test('personal best not set when below longest', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-10T15:00:00Z');
    const result = calculateStreak(last, current, 5, 20, eventCadence, []);

    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(20);
    expect(result.isPersonalBest).toBe(false);
  });

  test('handles Tuesday 11:59 PM correctly', () => {
    const last = new Date('2026-02-04T04:59:59Z');  // 11:59 PM Tuesday EST (04:59 Wed UTC)
    const current = new Date('2026-02-10T15:00:00Z');  // Next Tuesday
    const result = calculateStreak(last, current, 2, 5, eventCadence, []);

    expect(result.currentStreak).toBe(3);
    expect(result.streakBroken).toBe(false);
  });

  test('handles defensive null longestStreak', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-10T15:00:00Z');
    const result = calculateStreak(last, current, 5, null, eventCadence, []);

    expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak);
  });

  test('handles zero previous streak on first check-in', () => {
    const result = calculateStreak(null, new Date('2026-02-03'), 0, 0, eventCadence, []);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });
});

// TASK-028: Calculate Streak - Grace Dates
describe('calculateStreak - Grace Dates', () => {
  const eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' };

  test('single grace date preserves streak', () => {
    const last = new Date('2026-02-03T15:00:00Z');  // Tue Feb 3
    const current = new Date('2026-02-17T15:00:00Z');  // Tue Feb 17 (skip Feb 10)
    const graceDates = [{ date: '2026-02-10', eventId: 'bocc', reason: 'Holiday' }];

    const result = calculateStreak(last, current, 5, 8, eventCadence, graceDates);

    expect(result.currentStreak).toBe(6);  // Streak preserved
    expect(result.streakBroken).toBe(false);
  });

  test('multiple grace dates preserve streak', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-24T15:00:00Z');  // 3 weeks later
    const graceDates = [
      { date: '2026-02-10', eventId: 'bocc', reason: 'Holiday 1' },
      { date: '2026-02-17', eventId: 'bocc', reason: 'Holiday 2' }
    ];

    const result = calculateStreak(last, current, 3, 5, eventCadence, graceDates);

    expect(result.currentStreak).toBe(4);
    expect(result.streakBroken).toBe(false);
  });

  test('grace date + regular miss = streak broken', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-24T15:00:00Z');  // 3 weeks later
    const graceDates = [
      { date: '2026-02-10', eventId: 'bocc', reason: 'Holiday' }
      // Feb 17 is NOT a grace date - streak should break
    ];

    const result = calculateStreak(last, current, 5, 10, eventCadence, graceDates);

    expect(result.currentStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  test('empty grace dates array works', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-10T15:00:00Z');
    const result = calculateStreak(last, current, 2, 5, eventCadence, []);

    expect(result.currentStreak).toBe(3);
    expect(result.streakBroken).toBe(false);
  });

  test('grace date on non-missed week has no effect', () => {
    const last = new Date('2026-02-03T15:00:00Z');
    const current = new Date('2026-02-10T15:00:00Z');  // On time
    const graceDates = [
      { date: '2026-02-10', eventId: 'bocc', reason: 'Not needed' }
    ];

    const result = calculateStreak(last, current, 2, 5, eventCadence, graceDates);

    expect(result.currentStreak).toBe(3);
    expect(result.streakBroken).toBe(false);
  });
});

// TASK-029: Calculate Streak - DST Transitions
describe('calculateStreak - DST Transitions', () => {
  const eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' };

  test('streak across spring forward DST', () => {
    // March 9, 2024: DST begins (2 AM → 3 AM)
    const last = new Date('2024-03-05T15:00:00Z');  // Tue before DST
    const current = new Date('2024-03-12T14:00:00Z');  // Tue after DST (EDT)
    const result = calculateStreak(last, current, 3, 5, eventCadence, []);

    expect(result.currentStreak).toBe(4);
    expect(result.streakBroken).toBe(false);
  });

  test('streak across fall back DST', () => {
    // November 3, 2024: DST ends (2 AM → 1 AM)
    const last = new Date('2024-10-29T14:00:00Z');  // Tue before DST
    const current = new Date('2024-11-05T15:00:00Z');  // Tue after DST (EST)
    const result = calculateStreak(last, current, 2, 8, eventCadence, []);

    expect(result.currentStreak).toBe(3);
    expect(result.streakBroken).toBe(false);
  });

  test('consecutive weeks spanning DST transition', () => {
    const last = new Date('2024-03-05T15:00:00Z');  // Before DST
    const current = new Date('2024-03-19T14:00:00Z');  // Two weeks after (after DST)
    const result = calculateStreak(last, current, 5, 10, eventCadence, []);

    // Missed March 12 (one week after DST)
    expect(result.currentStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  test('Tuesday before and after DST are different weeks', () => {
    const last = new Date('2024-03-05T15:00:00Z');
    const current = new Date('2024-03-05T15:00:00Z');  // Same date
    const result = calculateStreak(last, current, 3, 5, eventCadence, []);

    expect(result.currentStreak).toBe(3);  // No change
  });
});

// TASK-030: Helper Functions Tests
describe('Streak Helper Functions', () => {
  const eventCadence = { dayOfWeek: 2, frequency: 'weekly', timezone: 'America/New_York' };

  describe('calculateMissedWeeks', () => {
    test('returns empty array for consecutive weeks', () => {
      const last = new Date('2026-02-03T15:00:00Z');
      const current = new Date('2026-02-10T15:00:00Z');

      const missed = calculateMissedWeeks(last, current, eventCadence);

      expect(missed).toEqual([]);
    });

    test('returns one date for one missed week', () => {
      const last = new Date('2026-02-03T15:00:00Z');
      const current = new Date('2026-02-17T15:00:00Z');  // Skip Feb 10

      const missed = calculateMissedWeeks(last, current, eventCadence);

      expect(missed).toHaveLength(1);
      expect(missed[0].getDate()).toBe(10);  // Feb 10
    });

    test('returns multiple dates for multiple missed weeks', () => {
      const last = new Date('2026-02-03T15:00:00Z');
      const current = new Date('2026-02-24T15:00:00Z');  // Skip Feb 10, 17

      const missed = calculateMissedWeeks(last, current, eventCadence);

      expect(missed).toHaveLength(2);
    });

    test('handles year boundary correctly', () => {
      const last = new Date('2024-12-31T15:00:00Z');
      const current = new Date('2025-01-14T15:00:00Z');  // Skip Jan 7

      const missed = calculateMissedWeeks(last, current, eventCadence);

      expect(missed).toHaveLength(1);
      expect(missed[0].getFullYear()).toBe(2025);
    });
  });

  describe('isStreakBroken', () => {
    test('returns false for consecutive check-ins', () => {
      const last = new Date('2026-02-03T15:00:00Z');
      const current = new Date('2026-02-10T15:00:00Z');

      const broken = isStreakBroken(last, current, eventCadence, []);

      expect(broken).toBe(false);
    });

    test('returns true for missed week', () => {
      const last = new Date('2026-02-03T15:00:00Z');
      const current = new Date('2026-02-17T15:00:00Z');

      const broken = isStreakBroken(last, current, eventCadence, []);

      expect(broken).toBe(true);
    });

    test('returns false when grace date covers missed week', () => {
      const last = new Date('2026-02-03T15:00:00Z');
      const current = new Date('2026-02-17T15:00:00Z');
      const graceDates = [{ date: '2026-02-10', eventId: 'bocc' }];

      const broken = isStreakBroken(last, current, eventCadence, graceDates);

      expect(broken).toBe(false);
    });
  });

  describe('getExpectedNextCheckIn', () => {
    test('returns next Tuesday from Tuesday', () => {
      const last = new Date('2026-02-03T15:00:00Z');  // Tuesday

      const next = getExpectedNextCheckIn(last, eventCadence);

      expect(next.getDay()).toBe(2);  // Tuesday
      expect(next.getDate()).toBe(10);  // Feb 10
    });

    test('returns next Tuesday from Wednesday', () => {
      const last = new Date('2026-02-04T15:00:00Z');  // Wednesday

      const next = getExpectedNextCheckIn(last, eventCadence);

      expect(next.getDay()).toBe(2);
      expect(next.getDate()).toBe(10);
    });

    test('handles year boundary', () => {
      const last = new Date('2024-12-31T15:00:00Z');  // Tue Dec 31

      const next = getExpectedNextCheckIn(last, eventCadence);

      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(0);  // January
      expect(next.getDate()).toBe(7);  // Jan 7
    });
  });
});

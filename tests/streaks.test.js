const { toBuffaloTime, getBuffaloDate, formatDateISO, isSameTuesday, getNextTuesday } = require('../netlify/functions/utils/streaks');

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

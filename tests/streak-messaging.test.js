/**
 * Tests for Streak Message Formatting
 * Epic 1: Visit Count and Streak Tracking System
 * Story 6: Enhanced Check-in Response Messaging
 */

// Mock Airtable SDK before any module loading
const mockSelect = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockFirstPage = jest.fn();

const mockTableInstance = {
    select: mockSelect,
    create: mockCreate,
    update: mockUpdate
};

const mockBase = jest.fn((tableName) => mockTableInstance);

const mockAirtable = {
    configure: jest.fn(),
    base: jest.fn(() => mockBase)
};

jest.mock('airtable', () => mockAirtable);

// Mock axios for Circle.so
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn()
    }))
}));

// Now safe to require the module
const { formatStreakMessage } = require('../netlify/functions/checkin');

describe('Streak Message Formatting', () => {
    describe('formatStreakMessage', () => {
        test('first check-in message', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                isPersonalBest: true,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, true);

            expect(message).toBe('Welcome! Your streak begins today');
        });

        test('personal best message (new record)', () => {
            const streakData = {
                currentStreak: 10,
                longestStreak: 10,
                isPersonalBest: true,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('New record! 10-week streak!');
        });

        test('personal best message with singular week', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                isPersonalBest: true,
                streakBroken: false
            };

            // First check-in takes precedence, so test non-first check-in scenario
            const streakDataNonFirst = {
                currentStreak: 2,
                longestStreak: 2,
                isPersonalBest: true,
                streakBroken: false
            };

            const message = formatStreakMessage(streakDataNonFirst, false);

            expect(message).toBe('New record! 2-week streak!');
        });

        test('broken streak message (positive framing)', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 5,
                isPersonalBest: false,
                streakBroken: true
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('Welcome back! New streak started');
        });

        test('continued streak message (week 1)', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 3,
                isPersonalBest: false,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('1-week streak!');
        });

        test('continued streak message (week 2)', () => {
            const streakData = {
                currentStreak: 2,
                longestStreak: 5,
                isPersonalBest: false,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('2-week streak!');
        });

        test('continued streak message (week 5)', () => {
            const streakData = {
                currentStreak: 5,
                longestStreak: 8,
                isPersonalBest: false,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('5-week streak!');
        });

        test('continued streak message (week 10)', () => {
            const streakData = {
                currentStreak: 10,
                longestStreak: 15,
                isPersonalBest: false,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('10-week streak!');
        });

        test('grammar: singular week (1-week)', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 10,
                isPersonalBest: false,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toContain('1-week');
            expect(message).not.toContain('1-weeks');
        });

        test('grammar: plural weeks (2+ weeks)', () => {
            const streakData = {
                currentStreak: 2,
                longestStreak: 10,
                isPersonalBest: false,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toContain('2-week');
            expect(message).not.toContain('2-weeks');
        });

        test('message priority: first check-in takes precedence over personal best', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                isPersonalBest: true,
                streakBroken: false
            };

            // Even though it's a personal best, first check-in message should show
            const message = formatStreakMessage(streakData, true);

            expect(message).toBe('Welcome! Your streak begins today');
            expect(message).not.toContain('New record');
        });

        test('message priority: personal best takes precedence over continued streak', () => {
            const streakData = {
                currentStreak: 10,
                longestStreak: 10,
                isPersonalBest: true,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toContain('New record');
            expect(message).not.toBe('10-week streak!');
        });

        test('message priority: broken streak takes precedence over continued streak', () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 5,
                isPersonalBest: false,
                streakBroken: true
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('Welcome back! New streak started');
            expect(message).not.toBe('1-week streak!');
        });

        test('tone: all messages are positive and encouraging', () => {
            const testCases = [
                { streakData: { currentStreak: 1, longestStreak: 1, isPersonalBest: true, streakBroken: false }, isFirst: true },
                { streakData: { currentStreak: 5, longestStreak: 5, isPersonalBest: true, streakBroken: false }, isFirst: false },
                { streakData: { currentStreak: 1, longestStreak: 10, isPersonalBest: false, streakBroken: true }, isFirst: false },
                { streakData: { currentStreak: 3, longestStreak: 5, isPersonalBest: false, streakBroken: false }, isFirst: false }
            ];

            // Negative words should never appear
            const negativeWords = ['broken', 'failed', 'lost', 'missed', 'unfortunately', 'sad'];

            testCases.forEach(({ streakData, isFirst }) => {
                const message = formatStreakMessage(streakData, isFirst);

                negativeWords.forEach(word => {
                    expect(message.toLowerCase()).not.toContain(word);
                });

                // All messages should have positive indicators (exclamation or welcoming words)
                const hasPositiveTone =
                    message.includes('!') ||
                    message.includes('Welcome') ||
                    message.includes('New record');

                expect(hasPositiveTone).toBe(true);
            });
        });

        test('edge case: zero streak (should still format)', () => {
            const streakData = {
                currentStreak: 0,
                longestStreak: 5,
                isPersonalBest: false,
                streakBroken: true
            };

            const message = formatStreakMessage(streakData, false);

            // Should return broken streak message (positive framing)
            expect(message).toBe('Welcome back! New streak started');
        });

        test('edge case: very large streak number', () => {
            const streakData = {
                currentStreak: 52,
                longestStreak: 52,
                isPersonalBest: true,
                streakBroken: false
            };

            const message = formatStreakMessage(streakData, false);

            expect(message).toBe('New record! 52-week streak!');
        });

        test('streak and personal best messages end with exclamation mark for enthusiasm', () => {
            // Only test messages that should end with exclamation (not first check-in or broken streak)
            const testCases = [
                { streakData: { currentStreak: 5, longestStreak: 5, isPersonalBest: true, streakBroken: false }, isFirst: false },
                { streakData: { currentStreak: 3, longestStreak: 5, isPersonalBest: false, streakBroken: false }, isFirst: false },
                { streakData: { currentStreak: 10, longestStreak: 15, isPersonalBest: false, streakBroken: false }, isFirst: false }
            ];

            testCases.forEach(({ streakData, isFirst }) => {
                const message = formatStreakMessage(streakData, isFirst);
                expect(message).toMatch(/!$/); // Ends with exclamation mark
            });
        });

        test('all messages contain at least one exclamation mark for positive tone', () => {
            const testCases = [
                { streakData: { currentStreak: 1, longestStreak: 1, isPersonalBest: true, streakBroken: false }, isFirst: true },
                { streakData: { currentStreak: 5, longestStreak: 5, isPersonalBest: true, streakBroken: false }, isFirst: false },
                { streakData: { currentStreak: 1, longestStreak: 10, isPersonalBest: false, streakBroken: true }, isFirst: false },
                { streakData: { currentStreak: 3, longestStreak: 5, isPersonalBest: false, streakBroken: false }, isFirst: false }
            ];

            testCases.forEach(({ streakData, isFirst }) => {
                const message = formatStreakMessage(streakData, isFirst);
                expect(message).toContain('!'); // Contains at least one exclamation mark
            });
        });
    });
});

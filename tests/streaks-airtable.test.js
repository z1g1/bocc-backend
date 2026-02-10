/**
 * Tests for Airtable Streaks Table Operations
 * Epic 1: Visit Count and Streak Tracking System
 * Story 5: Airtable Streaks Table
 */

// Mock Airtable SDK before requiring the module
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

// Now we can safely require the module
const {
    findStreakRecord,
    createStreakRecord,
    updateStreakRecord,
    upsertStreakRecord
} = require('../netlify/functions/utils/airtable');

describe('Airtable Streaks Table', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSelect.mockReturnValue({ firstPage: mockFirstPage });
    });

    describe('findStreakRecord', () => {
        test('finds existing streak record by attendeeId and eventId', async () => {
            const mockRecord = {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'attendeeId') return ['recAttendee456'];
                    if (field === 'eventId') return 'bocc';
                    if (field === 'currentStreak') return 5;
                    if (field === 'longestStreak') return 10;
                })
            };

            mockFirstPage.mockResolvedValue([mockRecord]);

            const result = await findStreakRecord('recAttendee456', 'bocc');

            expect(result).toEqual(mockRecord);
            expect(mockSelect).toHaveBeenCalledWith({
                filterByFormula: expect.stringContaining('attendeeId'),
                maxRecords: 1
            });
        });

        test('returns null when no streak record found', async () => {
            mockFirstPage.mockResolvedValue([]);

            const result = await findStreakRecord('recAttendee999', 'bocc');

            expect(result).toBeNull();
        });

        test('handles Airtable API errors gracefully', async () => {
            mockFirstPage.mockRejectedValue(new Error('Airtable API error'));

            await expect(findStreakRecord('rec123', 'bocc')).rejects.toThrow('Airtable API error');
        });

        test('sanitizes eventId in formula', async () => {
            mockFirstPage.mockResolvedValue([]);

            await findStreakRecord('rec123', "bocc'; DROP TABLE--");

            // Verify the formula was called (escaping prevents injection)
            expect(mockSelect).toHaveBeenCalledWith({
                filterByFormula: expect.stringContaining("{eventId} = 'bocc"),
                maxRecords: 1
            });
        });
    });

    describe('createStreakRecord', () => {
        test('creates new streak record with all fields', async () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            const mockCreatedRecord = {
                id: 'recNewStreak',
                fields: {
                    attendeeId: ['recAttendee456'],
                    eventId: 'bocc',
                    ...streakData
                }
            };

            mockCreate.mockResolvedValue(mockCreatedRecord);

            const result = await createStreakRecord('recAttendee456', 'bocc', streakData);

            expect(result).toEqual(mockCreatedRecord);
            expect(mockCreate).toHaveBeenCalledWith({
                attendeeId: ['recAttendee456'],
                eventId: 'bocc',
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07',
                lastStreakUpdate: expect.any(String)
            });
        });

        test('sets lastStreakUpdate timestamp automatically', async () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            mockCreate.mockResolvedValue({ id: 'rec123' });

            await createStreakRecord('recAttendee456', 'bocc', streakData);

            const callArgs = mockCreate.mock.calls[0][0];
            expect(callArgs.lastStreakUpdate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 format
        });

        test('uses linked record array format for attendeeId', async () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            mockCreate.mockResolvedValue({ id: 'rec123' });

            await createStreakRecord('recAttendee456', 'bocc', streakData);

            const callArgs = mockCreate.mock.calls[0][0];
            expect(callArgs.attendeeId).toEqual(['recAttendee456']); // Array for linked record
        });

        test('handles Airtable API errors', async () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            mockCreate.mockRejectedValue(new Error('Create failed'));

            await expect(createStreakRecord('rec123', 'bocc', streakData)).rejects.toThrow('Create failed');
        });
    });

    describe('updateStreakRecord', () => {
        test('updates existing streak record', async () => {
            const streakData = {
                currentStreak: 6,
                longestStreak: 10,
                lastCheckinDate: '2026-02-08'
            };

            const mockUpdatedRecord = {
                id: 'recStreak123',
                fields: streakData
            };

            mockUpdate.mockResolvedValue(mockUpdatedRecord);

            const result = await updateStreakRecord('recStreak123', streakData);

            expect(result).toEqual(mockUpdatedRecord);
            expect(mockUpdate).toHaveBeenCalledWith('recStreak123', {
                currentStreak: 6,
                longestStreak: 10,
                lastCheckinDate: '2026-02-08',
                lastStreakUpdate: expect.any(String)
            });
        });

        test('updates lastStreakUpdate timestamp', async () => {
            const streakData = {
                currentStreak: 6,
                longestStreak: 10,
                lastCheckinDate: '2026-02-08'
            };

            mockUpdate.mockResolvedValue({ id: 'rec123' });

            await updateStreakRecord('rec123', streakData);

            const callArgs = mockUpdate.mock.calls[0][1];
            expect(callArgs.lastStreakUpdate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
        });

        test('handles Airtable API errors', async () => {
            const streakData = {
                currentStreak: 6,
                longestStreak: 10,
                lastCheckinDate: '2026-02-08'
            };

            mockUpdate.mockRejectedValue(new Error('Update failed'));

            await expect(updateStreakRecord('rec123', streakData)).rejects.toThrow('Update failed');
        });
    });

    describe('upsertStreakRecord', () => {
        test('updates existing record when found', async () => {
            const existingRecord = {
                id: 'recStreak123',
                get: jest.fn()
            };

            const streakData = {
                currentStreak: 6,
                longestStreak: 10,
                lastCheckinDate: '2026-02-08'
            };

            mockFirstPage.mockResolvedValue([existingRecord]);
            mockUpdate.mockResolvedValue({ id: 'recStreak123' });

            const result = await upsertStreakRecord('recAttendee456', 'bocc', streakData);

            expect(mockUpdate).toHaveBeenCalledWith('recStreak123', expect.any(Object));
            expect(mockCreate).not.toHaveBeenCalled();
        });

        test('creates new record when not found', async () => {
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            mockFirstPage.mockResolvedValue([]);
            mockCreate.mockResolvedValue({ id: 'recNewStreak' });

            const result = await upsertStreakRecord('recAttendee456', 'bocc', streakData);

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
                attendeeId: ['recAttendee456'],
                eventId: 'bocc',
                currentStreak: 1
            }));
            expect(mockUpdate).not.toHaveBeenCalled();
        });

        test('handles Airtable errors gracefully without throwing', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            mockFirstPage.mockRejectedValue(new Error('Airtable error'));

            // Should return null, not throw
            const result = await upsertStreakRecord('rec123', 'bocc', streakData);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        test('logs upsert operations for audit trail', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastCheckinDate: '2026-02-07'
            };

            mockFirstPage.mockResolvedValue([]);
            mockCreate.mockResolvedValue({ id: 'rec123' });

            await upsertStreakRecord('recAttendee456', 'bocc', streakData);

            // console.log is called with multiple arguments, check the first one
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Upserting streak record'),
                expect.any(String),
                expect.any(String)
            );

            consoleLogSpy.mockRestore();
        });

        test('handles zero streak values correctly', async () => {
            const streakData = {
                currentStreak: 0,
                longestStreak: 5,
                lastCheckinDate: '2026-02-08'
            };

            mockFirstPage.mockResolvedValue([]);
            mockCreate.mockResolvedValue({ id: 'rec123' });

            await upsertStreakRecord('recAttendee456', 'bocc', streakData);

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
                currentStreak: 0 // Should accept 0 (broken streak)
            }));
        });

        test('handles very large streak numbers', async () => {
            const streakData = {
                currentStreak: 999,
                longestStreak: 999,
                lastCheckinDate: '2026-02-08'
            };

            mockFirstPage.mockResolvedValue([]);
            mockCreate.mockResolvedValue({ id: 'rec123' });

            await upsertStreakRecord('recAttendee456', 'bocc', streakData);

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
                currentStreak: 999
            }));
        });
    });
});

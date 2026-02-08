// Mock Airtable before requiring the module
const mockSelect = jest.fn();
const mockAll = jest.fn();
const mockBase = jest.fn(() => ({
    select: mockSelect
}));

jest.mock('../netlify/functions/utils/airtable', () => ({
    base: mockBase
}));

const { getGraceDates, clearGraceDateCache, isGraceDate } = require('../netlify/functions/utils/graceDates');

describe('Grace Date Query', () => {
    beforeEach(() => {
        clearGraceDateCache();
        jest.clearAllMocks();
        mockSelect.mockReturnValue({ all: mockAll });
    });

    test('queries grace dates for specific eventId', async () => {
        const mockRecords = [
            {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Christmas week';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        const result = await getGraceDates('bocc');

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(1);
        expect(result[0]).toHaveProperty('date');
        expect(result[0].eventId).toBe('bocc');
    });

    test('returns empty array when no grace dates found', async () => {
        mockAll.mockResolvedValue([]);

        const result = await getGraceDates('nonexistent-event');

        expect(result).toEqual([]);
    });

    test('filters by eventId correctly', async () => {
        const mockRecords = [
            {
                id: 'rec1',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Christmas';
                })
            },
            {
                id: 'rec2',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-30';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'New Year';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        const result = await getGraceDates('bocc');

        result.forEach(record => {
            expect(record.eventId).toBe('bocc');
        });
    });

    test('returns dates in ISO 8601 format', async () => {
        const mockRecords = [
            {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Test';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        const result = await getGraceDates('bocc');

        if (result.length > 0) {
            expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    test('handles Airtable API errors gracefully', async () => {
        mockAll.mockRejectedValue(new Error('Airtable API error'));

        const result = await getGraceDates('bocc');

        // Should return empty array, not throw
        expect(result).toEqual([]);
    });

    test('validates eventId parameter', async () => {
        await expect(getGraceDates(null)).rejects.toThrow('Invalid eventId');
        await expect(getGraceDates('')).rejects.toThrow('Invalid eventId');
        await expect(getGraceDates(123)).rejects.toThrow('Invalid eventId');
    });
});

describe('Grace Date Caching', () => {
    beforeEach(() => {
        clearGraceDateCache();
        jest.clearAllMocks();
        mockSelect.mockReturnValue({ all: mockAll });
    });

    test('caches grace dates after first query', async () => {
        const mockRecords = [
            {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Test';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        // First call
        await getGraceDates('bocc');
        const firstCallCount = mockAll.mock.calls.length;

        // Second call (should use cache)
        await getGraceDates('bocc');
        const secondCallCount = mockAll.mock.calls.length;

        // Verify Airtable only called once
        expect(secondCallCount).toBe(firstCallCount);
        expect(firstCallCount).toBe(1);
    });

    test('separate cache per eventId', async () => {
        const mockRecords = [
            {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Test';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        // Query for bocc
        await getGraceDates('bocc');
        expect(mockAll.mock.calls.length).toBe(1);

        // Query for codeCoffee (should query Airtable again)
        await getGraceDates('codeCoffee');
        expect(mockAll.mock.calls.length).toBe(2);
    });

    test('clearGraceDateCache resets cache', async () => {
        const mockRecords = [
            {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Test';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        // First query (populates cache)
        await getGraceDates('bocc');
        expect(mockAll.mock.calls.length).toBe(1);

        // Clear cache
        clearGraceDateCache();

        // Second query (should query Airtable again)
        await getGraceDates('bocc');
        expect(mockAll.mock.calls.length).toBe(2);
    });

    test('cache is module-level (shared across calls)', async () => {
        const mockRecords = [
            {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'date') return '2025-12-23';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'reason') return 'Test';
                })
            }
        ];

        mockAll.mockResolvedValue(mockRecords);

        // Call from one context
        const result1 = await getGraceDates('bocc');

        // Call from another context (same process)
        const result2 = await getGraceDates('bocc');

        // Both should return same data (cached)
        expect(result1).toEqual(result2);
        expect(mockAll.mock.calls.length).toBe(1); // Only called once
    });
});

describe('Grace Date Helpers', () => {
    beforeEach(() => {
        clearGraceDateCache();
        jest.clearAllMocks();
    });

    test('isGraceDate returns true for grace date', () => {
        const graceDates = [
            { date: '2025-12-23', eventId: 'bocc' },
            { date: '2025-12-30', eventId: 'bocc' }
        ];

        const result = isGraceDate('2025-12-23', graceDates);
        expect(result).toBe(true);
    });

    test('isGraceDate returns false for non-grace date', () => {
        const graceDates = [
            { date: '2025-12-23', eventId: 'bocc' }
        ];

        const result = isGraceDate('2025-12-17', graceDates);
        expect(result).toBe(false);
    });

    test('isGraceDate handles empty grace dates array', () => {
        const result = isGraceDate('2025-12-23', []);
        expect(result).toBe(false);
    });

    test('isGraceDate handles Date objects', () => {
        const graceDates = [
            { date: '2026-02-07', eventId: 'bocc' }
        ];

        // Create a Date object for Feb 7, 2026
        const testDate = new Date('2026-02-07T15:00:00Z');
        const result = isGraceDate(testDate, graceDates);
        expect(result).toBe(true);
    });

    test('isGraceDate handles null/undefined gracefully', () => {
        expect(isGraceDate(null, [])).toBe(false);
        expect(isGraceDate(undefined, [])).toBe(false);
        expect(isGraceDate('2025-12-23', null)).toBe(false);
        expect(isGraceDate('2025-12-23', undefined)).toBe(false);
    });
});

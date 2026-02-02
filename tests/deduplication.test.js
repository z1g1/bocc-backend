// Mock Airtable before requiring the module
const mockSelect = jest.fn();
const mockFirstPage = jest.fn();
const mockBase = jest.fn();

jest.mock('airtable', () => {
    return {
        configure: jest.fn(),
        base: jest.fn(() => mockBase)
    };
});

// Set up the mock base to return proper structure
mockBase.mockImplementation((tableName) => ({
    select: mockSelect.mockReturnValue({
        firstPage: mockFirstPage
    })
}));

const { findExistingCheckin } = require('../netlify/functions/utils/airtable');

describe('Check-in Deduplication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockBase.mockImplementation((tableName) => ({
            select: mockSelect.mockReturnValue({
                firstPage: mockFirstPage
            })
        }));
    });

    describe('findExistingCheckin', () => {
        test('returns null when no check-in exists', async () => {
            mockFirstPage.mockResolvedValue([]);

            const result = await findExistingCheckin('test@example.com', 'bocc', 'test-token');

            expect(result).toBeNull();
        });

        test('returns existing check-in when found', async () => {
            const mockCheckin = {
                id: 'rec123',
                get: jest.fn((field) => {
                    if (field === 'email') return 'test@example.com';
                    if (field === 'eventId') return 'bocc';
                    if (field === 'token') return 'test-token';
                    if (field === 'checkinDate') return new Date().toISOString();
                })
            };

            mockFirstPage.mockResolvedValue([mockCheckin]);

            const result = await findExistingCheckin('test@example.com', 'bocc', 'test-token');

            expect(result).toBeTruthy();
            expect(result.id).toBe('rec123');
        });

        test('email comparison is case-insensitive', async () => {
            const mockCheckin = {
                id: 'rec123',
                get: jest.fn()
            };

            mockFirstPage.mockResolvedValue([mockCheckin]);

            await findExistingCheckin('Test@Example.com', 'bocc', 'test-token');

            // Verify the formula includes LOWER() for case-insensitive comparison
            const selectCall = mockSelect.mock.calls[0][0];
            expect(selectCall.filterByFormula).toContain('LOWER({email})');
            expect(selectCall.filterByFormula).toContain('test@example.com');
        });

        test('sanitizes inputs to prevent formula injection', async () => {
            mockFirstPage.mockResolvedValue([]);

            await findExistingCheckin("test'@example.com", 'bocc', 'test-token');

            // Verify the formula escapes single quotes
            const selectCall = mockSelect.mock.calls[0][0];
            expect(selectCall.filterByFormula).toContain("\\'");
        });

        test('filters by same calendar day', async () => {
            mockFirstPage.mockResolvedValue([]);

            await findExistingCheckin('test@example.com', 'bocc', 'test-token');

            // Verify the formula uses DATESTR for date comparison
            const selectCall = mockSelect.mock.calls[0][0];
            expect(selectCall.filterByFormula).toContain('DATESTR({checkinDate})');

            // Should use today's date
            const today = new Date().toISOString().split('T')[0];
            expect(selectCall.filterByFormula).toContain(today);
        });

        test('limits query to 1 record for performance', async () => {
            mockFirstPage.mockResolvedValue([]);

            await findExistingCheckin('test@example.com', 'bocc', 'test-token');

            const selectCall = mockSelect.mock.calls[0][0];
            expect(selectCall.maxRecords).toBe(1);
        });

        test('sorts by checkinDate descending to get most recent', async () => {
            mockFirstPage.mockResolvedValue([]);

            await findExistingCheckin('test@example.com', 'bocc', 'test-token');

            const selectCall = mockSelect.mock.calls[0][0];
            expect(selectCall.sort).toEqual([{ field: 'checkinDate', direction: 'desc' }]);
        });

        test('handles Airtable API errors gracefully', async () => {
            mockFirstPage.mockRejectedValue(new Error('Airtable API error'));

            await expect(
                findExistingCheckin('test@example.com', 'bocc', 'test-token')
            ).rejects.toThrow('Airtable API error');
        });
    });
});

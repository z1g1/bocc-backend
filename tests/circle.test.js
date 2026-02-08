// Mock axios before requiring the module
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
const mockAxiosDelete = jest.fn();
const mockAxiosCreate = jest.fn(() => ({
    get: mockAxiosGet,
    post: mockAxiosPost,
    delete: mockAxiosDelete
}));

jest.mock('axios', () => ({
    create: mockAxiosCreate
}));

const { findMemberByEmail, createMember, ensureMember, deactivateMember, getMemberCustomField, updateMemberCustomField, incrementCheckinCount } = require('../netlify/functions/utils/circle');

describe('Circle.so API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findMemberByEmail', () => {
        test('returns member when found', async () => {
            const mockMember = {
                id: 123,
                email: '[email protected]',
                name: 'Test User'
            };

            mockAxiosGet.mockResolvedValue({
                data: {
                    records: [mockMember]
                }
            });

            const result = await findMemberByEmail('[email protected]');

            expect(result).toEqual(mockMember);
            expect(mockAxiosGet).toHaveBeenCalledWith('/community_members', {
                params: { per_page: 100 }
            });
        });

        test('returns null when member not found', async () => {
            mockAxiosGet.mockResolvedValue({
                data: {
                    records: []
                }
            });

            const result = await findMemberByEmail('[email protected]');

            expect(result).toBeNull();
        });

        test('performs case-insensitive email matching', async () => {
            const mockMember = {
                id: 123,
                email: 'test@example.com',  // lowercase in database
                name: 'Test User'
            };

            mockAxiosGet.mockResolvedValue({
                data: {
                    records: [mockMember]
                }
            });

            const result = await findMemberByEmail('TEST@EXAMPLE.COM');  // uppercase search

            expect(result).toEqual(mockMember);
        });

        test('handles API errors gracefully', async () => {
            mockAxiosGet.mockRejectedValue(new Error('Circle API error'));

            await expect(
                findMemberByEmail('[email protected]')
            ).rejects.toThrow('Circle API error');
        });

    });

    describe('createMember', () => {
        test('creates member successfully', async () => {
            const mockResponse = {
                data: {
                    message: 'Community member created',
                    community_member: {
                        id: 456,
                        email: '[email protected]',
                        name: 'New User'
                    }
                }
            };

            mockAxiosPost.mockResolvedValue(mockResponse);

            const result = await createMember('[email protected]', 'New User');

            expect(result).toEqual(mockResponse.data);
            expect(mockAxiosPost).toHaveBeenCalledWith('/community_members', {
                email: '[email protected]',
                name: 'New User'
            });
        });

        test('handles API errors when creating member', async () => {
            mockAxiosPost.mockRejectedValue(new Error('Failed to create member'));

            await expect(
                createMember('[email protected]', 'New User')
            ).rejects.toThrow('Failed to create member');
        });

        test('logs error response details', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const error = new Error('API Error');
            error.response = {
                status: 400,
                data: { message: 'Invalid email' }
            };

            mockAxiosPost.mockRejectedValue(error);

            await expect(
                createMember('invalid-email', 'Test')
            ).rejects.toThrow('API Error');

            expect(consoleErrorSpy).toHaveBeenCalledWith('Response status:', 400);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Response data:', { message: 'Invalid email' });

            consoleErrorSpy.mockRestore();
        });
    });

    describe('ensureMember', () => {
        test('returns existing member when found', async () => {
            const mockMember = {
                id: 123,
                email: '[email protected]',
                name: 'Existing User'
            };

            mockAxiosGet.mockResolvedValue({
                data: {
                    records: [mockMember]
                }
            });

            const result = await ensureMember('[email protected]', 'Existing User');

            expect(result).toEqual(mockMember);
            expect(mockAxiosPost).not.toHaveBeenCalled();
        });

        test('creates new member when not found', async () => {
            mockAxiosGet.mockResolvedValue({
                data: {
                    records: []
                }
            });

            const mockNewMember = {
                message: 'Community member created',
                community_member: {
                    id: 789,
                    email: '[email protected]',
                    name: 'New User'
                }
            };

            mockAxiosPost.mockResolvedValue({
                data: mockNewMember
            });

            const result = await ensureMember('[email protected]', 'New User');

            expect(result).toEqual(mockNewMember);
            expect(mockAxiosGet).toHaveBeenCalled();
            expect(mockAxiosPost).toHaveBeenCalledWith('/community_members', {
                email: '[email protected]',
                name: 'New User'
            });
        });

        test('handles errors during member lookup', async () => {
            mockAxiosGet.mockRejectedValue(new Error('Network error'));

            await expect(
                ensureMember('[email protected]', 'Test User')
            ).rejects.toThrow('Network error');
        });

        test('handles errors during member creation', async () => {
            mockAxiosGet.mockResolvedValue({
                data: {
                    records: []
                }
            });

            mockAxiosPost.mockRejectedValue(new Error('Creation failed'));

            await expect(
                ensureMember('[email protected]', 'Test User')
            ).rejects.toThrow('Creation failed');
        });
    });

    describe('deactivateMember', () => {
        test('deactivates member successfully', async () => {
            mockAxiosDelete.mockResolvedValue({
                data: {
                    message: 'Member deactivated successfully'
                }
            });

            await deactivateMember('test-member-id');

            expect(mockAxiosDelete).toHaveBeenCalledWith('/community_members/test-member-id');
        });

        test('throws error if memberId is empty', async () => {
            await expect(deactivateMember('')).rejects.toThrow('memberId is required');
            expect(mockAxiosDelete).not.toHaveBeenCalled();
        });

        test('throws error if memberId is null', async () => {
            await expect(deactivateMember(null)).rejects.toThrow('memberId is required');
            expect(mockAxiosDelete).not.toHaveBeenCalled();
        });

        test('handles API errors when deactivating member', async () => {
            mockAxiosDelete.mockRejectedValue(new Error('Member not found'));

            await expect(deactivateMember('nonexistent-id')).rejects.toThrow('Member not found');
        });

        test('logs error response details on failure', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const error = new Error('API Error');
            error.response = {
                status: 404,
                data: { message: 'Member not found' }
            };

            mockAxiosDelete.mockRejectedValue(error);

            await expect(deactivateMember('test-id')).rejects.toThrow('API Error');

            expect(consoleErrorSpy).toHaveBeenCalledWith('Circle API response status:', 404);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Circle API response data:',
                JSON.stringify({ message: 'Member not found' })
            );

            consoleErrorSpy.mockRestore();
        });

        test('handles 403 forbidden error (insufficient permissions)', async () => {
            const error = new Error('Request failed with status code 403');
            error.response = {
                status: 403,
                data: { error: 'Forbidden' }
            };

            mockAxiosDelete.mockRejectedValue(error);

            await expect(deactivateMember('test-id')).rejects.toThrow();
        });
    });

    describe('getMemberCustomField', () => {
        test('fetches custom field value successfully', async () => {
            const mockResponse = {
                data: {
                    id: '12345',
                    custom_fields: {
                        checkinCount: 5
                    }
                }
            };

            mockAxiosGet.mockResolvedValue(mockResponse);

            const result = await getMemberCustomField('12345', 'checkinCount');

            expect(result).toBe(5);
            expect(mockAxiosGet).toHaveBeenCalledWith('/community_members/12345');
        });

        test('returns null when custom field does not exist', async () => {
            const mockResponse = {
                data: {
                    id: '12345',
                    custom_fields: {}
                }
            };

            mockAxiosGet.mockResolvedValue(mockResponse);

            const result = await getMemberCustomField('12345', 'checkinCount');

            expect(result).toBeNull();
        });

        test('returns null when member has no custom_fields object', async () => {
            const mockResponse = {
                data: {
                    id: '12345'
                }
            };

            mockAxiosGet.mockResolvedValue(mockResponse);

            const result = await getMemberCustomField('12345', 'checkinCount');

            expect(result).toBeNull();
        });

        test('throws error when Circle.so API fails', async () => {
            const error = new Error('Circle API error');
            mockAxiosGet.mockRejectedValue(error);

            await expect(getMemberCustomField('12345', 'checkinCount'))
                .rejects.toThrow('Circle API error');
        });
    });

    describe('incrementCheckinCount (bug fix)', () => {
        const mockAxiosPatch = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
            // Mock the patch method for updateMemberCustomField
            mockAxiosPatch.mockClear();
        });

        test('increments from existing value', async () => {
            // Mock getMemberCustomField returning 5
            mockAxiosGet.mockResolvedValue({
                data: {
                    id: 'member123',
                    custom_fields: {
                        checkinCount: 5
                    }
                }
            });

            // Mock updateMemberCustomField (patch call)
            const mockAxiosCreate = require('axios').create;
            const mockInstance = mockAxiosCreate();
            mockInstance.patch = jest.fn().mockResolvedValue({
                data: { success: true }
            });

            await incrementCheckinCount('member123');

            // Verify getMemberCustomField was called
            expect(mockAxiosGet).toHaveBeenCalledWith('/community_members/member123');
        });

        test('starts at 1 when current value is null (new member)', async () => {
            // Mock getMemberCustomField returning null (no custom field)
            mockAxiosGet.mockResolvedValue({
                data: {
                    id: 'member123',
                    custom_fields: {}
                }
            });

            const mockAxiosCreate = require('axios').create;
            const mockInstance = mockAxiosCreate();
            mockInstance.patch = jest.fn().mockResolvedValue({
                data: { success: true }
            });

            await incrementCheckinCount('member123');

            // Verify GET was called to fetch current value
            expect(mockAxiosGet).toHaveBeenCalledWith('/community_members/member123');
        });

        test('starts at 1 when member has no custom_fields', async () => {
            // Mock getMemberCustomField returning no custom_fields object
            mockAxiosGet.mockResolvedValue({
                data: {
                    id: 'member123'
                }
            });

            const mockAxiosCreate = require('axios').create;
            const mockInstance = mockAxiosCreate();
            mockInstance.patch = jest.fn().mockResolvedValue({
                data: { success: true }
            });

            await incrementCheckinCount('member123');

            // Verify GET was called
            expect(mockAxiosGet).toHaveBeenCalled();
        });

        test('logs current and new values for audit trail', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            // Mock getMemberCustomField returning 10
            mockAxiosGet.mockResolvedValue({
                data: {
                    id: 'member123',
                    custom_fields: {
                        checkinCount: 10
                    }
                }
            });

            const mockAxiosCreate = require('axios').create;
            const mockInstance = mockAxiosCreate();
            mockInstance.patch = jest.fn().mockResolvedValue({
                data: { success: true }
            });

            await incrementCheckinCount('member123');

            // Verify console.log called with current and new values
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('10'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('11'));

            consoleLogSpy.mockRestore();
        });

        test('handles API errors gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Mock getMemberCustomField throwing error
            mockAxiosGet.mockRejectedValue(new Error('Circle API error'));

            // Should not throw (graceful degradation)
            await expect(incrementCheckinCount('member123')).resolves.not.toThrow();

            consoleErrorSpy.mockRestore();
        });
    });
});

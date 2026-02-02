// Mock axios before requiring the module
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
const mockAxiosCreate = jest.fn(() => ({
    get: mockAxiosGet,
    post: mockAxiosPost
}));

jest.mock('axios', () => ({
    create: mockAxiosCreate
}));

const { findMemberByEmail, createMember, ensureMember } = require('../netlify/functions/utils/circle');

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
});

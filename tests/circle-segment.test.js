/**
 * Unit tests for Circle.so audience segment querying
 * Tests getSegmentMembers() function for profile photo enforcement
 *
 * TASK-61: Write Tests for getSegmentMembers Function
 * Epic 4: Profile Photo Enforcement System
 */

// Mock axios before requiring the module
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
const mockAxiosPatch = jest.fn();
const mockAxiosDelete = jest.fn();
const mockAxiosCreate = jest.fn(() => ({
  get: mockAxiosGet,
  post: mockAxiosPost,
  patch: mockAxiosPatch,
  delete: mockAxiosDelete
}));

jest.mock('axios', () => ({
  create: mockAxiosCreate
}));

const { getSegmentMembers } = require('../netlify/functions/utils/circle');

describe('getSegmentMembers', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup console.log/error mocks to reduce test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('Successful segment member retrieval', () => {
    it('should fetch segment members successfully with valid segment ID', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          email: 'user1@example.com',
          name: 'User One',
          has_profile_picture: false,
          profile_picture: null
        },
        {
          id: 'member-2',
          email: 'user2@example.com',
          name: 'User Two',
          has_profile_picture: false,
          profile_picture: null
        }
      ];

      mockAxiosGet.mockResolvedValue({
        data: {
          records: mockMembers,
          pagination: {
            total: 2,
            per_page: 100,
            page: 1
          }
        }
      });

      const result = await getSegmentMembers(238273);

      // Verify correct endpoint called
      expect(mockAxiosGet).toHaveBeenCalledWith(
        '/community_segments/238273/members',
        expect.objectContaining({
          params: expect.objectContaining({ per_page: 100 }),
          timeout: 30000
        })
      );

      // Verify returns array of member objects
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      // Verify each member has required fields
      result.forEach(member => {
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('email');
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('has_profile_picture');
      });

      // Verify specific member data
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].name).toBe('User Two');
    });

    it('should handle empty segment (0 members) gracefully', async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          records: [],
          pagination: {
            total: 0,
            per_page: 100,
            page: 1
          }
        }
      });

      const result = await getSegmentMembers(238273);

      // Verify returns empty array without errors
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);

      // Verify API was called
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination handling', () => {
    it('should handle pagination for segments with >100 members', async () => {
      // First page: 100 members
      const page1Members = Array.from({ length: 100 }, (_, i) => ({
        id: `member-${i + 1}`,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        has_profile_picture: false
      }));

      // Second page: 50 members
      const page2Members = Array.from({ length: 50 }, (_, i) => ({
        id: `member-${i + 101}`,
        email: `user${i + 101}@example.com`,
        name: `User ${i + 101}`,
        has_profile_picture: false
      }));

      // Mock paginated responses
      mockAxiosGet
        .mockResolvedValueOnce({
          data: {
            records: page1Members,
            pagination: {
              total: 150,
              per_page: 100,
              page: 1
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            records: page2Members,
            pagination: {
              total: 150,
              per_page: 100,
              page: 2
            }
          }
        });

      const result = await getSegmentMembers(238273);

      // Verify both pages fetched
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);

      // Verify page 1 call
      expect(mockAxiosGet).toHaveBeenNthCalledWith(1,
        '/community_segments/238273/members',
        expect.objectContaining({
          params: expect.objectContaining({ page: 1, per_page: 100 })
        })
      );

      // Verify page 2 call
      expect(mockAxiosGet).toHaveBeenNthCalledWith(2,
        '/community_segments/238273/members',
        expect.objectContaining({
          params: expect.objectContaining({ page: 2, per_page: 100 })
        })
      );

      // Verify all members from both pages accumulated
      expect(result).toHaveLength(150);
      expect(result[0].id).toBe('member-1');
      expect(result[99].id).toBe('member-100');
      expect(result[100].id).toBe('member-101');
      expect(result[149].id).toBe('member-150');
    });

    it('should stop pagination when no more pages available', async () => {
      const mockMembers = Array.from({ length: 50 }, (_, i) => ({
        id: `member-${i + 1}`,
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
        has_profile_picture: false
      }));

      mockAxiosGet.mockResolvedValue({
        data: {
          records: mockMembers,
          pagination: {
            total: 50,
            per_page: 100,
            page: 1
          }
        }
      });

      const result = await getSegmentMembers(238273);

      // Verify only one page fetched (50 < 100, so no second page)
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(50);
    });
  });

  describe('Safety: No fallback to all members', () => {
    it('should throw error if segment endpoint returns 404 (segment not found)', async () => {
      // Segment endpoint returns 404
      mockAxiosGet.mockRejectedValueOnce({
        message: 'Request failed with status code 404',
        response: {
          status: 404,
          data: { error: 'Segment not found' }
        }
      });

      // SAFETY: Should throw error, NOT fall back to processing all members
      await expect(getSegmentMembers(238273)).rejects.toThrow(
        'Segment 238273 not found'
      );

      // Verify only one API call (no fallback attempted)
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });

    it('should throw error on 401 authentication failure', async () => {
      // Mock 401 auth error
      mockAxiosGet.mockRejectedValueOnce({
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      });

      // Verify error thrown with helpful message
      await expect(getSegmentMembers(238273)).rejects.toThrow(
        'Circle API authentication failed'
      );

      // Verify only one API call (no fallback)
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should throw helpful error message for 401 authentication errors', async () => {
      const mockError = {
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          data: {
            error: 'Unauthorized',
            message: 'Invalid API token'
          }
        }
      };

      mockAxiosGet.mockRejectedValue(mockError);

      // Verify error thrown with helpful message
      await expect(getSegmentMembers(238273)).rejects.toThrow(
        'Circle API authentication failed. Check that CIRCLE_API_TOKEN is set correctly.'
      );

      // Verify error logging occurred
      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL ERROR: Failed to fetch segment members:',
        expect.any(String)
      );
      expect(console.error).toHaveBeenCalledWith(
        'Circle API response status:',
        401
      );
    });

    it('should handle network errors without response object', async () => {
      const networkError = {
        message: 'Network error',
        code: 'ECONNREFUSED'
      };

      mockAxiosGet.mockRejectedValue(networkError);

      // Verify error thrown
      await expect(getSegmentMembers(238273)).rejects.toMatchObject({
        message: 'Network error'
      });

      // Verify error logged
      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL ERROR: Failed to fetch segment members:',
        'Network error'
      );
    });

    it('should timeout after 30 seconds', async () => {
      const timeoutError = {
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED'
      };

      mockAxiosGet.mockRejectedValue(timeoutError);

      // Verify error thrown
      await expect(getSegmentMembers(238273)).rejects.toMatchObject({
        message: expect.stringContaining('timeout')
      });

      // Verify timeout configured in request
      expect(mockAxiosGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 30000
        })
      );
    });

    it('should handle rate limit errors (429)', async () => {
      const rateLimitError = {
        message: 'Request failed with status code 429',
        response: {
          status: 429,
          data: {
            error: 'Rate limit exceeded',
            retry_after: 60
          }
        }
      };

      mockAxiosGet.mockRejectedValue(rateLimitError);

      // Verify error thrown with rate limit details
      await expect(getSegmentMembers(238273)).rejects.toMatchObject({
        response: expect.objectContaining({
          status: 429
        })
      });

      // Verify error logged
      expect(console.error).toHaveBeenCalledWith(
        'Circle API response status:',
        429
      );
    });
  });

  describe('Input validation', () => {
    it('should throw error if segmentId is null', async () => {
      await expect(getSegmentMembers(null)).rejects.toThrow('segmentId is required');
    });

    it('should throw error if segmentId is undefined', async () => {
      await expect(getSegmentMembers(undefined)).rejects.toThrow('segmentId is required');
    });

    it('should throw error if segmentId is empty string', async () => {
      await expect(getSegmentMembers('')).rejects.toThrow('segmentId is required');
    });

    it('should accept numeric segmentId', async () => {
      mockAxiosGet.mockResolvedValue({
        data: { records: [], pagination: { total: 0 } }
      });

      await expect(getSegmentMembers(238273)).resolves.toEqual([]);
    });

    it('should accept string segmentId', async () => {
      mockAxiosGet.mockResolvedValue({
        data: { records: [], pagination: { total: 0 } }
      });

      await expect(getSegmentMembers('238273')).resolves.toEqual([]);
    });
  });
});

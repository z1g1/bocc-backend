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

// =============================================================================
// NEW TESTS FOR getMembersWithoutPhotos() - Epic 5
// These tests will initially FAIL (Red phase of TDD)
// See: docs/NEW_TEST_SCENARIOS_EPIC_5.md
// =============================================================================

// Import the new function (will fail until implemented in TASK-96)
const { getMembersWithoutPhotos } = require('../netlify/functions/utils/circle');

describe('getMembersWithoutPhotos (Epic 5 - Client-Side Filtering)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  // TEST SCENARIO 1: Client-Side Filtering by avatar_url (Null)
  // See: docs/NEW_TEST_SCENARIOS_EPIC_5.md - Test Scenario 1
  describe('Client-side filtering logic', () => {
    it('should filter members with null avatar_url as having no photo', async () => {
      const membersWithMixedPhotos = [
        {
          id: 'member-1',
          email: 'hasphoto@example.com',
          name: 'Has Photo User',
          avatar_url: 'https://app.circle.so/rails/active_storage/photo.jpg'
        },
        {
          id: 'member-2',
          email: 'nophoto@example.com',
          name: 'No Photo User',
          avatar_url: null  // <-- NULL means no photo
        },
        {
          id: 'member-3',
          email: 'alsohphoto@example.com',
          name: 'Also Has Photo',
          avatar_url: 'https://example.com/another-photo.png'
        }
      ];

      mockAxiosGet.mockResolvedValue({
        data: {
          records: membersWithMixedPhotos,
          has_next_page: false
        }
      });

      const result = await getMembersWithoutPhotos();

      // Should return only the member with null avatar_url
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('nophoto@example.com');
      expect(result[0].avatar_url).toBeNull();

      // Should NOT include members with avatar URLs
      expect(result.find(m => m.email === 'hasphoto@example.com')).toBeUndefined();
      expect(result.find(m => m.email === 'alsohphoto@example.com')).toBeUndefined();
    });

    // TEST SCENARIO 2: Client-Side Filtering by avatar_url (Empty String)
    // See: docs/NEW_TEST_SCENARIOS_EPIC_5.md - Test Scenario 2
    it('should filter members with empty string avatar_url as having no photo', async () => {
      const membersWithEmptyStrings = [
        {
          id: 'member-1',
          email: 'emptystring@example.com',
          name: 'Empty String User',
          avatar_url: ''  // <-- EMPTY STRING means no photo
        },
        {
          id: 'member-2',
          email: 'hasphoto@example.com',
          name: 'Has Photo User',
          avatar_url: 'https://example.com/photo.jpg'
        },
        {
          id: 'member-3',
          email: 'nullphoto@example.com',
          name: 'Null Photo User',
          avatar_url: null
        }
      ];

      mockAxiosGet.mockResolvedValue({
        data: {
          records: membersWithEmptyStrings,
          has_next_page: false
        }
      });

      const result = await getMembersWithoutPhotos();

      // Should return members with null OR empty string
      expect(result).toHaveLength(2);

      // Both null and empty string should be included
      expect(result.find(m => m.email === 'emptystring@example.com')).toBeDefined();
      expect(result.find(m => m.email === 'nullphoto@example.com')).toBeDefined();

      // Members with actual URLs should be excluded
      expect(result.find(m => m.email === 'hasphoto@example.com')).toBeUndefined();
    });
  });

  // TEST SCENARIO 3: Safety Limit - Warning Threshold (500 Members)
  // See: docs/SAFETY_LIMITS_SPECIFICATION.md
  describe('Safety limits enforcement', () => {
    it('should log warning when fetching exactly 500 members but continue processing', async () => {
      // Generate 500 members: 250 with photos, 250 without
      const members500 = [
        ...Array(250).fill(null).map((_, i) => ({
          id: `with-photo-${i}`,
          email: `hasphoto${i}@example.com`,
          name: `User With Photo ${i}`,
          avatar_url: `https://example.com/photo-${i}.jpg`
        })),
        ...Array(250).fill(null).map((_, i) => ({
          id: `no-photo-${i}`,
          email: `nophoto${i}@example.com`,
          name: `User Without Photo ${i}`,
          avatar_url: null
        }))
      ];

      mockAxiosGet.mockResolvedValue({
        data: {
          records: members500,
          has_next_page: false
        }
      });

      const result = await getMembersWithoutPhotos();

      // Warning should be logged
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Processing 500 members')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Approaching safety limit')
      );

      // Processing should continue normally
      expect(result).toBeDefined();
      expect(result).toHaveLength(250);  // 250 members without photos

      // All 250 members without photos should be returned
      expect(result.every(m => m.avatar_url === null)).toBe(true);
    });

    // TEST SCENARIO 4: Safety Limit - Hard Cap (1000 Members)
    // See: docs/SAFETY_LIMITS_SPECIFICATION.md
    it('should throw error when fetching exactly 1000 members (hard limit)', async () => {
      // Generate 1000 members
      const members1000 = Array(1000).fill(null).map((_, i) => ({
        id: `member-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        avatar_url: i % 2 === 0 ? null : `https://example.com/photo-${i}.jpg`
      }));

      mockAxiosGet.mockResolvedValue({
        data: {
          records: members1000,
          has_next_page: false
        }
      });

      // Should throw error before filtering
      await expect(getMembersWithoutPhotos()).rejects.toThrow('Safety limit exceeded');
      await expect(getMembersWithoutPhotos()).rejects.toThrow('Found 1000 members');
      await expect(getMembersWithoutPhotos()).rejects.toThrow('maximum allowed is 1000');

      // Error should include instructions for fixing
      await expect(getMembersWithoutPhotos()).rejects.toThrow('Update HARD_LIMIT_MAX_MEMBERS');
    });

    // TEST SCENARIO 5: Safety Limit - Above Hard Cap (1001+ Members)
    // See: docs/SAFETY_LIMITS_SPECIFICATION.md
    it('should throw error when fetching more than 1000 members (5000 member test)', async () => {
      // Generate 5000 members (extreme case)
      const members5000 = Array(5000).fill(null).map((_, i) => ({
        id: `member-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        avatar_url: null  // All without photos for worst case
      }));

      mockAxiosGet.mockResolvedValue({
        data: {
          records: members5000,
          has_next_page: false
        }
      });

      // Error message should show actual count
      await expect(getMembersWithoutPhotos()).rejects.toThrow('Found 5000 members');

      // Console error should be logged (called with emoji prefix + error message)
      await getMembersWithoutPhotos().catch(() => {});  // Suppress error for assertion
      expect(console.error).toHaveBeenCalledWith(
        '🚨 SAFETY LIMIT EXCEEDED:',
        expect.stringContaining('Safety limit exceeded')
      );

      // Error should still reference the 1000 limit
      await expect(getMembersWithoutPhotos()).rejects.toThrow('maximum allowed is 1000');
    });
  });
});

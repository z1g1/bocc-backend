/**
 * Unit tests for runEnforcement filterEmail parameter
 * Ensures the manual endpoint only processes the specified email
 */

// Mock all dependencies before requiring the module
jest.mock('../netlify/functions/utils/circle', () => ({
  getMembersWithoutPhotos: jest.fn()
}));

jest.mock('../netlify/functions/utils/airtable-warnings', () => ({
  findWarningByEmail: jest.fn()
}));

jest.mock('../netlify/functions/utils/enforcement-logic', () => ({
  determineEnforcementAction: jest.fn(),
  processEnforcementAction: jest.fn()
}));

const { getMembersWithoutPhotos } = require('../netlify/functions/utils/circle');
const { findWarningByEmail } = require('../netlify/functions/utils/airtable-warnings');
const { determineEnforcementAction, processEnforcementAction } = require('../netlify/functions/utils/enforcement-logic');
const { runEnforcement } = require('../netlify/functions/profile-photo-enforcement');

const mockMembers = [
  { id: '1', email: 'alice@example.com', name: 'Alice' },
  { id: '2', email: 'bob@example.com', name: 'Bob' },
  { id: '3', email: 'carol@example.com', name: 'Carol' }
];

beforeEach(() => {
  jest.clearAllMocks();
  getMembersWithoutPhotos.mockResolvedValue(mockMembers);
  findWarningByEmail.mockResolvedValue(null);
  determineEnforcementAction.mockReturnValue({
    action: 'CREATE_WARNING',
    warningLevel: 1,
    reason: 'New warning',
    shouldNotifyAdmin: false
  });
  processEnforcementAction.mockResolvedValue({
    success: true,
    executedActions: ['Created warning'],
    errors: []
  });
});

describe('runEnforcement filterEmail', () => {
  test('no filter processes all members', async () => {
    const summary = await runEnforcement(true);

    expect(summary.totalMembers).toBe(3);
    expect(summary.processed).toBe(3);
    expect(processEnforcementAction).toHaveBeenCalledTimes(3);
  });

  test('filter matching one email processes only that member', async () => {
    const summary = await runEnforcement(true, 'bob@example.com');

    expect(summary.totalMembers).toBe(1);
    expect(summary.processed).toBe(1);
    expect(processEnforcementAction).toHaveBeenCalledTimes(1);
    expect(processEnforcementAction).toHaveBeenCalledWith(
      mockMembers[1],
      null,
      expect.objectContaining({ action: 'CREATE_WARNING' }),
      true
    );
  });

  test('filter matching no emails processes zero members', async () => {
    const summary = await runEnforcement(true, 'nobody@example.com');

    expect(summary.totalMembers).toBe(0);
    expect(summary.processed).toBe(0);
    expect(processEnforcementAction).toHaveBeenCalledTimes(0);
  });

  test('filter is case-insensitive', async () => {
    const summary = await runEnforcement(true, 'ALICE@EXAMPLE.COM');

    expect(summary.totalMembers).toBe(1);
    expect(summary.processed).toBe(1);
    expect(processEnforcementAction).toHaveBeenCalledWith(
      mockMembers[0],
      null,
      expect.objectContaining({ action: 'CREATE_WARNING' }),
      true
    );
  });
});

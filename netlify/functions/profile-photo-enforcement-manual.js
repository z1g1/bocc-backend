/**
 * Profile Photo Enforcement - Manual/On-Demand Function
 * For testing and manual enforcement runs
 *
 * Epic 4: Profile Photo Enforcement System
 *
 * This is the HTTP-accessible version for manual testing.
 * The scheduled version is in profile-photo-enforcement.js
 */

// Import the shared enforcement logic
const { runEnforcement } = require('./profile-photo-enforcement');

/**
 * Netlify Function Handler (HTTP-accessible)
 * Can be called manually for testing or on-demand enforcement
 *
 * @param {object} event - Netlify event object
 * @returns {Promise<object>} Response with status and summary
 */
exports.handler = async (event) => {
  try {
    console.log('Manual enforcement function triggered');

    // Check for dryRun parameter
    const queryParams = event.queryStringParameters || {};
    const dryRun = queryParams.dryRun === 'true' || queryParams.dryRun === '1';

    // Run enforcement using shared logic
    const summary = await runEnforcement(dryRun);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Profile photo enforcement completed',
        mode: dryRun ? 'DRY RUN' : 'PRODUCTION',
        summary: summary
      }, null, 2)
    };

  } catch (error) {
    console.error('Manual enforcement function error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, null, 2)
    };
  }
};

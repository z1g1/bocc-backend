/**
 * Profile Photo Enforcement - Scheduled Function
 * Weekly automated enforcement of profile photo policy
 *
 * Epic 4: Profile Photo Enforcement System
 * STORY-17: Netlify Scheduled Function
 *
 * Runs every Monday at 9:00 AM EST via Netlify Scheduled Functions
 * Configured in netlify.toml
 */

const { getSegmentMembers } = require('./utils/circle');
const { findWarningByEmail } = require('./utils/airtable-warnings');
const {
  determineEnforcementAction,
  processEnforcementAction
} = require('./utils/enforcement-logic');

// Circle.so segment ID for "No Profile Photo" members
const NO_PHOTO_SEGMENT_ID = 238273;

/**
 * Main enforcement orchestrator
 * Processes all members without profile photos
 *
 * @param {boolean} dryRun - If true, log actions without executing them
 * @returns {Promise<object>} Summary report
 */
const runEnforcement = async (dryRun = false) => {
  const startTime = Date.now();

  console.log('====================================');
  console.log('Profile Photo Enforcement - Starting');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('====================================');

  const summary = {
    totalMembers: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    actions: {
      CREATE_WARNING: 0,
      INCREMENT_WARNING: 0,
      DEACTIVATE: 0,
      PHOTO_ADDED: 0,
      SKIP: 0
    },
    finalWarnings: 0,
    deactivations: 0,
    duration: 0,
    errorDetails: []
  };

  try {
    // Step 1: Fetch all members without profile photos from Circle segment
    console.log(`\nFetching members from segment ${NO_PHOTO_SEGMENT_ID}...`);
    const members = await getSegmentMembers(NO_PHOTO_SEGMENT_ID);
    summary.totalMembers = members.length;

    console.log(`Found ${members.length} members without profile photos\n`);

    // Step 2: Process each member
    for (const member of members) {
      try {
        console.log(`\nProcessing: ${member.name} (${member.email})`);

        // Step 2a: Check for existing warning record in Airtable
        const existingWarning = await findWarningByEmail(member.email);

        // Step 2b: Determine what action to take
        const action = determineEnforcementAction(member, existingWarning);

        console.log(`  Action: ${action.action} (Level ${action.warningLevel})`);
        console.log(`  Reason: ${action.reason}`);

        // Step 2c: Execute the enforcement action
        const result = await processEnforcementAction(
          member,
          existingWarning,
          action,
          dryRun
        );

        if (result.success) {
          summary.processed++;
          summary.actions[action.action]++;

          // Track final warnings and deactivations separately
          if (action.warningLevel === 4 && action.shouldNotifyAdmin) {
            summary.finalWarnings++;
          }
          if (action.action === 'DEACTIVATE') {
            summary.deactivations++;
          }

          console.log(`  ✓ Success: ${result.executedActions.join(', ')}`);

          if (result.errors.length > 0) {
            console.log(`  ⚠ Non-blocking errors: ${result.errors.join(', ')}`);
          }
        } else {
          summary.errors++;
          summary.errorDetails.push({
            member: member.email,
            action: action.action,
            errors: result.errors
          });

          console.log(`  ✗ Failed: ${result.errors.join(', ')}`);
        }

      } catch (memberError) {
        summary.errors++;
        summary.errorDetails.push({
          member: member.email,
          error: memberError.message
        });

        console.error(`  ✗ Error processing ${member.email}:`, memberError.message);
      }
    }

  } catch (error) {
    console.error('\n✗ Fatal error during enforcement run:', error.message);
    summary.errorDetails.push({
      fatal: true,
      error: error.message
    });
  }

  summary.duration = Date.now() - startTime;
  summary.skipped = summary.totalMembers - summary.processed - summary.errors;

  // Print summary report
  console.log('\n====================================');
  console.log('Enforcement Run Complete');
  console.log('====================================');
  console.log(`Total members: ${summary.totalMembers}`);
  console.log(`Processed: ${summary.processed}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);
  console.log('\nActions:');
  console.log(`  - New warnings created: ${summary.actions.CREATE_WARNING}`);
  console.log(`  - Warnings incremented: ${summary.actions.INCREMENT_WARNING}`);
  console.log(`  - Final warnings (4th): ${summary.finalWarnings}`);
  console.log(`  - Deactivations: ${summary.actions.DEACTIVATE}`);
  console.log(`  - Photos added (removed from tracking): ${summary.actions.PHOTO_ADDED}`);
  console.log(`  - Skipped (already handled): ${summary.actions.SKIP}`);
  console.log(`\nDuration: ${summary.duration}ms`);
  console.log('====================================\n');

  if (summary.errorDetails.length > 0) {
    console.log('Error Details:');
    summary.errorDetails.forEach((err, index) => {
      console.log(`  ${index + 1}. ${err.member || 'Fatal'}: ${err.error || err.errors?.join(', ')}`);
    });
    console.log();
  }

  return summary;
};

/**
 * Netlify Scheduled Function Handler
 * Triggered by cron schedule defined in netlify.toml
 *
 * @param {object} event - Netlify event object
 * @returns {Promise<object>} Response with status and summary
 */
exports.handler = async (event) => {
  try {
    console.log('Scheduled function triggered:', event);

    // Check if this is a manual invocation with dryRun parameter
    const queryParams = event.queryStringParameters || {};
    const dryRun = queryParams.dryRun === 'true' || queryParams.dryRun === '1';

    // Run enforcement
    const summary = await runEnforcement(dryRun);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Profile photo enforcement completed',
        summary: summary
      })
    };

  } catch (error) {
    console.error('Scheduled function error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Export runEnforcement for testing
exports.runEnforcement = runEnforcement;

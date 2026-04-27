// Weekly Report Cron Job
// Runs every Sunday at 08:00 IST (02:30 UTC — India is UTC+5:30).
// Generates and emails weekly reflections for all opted-in Mode A users.
//
// Design:
//   - Processes users in batches to avoid memory pressure on large user bases
//   - Each user is processed independently — one failure does not stop others
//   - Uses node-cron for scheduling (stays alive with the Express process)
//
// Start this by calling startWeeklyReportCron() from index.js.

const cron = require('node-cron');
const User = require('../models/User');
const { generateWeeklyReport } = require('../ai/weeklyReporter');

// Batch size — process this many users at once before moving to the next batch
const BATCH_SIZE = 10;


/**
 * Runs the weekly report pipeline for all eligible users.
 * Called by the cron schedule and also exportable for manual triggering.
 */
const runWeeklyReports = async () => {
    console.log('[WeeklyReport] Starting weekly report run at', new Date().toISOString());

    let processed = 0;
    let sent      = 0;
    let skipped   = 0;

    try {
        // Fetch all opted-in Mode A users with email addresses
        // We use a cursor-style batch fetch to avoid loading thousands of user IDs at once
        let offset = 0;

        while (true) {
            const users = await User
                .find({
                    reportOptIn:    true,
                    encryptionMode: 'A',
                    email:          { $exists: true, $ne: null }
                })
                .select('_id')
                .skip(offset)
                .limit(BATCH_SIZE)
                .lean();

            if (users.length === 0) break;

            // Process each user in this batch (in parallel within the batch)
            const results = await Promise.allSettled(
                users.map(u => generateWeeklyReport(u._id))
            );

            for (const result of results) {
                processed++;
                if (result.status === 'fulfilled' && result.value === true) {
                    sent++;
                } else {
                    skipped++;
                }
            }

            offset += users.length;

            // Stop if we got fewer than BATCH_SIZE — we've reached the end
            if (users.length < BATCH_SIZE) break;
        }

    } catch (err) {
        console.error('[WeeklyReport] Fatal error during run:', err.message);
    }

    console.log(`[WeeklyReport] Done. Processed: ${processed}, Sent: ${sent}, Skipped/failed: ${skipped}`);
};


/**
 * Starts the weekly cron job.
 * Call once from index.js at server startup.
 *
 * Schedule: Every Sunday at 08:00 IST = 02:30 UTC
 * Cron format: minute hour dayOfWeek
 *   30 2 * * 0   → 02:30 UTC, every Sunday
 */
const startWeeklyReportCron = () => {
    // Validate cron is available
    if (!cron.validate('30 2 * * 0')) {
        console.error('[WeeklyReport] Invalid cron expression — cron job not started.');
        return;
    }

    cron.schedule('30 2 * * 0', async () => {
        await runWeeklyReports();
    }, {
        timezone: 'UTC'
    });

    console.log('[WeeklyReport] Cron job scheduled — runs every Sunday at 02:30 UTC (08:00 IST).');
};


module.exports = { startWeeklyReportCron, runWeeklyReports };

#!/usr/bin/env node
// Dr. Aria — CLI Test Runner
//
// Usage:
//   node tests/cli.js                           (run all suites against localhost:4000)
//   node tests/cli.js --suite=auth              (single suite)
//   node tests/cli.js --suite=chat,perf         (multiple suites)
//   node tests/cli.js --url=https://myserver    (custom URL)
//   node tests/cli.js --verbose                 (show response previews)
//   node tests/cli.js --suite=all --clean       (wipe test users from DB first)
//
// Suites: auth | chat | privacy | perf | all
//
// Reports saved to: tests/reports/report-<timestamp>.txt
//                   tests/reports/report-<timestamp>.json

require('dotenv').config();

const path     = require('path');
const mongoose = require('mongoose');
const { Runner } = require('./runner');

// ── CLI args ───────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [key, val] = a.slice(2).split('=');
            return [key, val ?? true];
        })
);

const BASE_URL = args.url    || process.env.TEST_BASE_URL || 'http://localhost:4000';
const SUITE    = args.suite  || 'all';
const VERBOSE  = args.verbose === true || args.verbose === 'true';
const CLEAN    = args.clean  === true  || args.clean  === 'true';

const SUITES_REQUESTED = SUITE === 'all'
    ? ['auth', 'chat', 'privacy', 'perf']
    : SUITE.split(',').map(s => s.trim());

// ── Report file path ───────────────────────────────────────────────────────────
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logPath   = path.resolve(__dirname, 'reports', `report-${timestamp}.txt`);

// ── Suite registry ─────────────────────────────────────────────────────────────
const SUITE_MAP = {
    auth:    require('./suites/auth'),
    chat:    require('./suites/chat'),
    privacy: require('./suites/privacy'),
    perf:    require('./suites/perf')
};

// ── Main ───────────────────────────────────────────────────────────────────────
const main = async () => {

    // ── Validate requested suites ────────────────────────────────────────────────
    const invalid = SUITES_REQUESTED.filter(s => !SUITE_MAP[s]);
    if (invalid.length) {
        console.error(`Unknown suite(s): ${invalid.join(', ')}`);
        console.error(`Available: ${Object.keys(SUITE_MAP).join(' | ')}`);
        process.exit(1);
    }

    // ── Health check — is server up? ─────────────────────────────────────────────
    try {
        const res = await fetch(`${BASE_URL}/health`);
        if (!res.ok) throw new Error(`Health returned ${res.status}`);
    } catch (err) {
        console.error(`\n  ✗ Server not reachable at ${BASE_URL}`);
        console.error(`    → ${err.message}`);
        console.error(`    Start the server first: npm run dev\n`);
        process.exit(1);
    }

    // ── Connect to MongoDB (required for DB-direct test helpers) ─────────────────
    try {
        await mongoose.connect(process.env.MONGODB_URL);
    } catch (err) {
        console.error(`\n  ✗ MongoDB connection failed: ${err.message}\n`);
        process.exit(1);
    }

    // ── Optional clean: delete all test users ────────────────────────────────────
    if (CLEAN) {
        const User = require('../models/User');
        const testEmails = [
            'arjun.test.aria@mailinator.com',
            'priya.test.aria@mailinator.com',
            'rahul.test.aria@mailinator.com',
            'throwaway.test.aria@mailinator.com'
        ];
        const result = await User.deleteMany({ email: { $in: testEmails } });
        console.log(`  Cleaned ${result.deletedCount} test user(s) from DB.\n`);
    }

    // ── Create test runner ────────────────────────────────────────────────────────
    const runner = new Runner({ baseUrl: BASE_URL, logPath, verbose: VERBOSE });

    // ── Run suites in order ───────────────────────────────────────────────────────
    // Suites share the runner's cookie jar — auth suite logs in and chat/privacy
    // suites reuse that session automatically.
    for (const suiteName of SUITES_REQUESTED) {
        const suiteFn = SUITE_MAP[suiteName];
        try {
            await suiteFn(runner, BASE_URL);
        } catch (err) {
            console.error(`\n  Fatal error in suite "${suiteName}": ${err.message}`);
            runner._write(`\nFATAL ERROR in suite "${suiteName}": ${err.message}\n${err.stack}`);
        }
    }

    // ── Print summary + write report ─────────────────────────────────────────────
    const allPassed = runner.summary();

    // Disconnect mongoose gracefully — force:true closes handles immediately
    // without waiting for pending operations, preventing the Windows libuv
    // "handle closing" assertion crash on process.exit.
    try {
        await mongoose.disconnect();
    } catch (_) { /* ignore disconnect errors */ }

    // Set exit code and let Node drain naturally instead of calling process.exit()
    // directly — avoids UV_HANDLE_CLOSING assertion crash on Windows.
    process.exitCode = allPassed ? 0 : 1;
};

// ── Unhandled rejection guard ──────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
    console.error('\n  Unhandled rejection:', err.message);
    process.exitCode = 1;
});

main();

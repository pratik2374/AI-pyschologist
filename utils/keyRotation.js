// Key Rotation Utility
//
// Rotates the ENCRYPTION_MASTER_KEY without data loss.
//
// What "key rotation" means here:
//   The master key encrypts each user's per-user key (stored in User.encryptionKeyEncrypted).
//   Rotating the master key means:
//     1. Decrypt every user's per-user key with the OLD master key
//     2. Re-encrypt every user's per-user key with the NEW master key
//     3. Update the User document
//   The user's actual message content does NOT need to be touched —
//   it was encrypted with the per-user key, which has not changed.
//
// Usage:
//   node utils/keyRotation.js --dry-run               (simulate — no writes)
//   node utils/keyRotation.js --old-key=<64hexchars>  (requires NEW key in ENCRYPTION_MASTER_KEY env)
//
// Safety:
//   - Always run --dry-run first
//   - Back up MongoDB before running
//   - Script processes users in batches — safe for large user bases
//   - Atomic per-user: each user is rotated independently
//     A failure on one user does not affect others
//   - Script reports exactly which users succeeded and which failed
//   - On any failure, stop and investigate — do not proceed with a partial rotation
//
// After rotation:
//   1. Update ENCRYPTION_MASTER_KEY in .env / Azure Key Vault to the new key
//   2. Restart the server
//   3. Delete the old key from everywhere it was stored

require('dotenv').config();
const mongoose = require('mongoose');
const crypto   = require('crypto');

const { encrypt, decrypt } = require('./encryption');

const BATCH_SIZE = 50;


const run = async () => {
    const args    = process.argv.slice(2);
    const dryRun  = args.includes('--dry-run');
    const oldKeyArg = args.find(a => a.startsWith('--old-key='));

    if (!oldKeyArg) {
        console.error('Usage: node utils/keyRotation.js --old-key=<64hexchars> [--dry-run]');
        console.error('The NEW master key must be set in ENCRYPTION_MASTER_KEY env var.');
        process.exit(1);
    }

    const oldKeyHex = oldKeyArg.split('=')[1];
    const newKeyHex = process.env.ENCRYPTION_MASTER_KEY;

    if (!oldKeyHex || oldKeyHex.length !== 64) {
        console.error('--old-key must be exactly 64 hex characters (32 bytes).');
        process.exit(1);
    }

    if (!newKeyHex || newKeyHex.length !== 64) {
        console.error('ENCRYPTION_MASTER_KEY (new key) must be exactly 64 hex characters.');
        process.exit(1);
    }

    if (oldKeyHex === newKeyHex) {
        console.error('Old key and new key are identical — nothing to rotate.');
        process.exit(1);
    }

    const oldMasterKey = Buffer.from(oldKeyHex, 'hex');
    const newMasterKey = Buffer.from(newKeyHex, 'hex');

    console.log(dryRun ? '[KeyRotation] DRY RUN — no writes will occur.' : '[KeyRotation] LIVE RUN — writes will occur.');
    console.log('[KeyRotation] Connecting to database...');

    await mongoose.connect(process.env.MONGODB_URL);
    const User = require('../models/User');

    console.log('[KeyRotation] Connected. Starting rotation...\n');

    let processed = 0;
    let succeeded = 0;
    let skipped   = 0;
    let failed    = 0;
    const failedUsers = [];

    let offset = 0;

    while (true) {
        const users = await User
            .find({ encryptionKeyEncrypted: { $ne: null }, encryptionMode: 'A' })
            .select('_id encryptionKeyEncrypted')
            .skip(offset)
            .limit(BATCH_SIZE)
            .lean();

        if (users.length === 0) break;

        for (const user of users) {
            processed++;
            try {
                // Step 1: Decrypt per-user key with old master key
                const keyHex = decrypt(user.encryptionKeyEncrypted, oldMasterKey);

                // Step 2: Validate it's a 64-char hex string (32 bytes)
                if (!keyHex || keyHex.length !== 64) {
                    throw new Error('Decrypted key has unexpected length');
                }

                // Step 3: Re-encrypt with new master key
                const newEncryptedKey = encrypt(keyHex, newMasterKey);

                if (!dryRun) {
                    await User.findByIdAndUpdate(user._id, {
                        encryptionKeyEncrypted: newEncryptedKey
                    });
                }

                succeeded++;
                if (processed % 100 === 0) {
                    console.log(`[KeyRotation] Progress: ${processed} processed, ${succeeded} succeeded, ${failed} failed...`);
                }

            } catch (err) {
                failed++;
                failedUsers.push({ userId: user._id.toString(), error: err.message });
                console.error(`[KeyRotation] FAILED for user ${user._id}: ${err.message}`);
            }
        }

        offset += users.length;
        if (users.length < BATCH_SIZE) break;
    }

    console.log('\n[KeyRotation] ── SUMMARY ──────────────────────');
    console.log(`Total processed:  ${processed}`);
    console.log(`Succeeded:        ${succeeded}`);
    console.log(`Skipped (no key): ${skipped}`);
    console.log(`Failed:           ${failed}`);

    if (failedUsers.length > 0) {
        console.error('\n[KeyRotation] FAILED USERS:');
        failedUsers.forEach(u => console.error(`  ${u.userId}: ${u.error}`));
        console.error('\n[KeyRotation] DO NOT deploy new master key until all failures are resolved.');
    } else if (!dryRun) {
        console.log('\n[KeyRotation] All users rotated successfully.');
        console.log('[KeyRotation] You may now restart the server with the new ENCRYPTION_MASTER_KEY.');
    } else {
        console.log('\n[KeyRotation] Dry run complete — no data was changed.');
        console.log('[KeyRotation] Run without --dry-run to apply the rotation.');
    }

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
};

run().catch(err => {
    console.error('[KeyRotation] Fatal error:', err.message);
    process.exit(1);
});

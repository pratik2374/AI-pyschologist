// Privacy Controller
//
// GET  /privacy/profile   — returns the user's observation profile (what Dr. Aria knows)
//                           Safe to return as-is — observations are clinical metadata, never raw words.
//
// PUT  /privacy/emergency-contact — saves encrypted emergency contact
//
// DELETE /privacy/account  — cascade deletes ALL user data across every collection.
//                            Irreversible. Returns 200 on success, 500 on partial failure.
//                            User is logged out immediately after.

const User                = require('../models/User');
const Message             = require('../models/Message');
const Observation         = require('../models/Observation');
const ChapterSummary      = require('../models/ChapterSummary');
const LongitudinalProfile = require('../models/LongitudinalProfile');
const WeeklyReport        = require('../models/WeeklyReport');
const CrisisFlag          = require('../models/CrisisFlag');

const { encrypt, decrypt, decryptUserKey, isMasterKeyConfigured } = require('../utils/encryption');


// ── View Observation Profile ───────────────────────────────────────────────────

/**
 * GET /privacy/profile
 *
 * Returns:
 *   - LongitudinalProfile (what Dr. Aria has synthesized about this person)
 *   - Last 20 Observations (raw clinical metadata chunks)
 *   - Message and chapter counts
 *
 * This data is never encrypted — it is derived clinical metadata, not raw conversation.
 * Showing it to the user is deliberate: they have a right to know what is inferred about them.
 */
exports.viewProfile = async (req, res) => {
    try {
        const userId = req.decoded?.userid;

        const [profile, recentObservations, user, messageCount, chapterCount] = await Promise.all([
            LongitudinalProfile.findOne({ userId }).lean(),
            Observation.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
            User.findById(userId).select('name preferredName encryptionMode reportOptIn messageCount chunkCount firstSession lastSeenAt createdAt').lean(),
            Message.countDocuments({ userId }),
            ChapterSummary.countDocuments({ userId })
        ]);

        return res.status(200).json({
            success: true,
            profile: profile || null,
            recentObservations,
            stats: {
                totalMessages:  messageCount,
                chapters:       chapterCount,
                observerRuns:   user?.chunkCount || 0,
                memberSince:    user?.createdAt,
                lastActive:     user?.lastSeenAt
            },
            user: {
                name:            user?.name,
                preferredName:   user?.preferredName,
                encryptionMode:  user?.encryptionMode,
                reportOptIn:     user?.reportOptIn
            }
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};


// ── Emergency Contact ─────────────────────────────────────────────────────────

/**
 * PUT /privacy/emergency-contact
 * Body: { name: string, phone: string, email: string }
 *
 * Encrypts the contact with the user's per-user key before storing.
 * Mode B users cannot store emergency contacts server-side (no server key).
 */
exports.updateEmergencyContact = async (req, res) => {
    try {
        const userId = req.decoded?.userid;
        const { name, phone, email } = req.body;

        if (!name && !phone && !email) {
            return res.status(400).json({
                success: false,
                message: 'At least one contact field (name, phone, email) is required'
            });
        }

        const user = await User.findById(userId).lean();

        if (user?.encryptionMode === 'B') {
            return res.status(400).json({
                success: false,
                message: 'Mode B users manage emergency contacts client-side. The server cannot store them.'
            });
        }

        // Encrypt the contact details
        let emergencyContactEncrypted = null;

        if (isMasterKeyConfigured() && user?.encryptionKeyEncrypted) {
            const userKey   = decryptUserKey(user.encryptionKeyEncrypted);
            const contactJson = JSON.stringify({ name: name || null, phone: phone || null, email: email || null });
            emergencyContactEncrypted = encrypt(contactJson, userKey);
        } else {
            // Dev environment without master key — store as plaintext JSON
            emergencyContactEncrypted = JSON.stringify({ name: name || null, phone: phone || null, email: email || null });
        }

        await User.findByIdAndUpdate(userId, { emergencyContactEncrypted });

        return res.status(200).json({
            success: true,
            message: 'Emergency contact saved'
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Error saving emergency contact'
        });
    }
};


/**
 * GET /privacy/emergency-contact
 * Returns the decrypted emergency contact for the authenticated user.
 */
exports.getEmergencyContact = async (req, res) => {
    try {
        const userId = req.decoded?.userid;
        const user   = await User.findById(userId).select('encryptionMode encryptionKeyEncrypted emergencyContactEncrypted').lean();

        if (!user?.emergencyContactEncrypted) {
            return res.status(200).json({ success: true, contact: null });
        }

        let contact = null;

        if (isMasterKeyConfigured() && user?.encryptionKeyEncrypted) {
            try {
                const userKey     = decryptUserKey(user.encryptionKeyEncrypted);
                const decrypted   = decrypt(user.emergencyContactEncrypted, userKey);
                contact           = JSON.parse(decrypted);
            } catch {
                // Could be plaintext JSON from dev environment
                try { contact = JSON.parse(user.emergencyContactEncrypted); } catch { /* null */ }
            }
        } else {
            try { contact = JSON.parse(user.emergencyContactEncrypted); } catch { /* null */ }
        }

        return res.status(200).json({ success: true, contact });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching emergency contact'
        });
    }
};


// ── Delete Account — Cascade ───────────────────────────────────────────────────

/**
 * DELETE /privacy/account
 * Body: { confirmDelete: true }   — explicit acknowledgment required
 *
 * Cascade deletes ALL data for this user across every collection.
 * Collections deleted: Messages, Observations, ChapterSummaries,
 *                      LongitudinalProfile, WeeklyReports, CrisisFlags, User
 *
 * This is irreversible. We run all deletes in parallel for speed,
 * then verify the User document is gone before responding.
 */
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.decoded?.userid;

        // Require explicit confirmation in the request body
        if (req.body?.confirmDelete !== true) {
            return res.status(400).json({
                success: false,
                message: 'Account deletion requires confirmDelete: true in the request body. This action is irreversible.'
            });
        }

        // Run all collection deletes in parallel
        const deleteResults = await Promise.allSettled([
            Message.deleteMany({ userId }),
            Observation.deleteMany({ userId }),
            ChapterSummary.deleteMany({ userId }),
            LongitudinalProfile.deleteOne({ userId }),
            WeeklyReport.deleteMany({ userId }),
            CrisisFlag.deleteMany({ userId }),
            User.deleteOne({ _id: userId })
        ]);

        // Check if any deletion failed
        const failures = deleteResults
            .map((r, i) => ({ index: i, status: r.status, reason: r.reason?.message }))
            .filter(r => r.status === 'rejected');

        if (failures.length > 0) {
            console.error('[DeleteAccount] Partial failure for user', userId, failures);
            return res.status(500).json({
                success: false,
                message: 'Account deletion was only partially successful. Please contact support.'
            });
        }

        // Clear the auth cookie so the client is immediately logged out
        return res.status(200)
            .cookie('token', '', {
                expires:  new Date(0),
                httpOnly: true,
                secure:   true,
                sameSite: 'None'
            })
            .json({
                success: true,
                message: 'Your account and all associated data have been permanently deleted.'
            });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Error deleting account'
        });
    }
};

// Context Builder — assembles everything Dr. Aria needs before each response.
//
// Runs parallel DB queries to fetch:
//   - User document (lastSeenAt, firstSession, preferredName, encryptionMode)
//   - LongitudinalProfile (deep memory of this person)
//   - ChapterSummaries (compressed older history)
//   - Recent unarchived Messages (verbatim working window)
//   - Latest WeeklyReport contextSummary
//   - Latest unresolved CrisisFlag (for post-crisis instruction)
//
// Calculates gap duration, assembles system prompt, formats message history for Groq.
//
// Does NOT include the current user message — the controller appends it.

const User                = require('../models/User');
const LongitudinalProfile = require('../models/LongitudinalProfile');
const ChapterSummary      = require('../models/ChapterSummary');
const Message             = require('../models/Message');
const WeeklyReport        = require('../models/WeeklyReport');
const CrisisFlag          = require('../models/CrisisFlag');

const { buildSystemPrompt }                                   = require('./prompt');
const { gapContextInstruction, postCrisisContextInstruction } = require('./openers');
const { decryptUserKey, decrypt, isMasterKeyConfigured }      = require('../utils/encryption');

// How many recent verbatim messages to load into the working context window
const WORKING_MEMORY_LIMIT = 30;

// How many recent chapter summaries to inject (compressed older history)
const CHAPTER_LIMIT = 5;


/**
 * Builds the full context for a single Groq request.
 * All DB fetches run in parallel for minimal latency.
 *
 * @param {string|ObjectId} userId
 * @returns {Object} {
 *   systemPrompt   — complete assembled system prompt
 *   messages       — recent messages in Groq format (does NOT include current msg)
 *   user           — User document (lean)
 *   gapMs          — milliseconds since last message, null if first ever
 *   isFirstSession — true if user.firstSession === true (no messages yet)
 * }
 */
const buildContext = async (userId) => {

    // ── Parallel DB fetches ──────────────────────────────────────────────────────
    const [
        user,
        profile,
        chapters,
        recentMessages,
        latestReport,
        latestCrisis
    ] = await Promise.all([

        // 1. User — for state flags and gap calculation
        User.findById(userId).lean(),

        // 2. Longitudinal profile — Dr. Aria's deep memory of this person
        LongitudinalProfile.findOne({ userId }).lean(),

        // 3. Chapter summaries — compressed older history, most recent 5
        ChapterSummary
            .find({ userId })
            .sort({ chapterNumber: -1 })
            .limit(CHAPTER_LIMIT)
            .lean()
            .then(chs => chs.reverse()),   // restore chronological order

        // 4. Recent verbatim messages — working context window
        Message
            .find({ userId, isArchived: false })
            .sort({ createdAt: -1 })
            .limit(WORKING_MEMORY_LIMIT)
            .lean()
            .then(msgs => msgs.reverse()),  // restore chronological order

        // 5. Latest weekly report — contextSummary only (plaintext, safe to inject)
        WeeklyReport
            .findOne({ userId })
            .sort({ weekOf: -1 })
            .lean(),

        // 6. Most recent unresolved high-priority crisis flag (Level 2+)
        CrisisFlag
            .findOne({ userId, level: { $gte: 2 }, resolved: false })
            .sort({ createdAt: -1 })
            .lean()
    ]);

    // ── Resolve encryption key ───────────────────────────────────────────────────
    // For Mode A users with a configured master key: decrypt the per-user key.
    // For Mode B users or dev environments without ENCRYPTION_MASTER_KEY: null (plaintext).
    let userKeyBuffer = null;
    if (
        user?.encryptionMode === 'A' &&
        user?.encryptionKeyEncrypted &&
        isMasterKeyConfigured()
    ) {
        try {
            userKeyBuffer = decryptUserKey(user.encryptionKeyEncrypted);
        } catch (err) {
            console.error('[ContextBuilder] Failed to decrypt user key:', err.message);
        }
    }

    // ── Gap calculation ──────────────────────────────────────────────────────────
    const now   = Date.now();
    const gapMs = user?.lastSeenAt
        ? Math.max(0, now - new Date(user.lastSeenAt).getTime())
        : null;

    // ── Situational instructions ─────────────────────────────────────────────────
    const gapInstruction = gapMs !== null ? gapContextInstruction(gapMs) : null;

    const crisisInstruction = latestCrisis
        ? postCrisisContextInstruction(
              latestCrisis.level,
              latestCrisis.createdAt
                  ? Math.floor((now - new Date(latestCrisis.createdAt).getTime()) / 86400000)
                  : 0
          )
        : null;

    // ── Decrypt chapter summaries ────────────────────────────────────────────────
    // Chapter summaries are stored encrypted for Mode A users.
    // We decrypt them here before injecting into the system prompt.
    const decryptedChapters = chapters.map(ch => {
        if (userKeyBuffer && ch.summary) {
            try {
                return { ...ch, summary: decrypt(ch.summary, userKeyBuffer) };
            } catch {
                return ch;  // leave encrypted text in place — better than breaking context
            }
        }
        return ch;
    });

    // ── System prompt assembly ───────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt({
        profile,
        chapterSummaries:  decryptedChapters,
        weeklyReport:      latestReport?.contextSummary || null,
        gapInstruction,
        crisisInstruction
    });

    // ── Message history (Groq format) ────────────────────────────────────────────
    // Map 'aria' → 'assistant' for Groq API. 'user' stays 'user'.
    // Decrypt content for Mode A users — Mode B content is opaque to server.
    // This does NOT include the current message — controller appends it.
    const messages = recentMessages.map(msg => {
        let content = msg.content;

        if (userKeyBuffer) {
            try {
                content = decrypt(msg.content, userKeyBuffer);
            } catch {
                // If decryption fails (e.g. old plaintext message before encryption was enabled),
                // fall back to raw content so conversation is not broken.
                content = msg.content;
            }
        }

        return {
            role:    msg.role === 'aria' ? 'assistant' : 'user',
            content
        };
    });

    return {
        systemPrompt,
        messages,
        user,
        userKeyBuffer,   // returned so controller can encrypt new messages with same key
        gapMs,
        isFirstSession: user?.firstSession === true
    };
};


module.exports = { buildContext };

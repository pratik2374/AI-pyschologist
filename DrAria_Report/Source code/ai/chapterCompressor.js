// Chapter Compressor
// Triggered asynchronously when the number of unarchived messages exceeds COMPRESS_THRESHOLD.
//
// Takes the oldest COMPRESS_BATCH unarchived messages, compresses them into a
// ChapterSummary narrative using the 8B model, then marks those messages as
// archived so they no longer load verbatim into the context window.
//
// This keeps the working context window bounded at ~30 messages regardless of
// how long the conversation has been going.
//
// Called by observer.js after each observer run — never blocks the user.

const Message        = require('../models/Message');
const ChapterSummary = require('../models/ChapterSummary');
const User           = require('../models/User');
const { runCompression } = require('./groq');
const { decryptUserKey, decrypt, encrypt, isMasterKeyConfigured } = require('../utils/encryption');

// Compress when unarchived message count exceeds this
const COMPRESS_THRESHOLD = 50;

// Number of oldest messages to compress per run
const COMPRESS_BATCH = 50;


/**
 * Checks if compression is needed and runs it if so.
 * Safe to call frequently — exits immediately if threshold not reached.
 *
 * @param {string|ObjectId} userId
 */
const compressIfNeeded = async (userId) => {
    try {
        // How many unarchived messages does this user have?
        const unarchivedCount = await Message.countDocuments({
            userId,
            isArchived: false
        });

        if (unarchivedCount <= COMPRESS_THRESHOLD) return;

        // Fetch the oldest COMPRESS_BATCH unarchived messages in chronological order
        const toCompress = await Message
            .find({ userId, isArchived: false })
            .sort({ createdAt: 1 })
            .limit(COMPRESS_BATCH)
            .lean();

        // Resolve user encryption key so we can decrypt message content and
        // re-encrypt the resulting chapter summary
        let userKeyBuffer = null;
        if (isMasterKeyConfigured()) {
            const user = await User.findById(userId).select('encryptionMode encryptionKeyEncrypted').lean();
            if (user?.encryptionMode === 'A' && user?.encryptionKeyEncrypted) {
                try { userKeyBuffer = decryptUserKey(user.encryptionKeyEncrypted); }
                catch { /* continue without encryption if key recovery fails */ }
            }
        }

        // Decrypt message content for compression (so the model sees plain text)
        if (userKeyBuffer) {
            for (const msg of toCompress) {
                try { msg.content = decrypt(msg.content, userKeyBuffer); }
                catch { /* leave as-is if individual message decryption fails */ }
            }
        }

        // Need at least 10 messages to produce a meaningful summary
        if (toCompress.length < 10) return;

        // Determine the next chapter number
        const lastChapter = await ChapterSummary
            .findOne({ userId })
            .sort({ chapterNumber: -1 })
            .lean();

        const nextChapterNumber = (lastChapter?.chapterNumber || 0) + 1;

        // Build and run compression
        const compressionPrompt = buildCompressionPrompt(toCompress, nextChapterNumber);
        const summary           = await runCompression(compressionPrompt);

        if (!summary || summary.length < 50) return;

        // Extract quick-reference metadata (no model needed — derived from message flags)
        const keyThemes       = extractKeyThemes(toCompress);
        const dominantEmotion = extractDominantEmotion(toCompress);
        const hadCrisisEvent  = toCompress.some(m => m.crisisDetected === true);

        // Encrypt the summary before storing (if key available)
        const summaryToStore = userKeyBuffer
            ? (() => { try { return encrypt(summary, userKeyBuffer); } catch { return summary; } })()
            : summary;

        // Save the ChapterSummary
        await ChapterSummary.create({
            userId,
            chapterNumber: nextChapterNumber,
            summary: summaryToStore,
            messageRange: {
                fromMessageId: toCompress[0]._id,
                toMessageId:   toCompress[toCompress.length - 1]._id,
                fromDate:      toCompress[0].createdAt,
                toDate:        toCompress[toCompress.length - 1].createdAt,
                messageCount:  toCompress.length
            },
            keyThemes,
            dominantEmotion,
            hadCrisisEvent
        });

        // Mark all compressed messages as archived
        const messageIds = toCompress.map(m => m._id);
        await Message.updateMany(
            { _id: { $in: messageIds } },
            {
                isArchived:    true,
                chapterNumber: nextChapterNumber
            }
        );

    } catch (err) {
        console.error('[ChapterCompressor] Error:', err.message);
    }
};


// ── Prompt builder ─────────────────────────────────────────────────────────────

/**
 * Builds the compression prompt.
 * Instructs the 8B model to write a third-person clinical narrative summary.
 */
const buildCompressionPrompt = (messages, chapterNumber) => {
    const transcript = messages
        .map(m => `[${m.role === 'aria' ? 'Dr. Aria' : 'User'}]: ${m.content}`)
        .join('\n\n');

    return `You are a clinical psychologist writing a therapy record. Write Chapter ${chapterNumber} of this person's ongoing therapy history.

Below is a block of ${messages.length} messages between a user and Dr. Aria (their AI therapist).

Write a 3rd-person clinical narrative summary in 150–250 words that captures:
- The main themes and concerns this person brought to the conversation
- Their emotional state and how it shifted during this period
- Any significant moments, first disclosures, breakthroughs, or turning points
- What appears to be working therapeutically and what is proving difficult
- Any risk signals if present — note them clearly but clinically

Write in flowing prose — no bullet points, no headers. Clinical but warm language, as if written for a clinical supervisor who needs to understand this person at a glance.

Do NOT copy the user's words directly. Synthesize and interpret.

CONVERSATION:
${transcript}

CHAPTER ${chapterNumber} SUMMARY:`;
};


// ── Metadata helpers ───────────────────────────────────────────────────────────

/**
 * Extracts unique therapy modes used in this block as key themes.
 * Falls back to ['general'] if no therapy mode metadata is present.
 */
const extractKeyThemes = (messages) => {
    const modes = messages
        .filter(m => m.therapyMode && m.therapyMode !== 'none')
        .map(m => m.therapyMode);

    const unique = [...new Set(modes)];
    return unique.length > 0 ? unique : ['general'];
};

/**
 * Infers dominant emotion label from crisis flags.
 * This is deliberately simple — it's just metadata for quick scanning.
 */
const extractDominantEmotion = (messages) => {
    const crisisCount = messages.filter(m => m.crisisDetected).length;
    return crisisCount > 0 ? 'distressed' : 'mixed';
};


module.exports = { compressIfNeeded, COMPRESS_THRESHOLD };

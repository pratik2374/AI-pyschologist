// Weekly Report Generator
// Called by the weekly cron job for each opted-in Mode A user.
//
// Pipeline:
//   1. Fetch user, recent messages (7 days), recent chapter summaries, profile
//   2. Build a report generation prompt for the 70B model
//   3. Generate the report — written in Dr. Aria's voice, as a letter to the user
//   4. Build a short contextSummary (plaintext, injected into next session)
//   5. Encrypt the full report content
//   6. Save to WeeklyReport collection
//   7. Send the HTML email via Resend
//
// This function is called per-user and manages its own error handling.
// A failure for one user must not crash the cron — errors are caught and logged.

const User                = require('../models/User');
const Message             = require('../models/Message');
const ChapterSummary      = require('../models/ChapterSummary');
const LongitudinalProfile = require('../models/LongitudinalProfile');
const WeeklyReport        = require('../models/WeeklyReport');

const { runCompression }  = require('./groq');      // reuse — it's just non-streaming text generation
const { sendmail }        = require('../utils/mailsender');
const { buildReportEmail } = require('../utils/reportEmailTemplate');
const { decryptUserKey, decrypt, encrypt, isMasterKeyConfigured } = require('../utils/encryption');


/**
 * Generates and sends a weekly report for a single user.
 * Safe to call repeatedly — checks if a report for this week already exists.
 *
 * @param {string|ObjectId} userId
 * @returns {boolean} true if report was generated, false if skipped
 */
const generateWeeklyReport = async (userId) => {
    try {
        // ── Determine week boundary ──────────────────────────────────────────────
        const now       = new Date();
        const weekStart = getMostRecentSunday(now);

        // Already generated this week?
        const existing = await WeeklyReport.findOne({ userId, weekOf: weekStart });
        if (existing) return false;

        // ── Fetch user ───────────────────────────────────────────────────────────
        const user = await User.findById(userId).lean();
        if (!user || !user.reportOptIn || user.encryptionMode !== 'A') return false;

        // ── Resolve encryption key ───────────────────────────────────────────────
        let userKeyBuffer = null;
        if (isMasterKeyConfigured() && user.encryptionKeyEncrypted) {
            try { userKeyBuffer = decryptUserKey(user.encryptionKeyEncrypted); }
            catch (err) {
                console.error(`[WeeklyReporter] Key decryption failed for user ${userId}:`, err.message);
                return false;
            }
        }

        // ── Fetch data for the week ──────────────────────────────────────────────
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [recentMessages, recentChapters, profile] = await Promise.all([
            Message
                .find({ userId, createdAt: { $gte: sevenDaysAgo } })
                .sort({ createdAt: 1 })
                .lean(),
            ChapterSummary
                .find({ userId })
                .sort({ chapterNumber: -1 })
                .limit(2)
                .lean(),
            LongitudinalProfile.findOne({ userId }).lean()
        ]);

        // Skip if no activity this week
        if (recentMessages.length === 0) return false;

        // ── Decrypt content ──────────────────────────────────────────────────────
        const decryptedMessages = recentMessages.map(msg => {
            let content = msg.content;
            if (userKeyBuffer) {
                try { content = decrypt(msg.content, userKeyBuffer); }
                catch { /* use raw */ }
            }
            return { ...msg, content };
        });

        const decryptedChapters = recentChapters.map(ch => {
            let summary = ch.summary;
            if (userKeyBuffer) {
                try { summary = decrypt(ch.summary, userKeyBuffer); }
                catch { /* use raw */ }
            }
            return { ...ch, summary };
        });

        // ── Generate report ──────────────────────────────────────────────────────
        const reportPrompt = buildReportPrompt(
            user,
            decryptedMessages,
            decryptedChapters,
            profile,
            weekStart
        );

        const reportText = await runCompression(reportPrompt);  // plain text generation
        if (!reportText || reportText.length < 100) return false;

        // ── Build context summary (plaintext — injected into Dr. Aria's next session) ──
        const contextSummaryPrompt = `In 2-3 sentences, summarize what the most important themes were in this person's week of therapy, based on this report. Be clinical and concise. Do not include any personally identifying details. Only produce the 2-3 sentences — nothing else.\n\nReport:\n${reportText}`;
        const contextSummary = await runCompression(contextSummaryPrompt);

        // ── Build HTML and encrypt ───────────────────────────────────────────────
        const htmlContent = buildReportEmail(
            user.preferredName || user.name,
            reportText,
            weekStart
        );

        const storedContent = userKeyBuffer
            ? (() => { try { return encrypt(htmlContent, userKeyBuffer); } catch { return htmlContent; } })()
            : htmlContent;

        // ── Save WeeklyReport ────────────────────────────────────────────────────
        const reportDoc = await WeeklyReport.create({
            userId,
            weekOf:         weekStart,
            reportContent:  storedContent,
            contextSummary: contextSummary?.trim() || null
        });

        // ── Send email ───────────────────────────────────────────────────────────
        if (user.email) {
            try {
                const emailData = await sendmail(
                    user.email,
                    `Your week with Dr. Aria — ${formatWeekLabel(weekStart)}`,
                    htmlContent
                );

                await WeeklyReport.findByIdAndUpdate(reportDoc._id, {
                    emailSent:        true,
                    emailedAt:        new Date(),
                    resendMessageId:  emailData?.id || null
                });

            } catch (emailErr) {
                console.error(`[WeeklyReporter] Email failed for user ${userId}:`, emailErr.message);
                // Report is saved — email failure is non-fatal
            }
        }

        return true;

    } catch (err) {
        console.error(`[WeeklyReporter] Error generating report for user ${userId}:`, err.message);
        return false;
    }
};


// ── Report prompt builder ──────────────────────────────────────────────────────

const buildReportPrompt = (user, messages, chapters, profile, weekStart) => {
    const userName    = user.preferredName || user.name || 'the person';
    const weekLabel   = formatWeekLabel(weekStart);

    const transcript = messages
        .map(m => `[${m.role === 'aria' ? 'Dr. Aria' : 'You'}]: ${m.content}`)
        .join('\n\n');

    const profileSection = profile ? `
Known about this person:
- Recurring themes: ${profile.recurringThemes?.join(', ') || 'not yet established'}
- What works: ${profile.whatWorks || 'not yet established'}
- Communication style: ${profile.communicationStyle || 'not yet established'}
- Progress markers: ${profile.progressMarkers?.join(' | ') || 'none yet'}
- Current risk level: ${profile.currentRiskLevel || 'none'}` : '';

    const chapterSection = chapters.length > 0
        ? `\nPrevious context:\n${chapters.map(c => c.summary).join('\n\n')}`
        : '';

    return `You are Dr. Aria, writing a weekly reflection for ${userName} about their therapy journey this past week (${weekLabel}).

Write in Dr. Aria's voice — warm, thoughtful, and personal. This is a letter to ${userName}, not a clinical report about them.

Structure your letter in 4 parts:
1. A warm opening (1-2 sentences acknowledging the week and the person's presence in it)
2. What you noticed this week — the themes, the feelings, the shifts (3-4 sentences, specific, personal)
3. Something that stood out — a moment of courage, insight, or honest difficulty worth naming (2-3 sentences)
4. A gentle closing — what you're carrying forward into next week with them (1-2 sentences)

Tone: Warm. Honest. Human. Like a letter from someone who genuinely knows them.
Length: 200-300 words total.
Format: Flowing prose only. No headers. No bullet points. No clinical jargon.

Do NOT start with "Dear" — begin with their name or a direct opening line.
${profileSection}
${chapterSection}

THIS WEEK'S CONVERSATIONS:
${transcript}

Write the weekly reflection letter now:`;
};


// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the most recent Sunday at midnight UTC.
 */
const getMostRecentSunday = (date) => {
    const d    = new Date(date);
    const day  = d.getUTCDay();        // 0 = Sunday
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

const formatWeekLabel = (weekStart) => {
    return weekStart.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
};


module.exports = { generateWeeklyReport };

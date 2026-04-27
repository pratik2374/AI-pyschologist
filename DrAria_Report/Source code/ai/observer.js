// Silent Clinical Observer
// Runs asynchronously after each Dr. Aria response — NEVER blocks the user.
//
// Pipeline:
//   1. Analyzes the recent conversation with the 8B model → structured JSON
//   2. Saves an Observation document (clinical metadata, never raw words)
//   3. If crisis signals detected → saves CrisisFlag, updates profile risk level
//   4. If breakthrough detected → adds to profile episodic memory
//   5. Increments user.chunkCount, triggers profile synthesis every 5 chunks
//   6. Triggers chapter compression check (handled in chapterCompressor)
//
// This file must NEVER throw an uncaught error that surfaces to the user.
// Every error is caught internally and logged.

const User                = require('../models/User');
const Message             = require('../models/Message');
const Observation         = require('../models/Observation');
const CrisisFlag          = require('../models/CrisisFlag');
const LongitudinalProfile = require('../models/LongitudinalProfile');

const { runObserver }       = require('./groq');
const { synthesizeProfile } = require('./profileSynthesizer');
const { compressIfNeeded }  = require('./chapterCompressor');

// Run observer every N user messages (1 chunk = 1 observer run)
const OBSERVER_CHUNK_SIZE = 5;

// Trigger full profile synthesis every N observer chunks
const SYNTHESIS_INTERVAL = 5;


/**
 * Builds the observer prompt — instructs the 8B model to analyze the conversation
 * and return a strictly structured JSON object.
 *
 * The model is instructed with extreme clarity to avoid false positives
 * on crisis detection (the most dangerous class of error).
 *
 * @param {Array} messages — [{role: 'user'|'assistant', content: string}]
 * @returns {string}
 */
const buildObserverPrompt = (messages) => {
    const transcript = messages
        .map(m => `[${m.role === 'assistant' ? 'Dr. Aria' : 'User'}]: ${m.content}`)
        .join('\n\n');

    return `You are a silent clinical observer reviewing a therapy conversation. Your job is to produce a structured clinical analysis. Return ONLY a valid JSON object — no explanation, no markdown, no code fences.

CONVERSATION TO ANALYZE:
${transcript}

Return this exact JSON structure:
{
  "emotionalState": <integer 0-10. 0 = severe crisis, 5 = neutral, 10 = genuinely well>,
  "themes": [<1-4 short snake_case clinical themes actually present in conversation, e.g. "work_anxiety", "paternal_relationship", "self_worth", "grief">],
  "ideationFlags": [<ONLY populate if EXPLICITLY present and PERSONAL: "personal_suicidal_ideation", "self_harm_mention", "hopelessness_severe", "plan_disclosed">],
  "sessionQuality": "<exactly one of: opening_up, resistant, productive, repetitive, breakthrough, distressed, neutral>",
  "riskTrajectory": "<exactly one of: improving, stable, declining, acute, unknown>",
  "breakthroughMoment": <true ONLY if there was a clear first disclosure, significant realization, or notable emotional shift>,
  "breakthroughNote": "<1-sentence description if breakthroughMoment is true, otherwise null>",
  "therapyMode": "<dominant approach Dr. Aria used: cbt, humanistic, psychoanalytic, or none>",
  "crisisLevel": <integer: 0=none, 1=mild distress only, 2=passive ideation ("don't want to be here"), 3=active ideation (explicit desire to end life), 4=acute (has plan, timeline, or repeated level 3)>,
  "crisisSignalType": "<short label if crisisLevel > 0, e.g. passive_ideation or hopelessness or plan_disclosed. null if crisisLevel is 0>",
  "crisisContext": "<ONE clinical sentence if crisisLevel > 0. DO NOT quote the user's words. null if crisisLevel is 0>"
}

CRITICAL RULES FOR CRISIS DETECTION:
- "I want to kill him" / "I could kill her" = frustration idiom. crisisLevel 0. ideationFlags [].
- "I'm so done with everything" = general distress. crisisLevel 1 at most.
- "I don't want to be here anymore" = COULD be level 2 — read the full context carefully.
- "I've been thinking about ending my life" = level 3.
- "I have a plan to end my life" = level 4.
- When in doubt between levels, choose the LOWER level.
- ideationFlags must be EMPTY in the vast majority of conversations.
- crisisLevel 0 is correct for most therapy conversations.

Return ONLY the JSON object. Nothing before it, nothing after it.`;
};


/**
 * Runs the full observer pipeline for one conversation exchange.
 * Called async (not awaited) after the response streams to the user.
 *
 * @param {string|ObjectId} userId
 * @param {ObjectId}        userMessageId   — the user message just saved to DB
 * @param {ObjectId}        ariaMessageId   — the aria response just saved to DB
 * @param {Array}           recentMessages  — Groq-format messages [{role, content}]
 * @param {number}          newMessageCount — user.messageCount after increment
 */
const runObserverAsync = async (userId, userMessageId, ariaMessageId, recentMessages, newMessageCount) => {
    try {

        // ── Build and run the observer ────────────────────────────────────────────
        const observerPrompt = buildObserverPrompt(recentMessages);
        const observation    = await runObserver(observerPrompt);

        if (!observation) {
            console.error('[Observer] Model returned null or invalid JSON.');
            return;
        }

        // ── Increment user chunk count ────────────────────────────────────────────
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { chunkCount: 1 } },
            { new: true, select: 'chunkCount' }
        ).lean();

        const newChunkCount = updatedUser?.chunkCount || 1;

        // ── Save Observation document ─────────────────────────────────────────────
        await Observation.create({
            userId,
            chunkNumber:    newChunkCount,
            messageRange: {
                fromMessageId: userMessageId,
                toMessageId:   ariaMessageId
            },
            emotionalState:    sanitizeInt(observation.emotionalState, 0, 10, 5),
            themes:            Array.isArray(observation.themes) ? observation.themes.slice(0, 4) : [],
            ideationFlags:     Array.isArray(observation.ideationFlags) ? observation.ideationFlags : [],
            sessionQuality:    sanitizeEnum(observation.sessionQuality, VALID_SESSION_QUALITIES, 'neutral'),
            riskTrajectory:    sanitizeEnum(observation.riskTrajectory, VALID_RISK_TRAJECTORIES, 'unknown'),
            breakthroughMoment: observation.breakthroughMoment === true,
            breakthroughNote:  observation.breakthroughNote || null
        });

        // ── Update therapy mode on aria message ───────────────────────────────────
        const therapyMode = sanitizeEnum(observation.therapyMode, VALID_THERAPY_MODES, 'none');
        if (therapyMode !== 'none') {
            await Message.findByIdAndUpdate(ariaMessageId, { therapyMode });
        }

        // ── Handle crisis signals ─────────────────────────────────────────────────
        if (observation.crisisLevel > 0) {
            await handleCrisisSignal({ userId, userMessageId, observation });
        }

        // ── Handle breakthrough — add to episodic memory ──────────────────────────
        if (observation.breakthroughMoment && observation.breakthroughNote) {
            await LongitudinalProfile.findOneAndUpdate(
                { userId },
                {
                    $push: {
                        episodicMemory: {
                            date:         new Date(),
                            summary:      observation.breakthroughNote,
                            significance: observation.sessionQuality === 'breakthrough'
                                ? 'breakthrough'
                                : 'turning_point'
                        }
                    }
                },
                { upsert: true }
            );
        }

        // ── Trigger profile synthesis every SYNTHESIS_INTERVAL chunks ─────────────
        if (newChunkCount % SYNTHESIS_INTERVAL === 0) {
            synthesizeProfile(userId).catch(err =>
                console.error('[ProfileSynthesizer] Error:', err.message)
            );
        }

        // ── Trigger chapter compression check ────────────────────────────────────
        compressIfNeeded(userId).catch(err =>
            console.error('[ChapterCompressor] Error:', err.message)
        );

    } catch (err) {
        // Observer failure must NEVER surface to the user
        console.error('[Observer] Unhandled error:', err.message);
    }
};


// ── Crisis handler ─────────────────────────────────────────────────────────────

/**
 * Saves a CrisisFlag, updates profile risk level, marks user message as flagged.
 * Level 4: TODO — emergency contact notification (Phase 5).
 */
const handleCrisisSignal = async ({ userId, userMessageId, observation }) => {
    try {
        const level = sanitizeInt(observation.crisisLevel, 1, 4, 1);

        // Save crisis flag (silent audit trail — user never sees this)
        await CrisisFlag.create({
            userId,
            messageId:  userMessageId,
            level,
            context:    observation.crisisContext || `Level ${level} crisis signal detected.`,
            signalType: observation.crisisSignalType || 'unspecified'
        });

        // Mark the user message so context builder can detect it
        await Message.findByIdAndUpdate(userMessageId, { crisisDetected: true });

        // Map numeric level to risk string for profile
        const riskLevel = level <= 2 ? 'low' : level === 3 ? 'moderate' : 'high';

        // Update longitudinal profile
        await LongitudinalProfile.findOneAndUpdate(
            { userId },
            {
                currentRiskLevel: riskLevel,
                $push: {
                    riskHistory: {
                        level,
                        date:    new Date(),
                        context: observation.crisisContext || '',
                        resolved: false
                    }
                }
            },
            { upsert: true }
        );

        // TODO (Phase 5): Level 4 — send emergency contact notification via Resend

    } catch (err) {
        console.error('[Observer/CrisisHandler] Error:', err.message);
    }
};


// ── Sanitizer helpers ──────────────────────────────────────────────────────────

const sanitizeInt = (val, min, max, fallback) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < min || n > max) return fallback;
    return n;
};

const sanitizeEnum = (val, allowed, fallback) => {
    return allowed.includes(val) ? val : fallback;
};

const VALID_SESSION_QUALITIES = ['opening_up', 'resistant', 'productive', 'repetitive', 'breakthrough', 'distressed', 'neutral'];
const VALID_RISK_TRAJECTORIES = ['improving', 'stable', 'declining', 'acute', 'unknown'];
const VALID_THERAPY_MODES     = ['cbt', 'humanistic', 'psychoanalytic', 'none'];


module.exports = { runObserverAsync, OBSERVER_CHUNK_SIZE };

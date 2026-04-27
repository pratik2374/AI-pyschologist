// Master Prompt Assembler
// Builds the complete system prompt sent to Groq on every request.
//
// Structure:
//   1. Persona          — who Dr. Aria is
//   2. Clinical library — CBT, psychoanalytic, humanistic, crisis, research
//   3. Rules            — how she speaks and behaves
//   4. Memory context   — injected dynamically per user (profile, chapters, report)
//   5. Gap/crisis hint  — injected if returning user has a gap or crisis history
//
// The base prompt (sections 1–3) is fixed and cached.
// Sections 4–5 are assembled fresh per request from the user's data.

const { PERSONA }        = require('./sections/persona');
const { RULES }          = require('./sections/rules');
const { CBT }            = require('./sections/cbt');
const { PSYCHOANALYTIC } = require('./sections/psychoanalytic');
const { HUMANISTIC }     = require('./sections/humanistic');
const { RESEARCH }       = require('./sections/research');
const { CULTURAL }       = require('./sections/cultural');
const { EMOTIONS }       = require('./sections/emotions');
const { CRISIS }         = require('./sections/crisis');


// ─── Base prompt — fixed, assembled once ──────────────────────────────────────
// This is the unchanging foundation of Dr. Aria's identity and knowledge.
// Cache this string — do not re-assemble it on every request.
//
// ORDER MATTERS for LLM attention:
//   • PERSONA + RULES first  → highest weight, sets character and constraints
//   • Knowledge library middle → clinical depth
//   • CRISIS last             → highest recency weight, always fresh for safety

const BASE_PROMPT = [
    PERSONA,        // 1. Who she is — identity, voice, memory
    RULES,          // 2. How she speaks — constraints, tone, edge cases (moved up)
    CBT,            // 3. Cognitive behavioral knowledge
    PSYCHOANALYTIC, // 4. Psychoanalytic / psychodynamic knowledge
    HUMANISTIC,     // 5. Humanistic / existential knowledge
    RESEARCH,       // 6. Evidence-based clinical principles + stages of change
    CULTURAL,       // 7. India-specific cultural fluency (new)
    EMOTIONS,       // 8. Specific emotion handling — anger, shame, guilt, etc. (new)
    CRISIS          // 9. Crisis handling — always last, highest recency weight
].join('\n\n---\n\n').trim();


/**
 * Builds the complete system prompt for a single Groq request.
 *
 * @param {Object} options
 * @param {Object|null} options.profile         — LongitudinalProfile document (or null if new user)
 * @param {Array}       options.chapterSummaries — Array of ChapterSummary documents (recent chapters)
 * @param {Object|null} options.weeklyReport     — Latest WeeklyReport.contextSummary (or null)
 * @param {string|null} options.gapInstruction   — From openers.gapContextInstruction()
 * @param {string|null} options.crisisInstruction — From openers.postCrisisContextInstruction()
 *
 * @returns {string} The complete system prompt to pass as the system message to Groq
 */
const buildSystemPrompt = ({
    profile          = null,
    chapterSummaries = [],
    weeklyReport     = null,
    gapInstruction   = null,
    crisisInstruction = null
} = {}) => {

    const parts = [BASE_PROMPT];

    // ── Memory context ─────────────────────────────────────────────────────────
    // Injected after the base prompt so it has the highest recency weight.
    // Written in a way Dr. Aria can reference naturally mid-conversation.

    if (profile) {
        const profileBlock = buildProfileBlock(profile);
        if (profileBlock) {
            parts.push(`---\n\nWHAT YOU KNOW ABOUT THIS PERSON:\n\n${profileBlock}`);
        }
    }

    if (chapterSummaries.length > 0) {
        const chaptersBlock = chapterSummaries
            .map(ch => `Chapter ${ch.chapterNumber} (${formatDateRange(ch.messageRange)}):\n${ch.summary}`)
            .join('\n\n');
        parts.push(`---\n\nCONVERSATION HISTORY — EARLIER CHAPTERS:\n\n${chaptersBlock}`);
    }

    if (weeklyReport) {
        parts.push(`---\n\nTHIS WEEK IN REVIEW (from your recent observations):\n\n${weeklyReport}`);
    }

    // ── Situational instructions ───────────────────────────────────────────────
    if (crisisInstruction) {
        parts.push(`---\n\nIMPORTANT — CRISIS CONTEXT:\n\n${crisisInstruction}`);
    }

    if (gapInstruction) {
        parts.push(`---\n\nRETURNING USER — GAP CONTEXT:\n\n${gapInstruction}`);
    }

    return parts.join('\n\n').trim();
};


/**
 * Formats the LongitudinalProfile into a compact, readable block
 * that Dr. Aria can draw on naturally in conversation.
 *
 * @param {Object} profile — LongitudinalProfile document
 * @returns {string}
 */
const buildProfileBlock = (profile) => {
    const lines = [];

    if (profile.recurringThemes?.length > 0) {
        lines.push(`Recurring themes: ${profile.recurringThemes.join(', ')}.`);
    }

    if (profile.attachmentStyle) {
        lines.push(`Attachment style: ${profile.attachmentStyle}.`);
    }

    if (profile.communicationStyle) {
        lines.push(`Communication style: ${profile.communicationStyle}`);
    }

    if (profile.whatWorks) {
        lines.push(`What works: ${profile.whatWorks}`);
    }

    if (profile.whatDoesntWork) {
        lines.push(`What to avoid: ${profile.whatDoesntWork}`);
    }

    if (profile.progressMarkers?.length > 0) {
        lines.push(`Progress markers: ${profile.progressMarkers.join(' | ')}`);
    }

    if (profile.episodicMemory?.length > 0) {
        const memories = profile.episodicMemory
            .slice(-5)   // Most recent 5 significant moments
            .map(m => `[${formatDate(m.date)}] ${m.summary} (${m.significance})`)
            .join('\n');
        lines.push(`Significant moments:\n${memories}`);
    }

    if (profile.currentRiskLevel && profile.currentRiskLevel !== 'none') {
        lines.push(`Current risk level: ${profile.currentRiskLevel}. Carry this awareness.`);
    }

    return lines.join('\n');
};


// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (date) => {
    if (!date) return 'unknown date';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

const formatDateRange = (messageRange) => {
    if (!messageRange?.fromDate) return '';
    const from = formatDate(messageRange.fromDate);
    const to   = formatDate(messageRange.toDate);
    return from === to ? from : `${from} – ${to}`;
};


module.exports = {
    BASE_PROMPT,
    buildSystemPrompt,
    buildProfileBlock
};

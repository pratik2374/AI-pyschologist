// Longitudinal Profile Synthesizer
// Triggered every SYNTHESIS_INTERVAL observer chunks (default: every 5).
//
// Reads the most recent OBSERVATION_WINDOW observations for the user,
// passes them (along with the existing profile state) to the 70B model,
// and updates the LongitudinalProfile document with the model's synthesis.
//
// This is what gives Dr. Aria her deep, evolving knowledge of each person.
// It runs async — never blocks the user.

const Observation         = require('../models/Observation');
const LongitudinalProfile = require('../models/LongitudinalProfile');
const { runProfileSynthesis } = require('./groq');

// How many recent observations to include in each synthesis run
const OBSERVATION_WINDOW = 10;


/**
 * Synthesizes (or updates) the user's longitudinal profile.
 * Called every SYNTHESIS_INTERVAL chunks — async, never blocks the user.
 *
 * @param {string|ObjectId} userId
 */
const synthesizeProfile = async (userId) => {
    try {
        // Fetch recent observations in chronological order
        const observations = await Observation
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(OBSERVATION_WINDOW)
            .lean()
            .then(obs => obs.reverse());

        if (observations.length === 0) return;

        // Fetch existing profile (may not exist yet — that's fine)
        const existingProfile = await LongitudinalProfile.findOne({ userId }).lean();

        // Build synthesis prompt
        const synthesisPrompt = buildSynthesisPrompt(observations, existingProfile);

        // Run synthesis via 70B model
        const updates = await runProfileSynthesis(synthesisPrompt);

        if (!updates || typeof updates !== 'object') return;

        // Build the MongoDB update — only apply fields the model actually returned
        const profileUpdate = {
            synthesisCount:    (existingProfile?.synthesisCount || 0) + 1,
            lastSynthesizedAt: new Date()
        };

        if (Array.isArray(updates.recurringThemes) && updates.recurringThemes.length > 0) {
            profileUpdate.recurringThemes = updates.recurringThemes.slice(0, 8);
        }

        if (updates.whatWorks && typeof updates.whatWorks === 'string') {
            profileUpdate.whatWorks = updates.whatWorks.slice(0, 500);
        }

        if (updates.whatDoesntWork && typeof updates.whatDoesntWork === 'string') {
            profileUpdate.whatDoesntWork = updates.whatDoesntWork.slice(0, 500);
        }

        if (updates.attachmentStyle && typeof updates.attachmentStyle === 'string') {
            const validStyles = ['secure', 'anxious-preoccupied', 'dismissive-avoidant', 'disorganized-fearful'];
            if (validStyles.includes(updates.attachmentStyle)) {
                profileUpdate.attachmentStyle = updates.attachmentStyle;
            }
        }

        if (updates.communicationStyle && typeof updates.communicationStyle === 'string') {
            profileUpdate.communicationStyle = updates.communicationStyle.slice(0, 500);
        }

        if (Array.isArray(updates.progressMarkers) && updates.progressMarkers.length > 0) {
            // Merge with existing — append new ones, keep all existing
            const existing = existingProfile?.progressMarkers || [];
            const newMarkers = updates.progressMarkers.filter(m => !existing.includes(m));
            if (newMarkers.length > 0) {
                profileUpdate.progressMarkers = [...existing, ...newMarkers].slice(-20); // cap at 20
            }
        }

        await LongitudinalProfile.findOneAndUpdate(
            { userId },
            { $set: profileUpdate },
            { upsert: true, new: true }
        );

    } catch (err) {
        console.error('[ProfileSynthesizer] Error:', err.message);
    }
};


// ── Prompt builder ─────────────────────────────────────────────────────────────

/**
 * Builds the synthesis prompt.
 * Gives the 70B model the recent observation data and the existing profile state,
 * asks it to return a JSON update.
 */
const buildSynthesisPrompt = (observations, existingProfile) => {

    const obsText = observations.map((obs, i) =>
        `[Chunk ${obs.chunkNumber}]
Emotional state: ${obs.emotionalState}/10
Session quality: ${obs.sessionQuality}
Risk trajectory: ${obs.riskTrajectory}
Themes present: ${obs.themes.join(', ') || 'none recorded'}
Ideation flags: ${obs.ideationFlags.length > 0 ? obs.ideationFlags.join(', ') : 'none'}
Breakthrough: ${obs.breakthroughMoment ? obs.breakthroughNote : 'none'}`
    ).join('\n\n');

    const existingText = existingProfile
        ? `EXISTING PROFILE (synthesized ${existingProfile.synthesisCount || 0} time(s)):
Recurring themes: ${existingProfile.recurringThemes?.join(', ') || 'not yet identified'}
Attachment style: ${existingProfile.attachmentStyle || 'not yet identified'}
Communication style: ${existingProfile.communicationStyle || 'not yet identified'}
What works: ${existingProfile.whatWorks || 'not yet identified'}
What doesn't work: ${existingProfile.whatDoesntWork || 'not yet identified'}
Progress markers: ${existingProfile.progressMarkers?.join(' | ') || 'none yet'}`
        : 'EXISTING PROFILE: This is the first synthesis — no prior profile exists.';

    return `You are a senior clinical psychologist maintaining a longitudinal therapy profile for a patient you have been treating over time.

Based on the recent clinical observations below, update the patient's profile. Look for patterns across observations, not just the most recent one.

${existingText}

RECENT OBSERVATIONS (${observations.length} chunks):
${obsText}

Return ONLY a valid JSON object with these fields (use null for any field you cannot confidently determine from the data):
{
  "recurringThemes": [<2-6 snake_case themes that genuinely recur, e.g. "paternal_relationship", "work_anxiety", "self_worth", "fear_of_abandonment">],
  "attachmentStyle": "<one of: secure, anxious-preoccupied, dismissive-avoidant, disorganized-fearful — or null if unclear>",
  "communicationStyle": "<1-2 sentences on how this person communicates: do they deflect, intellectualize, open slowly, use humor, etc.>",
  "whatWorks": "<1-2 sentences on therapeutic approaches that are clearly landing — what produces engagement, insight, or movement>",
  "whatDoesntWork": "<1-2 sentences on what shuts this person down, produces resistance, or should be avoided>",
  "progressMarkers": [<new observable progress notes not already in the existing profile, e.g. "First acknowledged anxiety without dismissing it (Chunk 8)">]
}

Rules:
- Base your synthesis on PATTERNS across multiple observations, not one data point.
- If you see only 1-2 observations, be conservative — use null for uncertain fields.
- Progress markers should describe SPECIFIC, observable changes, not generalities.
- Return ONLY the JSON. Nothing before it, nothing after it.`;
};


module.exports = { synthesizeProfile };

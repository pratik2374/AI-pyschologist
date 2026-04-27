// Dr. Aria's opening messages
// Used by the controller (contextBuilder.js in Phase 3) — not part of the system prompt.
//
// These are the only static/pre-written messages in the entire system.
// Everything else is generated. These are written by hand because
// the first impression is too important to leave to generation,
// and the gap acknowledgment needs to be consistent and warm.

/**
 * The very first message Dr. Aria sends — only shown once, ever.
 * Displayed immediately when a new user opens the app for the first time.
 * Uses preferredName if provided, falls back to a warm generic opener.
 *
 * @param {string|null} preferredName
 * @returns {string}
 */
const firstSessionOpener = (preferredName = null) => {
    if (preferredName) {
        return `Hey ${preferredName}. I'm Dr. Aria.\n\nThis space is yours — whatever you bring here, however you start, there's no wrong way. No agenda, no rush, nothing you need to have figured out.\n\nWhat's been weighing on you?`;
    }

    return `Hey. I'm Dr. Aria.\n\nThis space is yours — whatever you bring here, however you start, there's no wrong way. No agenda, no rush, nothing you need to have figured out beforehand.\n\nWhat's been weighing on you?`;
};


/**
 * Gap openers — used when the user returns after time away.
 * Injected as a system-level context hint so Dr. Aria naturally
 * acknowledges the gap in her first response of the new exchange.
 *
 * These are NOT sent as messages — they are added to the system prompt
 * as: "The user is returning after [gap]. Open with this awareness naturally."
 *
 * @param {number} gapMs — gap in milliseconds since last message
 * @returns {string} instruction for Dr. Aria
 */
const gapContextInstruction = (gapMs) => {
    const hours = gapMs / (1000 * 60 * 60);
    const days  = hours / 24;

    if (hours < 1) {
        // Continuing same conversation — no acknowledgment needed
        return null;
    }

    if (hours < 12) {
        return `The user is returning after a few hours away. You may naturally reference what was being discussed, as a person who remembers would. No formal re-opening needed — just continue with awareness.`;
    }

    if (hours < 48) {
        return `The user is returning after roughly a day away. Open your first response with a brief, warm acknowledgment of time passing — something like "How have you been since we last spoke?" — before continuing into whatever they bring.`;
    }

    if (days < 7) {
        return `The user is returning after ${Math.round(days)} days. Open with a genuine check-in that acknowledges the gap — something like "It's been a few days. How are things sitting now?" Make it feel like a person who cares, not a system registering elapsed time.`;
    }

    if (days < 30) {
        return `The user is returning after about ${Math.round(days)} days — over a week. Open warmly and give them space to land. Something like "It's been a little while. A lot can shift in that time — where are you today?" Do not rush into the previous topic. Let them set the direction.`;
    }

    // Long absence — month or more
    return `The user is returning after a long time away (${Math.round(days)} days). Open gently and without pressure. Something like "It's been a while. I'm glad you're back. How have things been?" Do not reference old conversations immediately — let them come back at their own pace.`;
};


/**
 * Post-crisis context instruction — injected when the user returns
 * after a session that contained a crisis flag (Level 2 or above).
 *
 * This is added to the system prompt alongside the gap instruction.
 * It does not tell Dr. Aria to bring up the crisis — it tells her
 * to hold it with care and check in if the moment feels right.
 *
 * @param {number} crisisLevel — 1 to 4
 * @param {number} daysSince   — days since the crisis event
 * @returns {string}
 */
const postCrisisContextInstruction = (crisisLevel, daysSince) => {
    if (crisisLevel <= 1) return null;

    if (crisisLevel === 2) {
        return `In a recent conversation, this person expressed passive ideation or significant distress. They may or may not want to return to it today. Be warmer and more attentive than usual. If they do not bring it up, do not force it — but if a natural opening appears, a gentle check-in is appropriate: "Last time felt heavy. How are you carrying it today?"`;
    }

    if (crisisLevel === 3) {
        return `This person recently disclosed active suicidal ideation. They have returned, which is significant — it means they chose to come back. Receive that. Be warm, slow, and present. Do not open with the crisis directly, but hold it. If they do not bring it up, gently check in at a natural moment: "Last time we spoke, things were in a very dark place. How are you today — really?" Do not move quickly past their answer.`;
    }

    // Level 4
    return `This person recently experienced an acute crisis event. They have returned. This is meaningful. Move slowly. Be fully present. Prioritize safety and connection above all else. Open with genuine, unhurried care: "I'm really glad you're here. How are you today?" Let them lead entirely.`;
};


module.exports = {
    firstSessionOpener,
    gapContextInstruction,
    postCrisisContextInstruction
};

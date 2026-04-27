const mongoose = require("mongoose");

// Logged silently by the observer when it detects a crisis signal in the conversation.
// NOT visible to the user — purely internal clinical tracking.
// Dr. Aria is NOT cut off. This record informs her longitudinal awareness.

const crisisFlagSchema = new mongoose.Schema(
    {
        // ─── Ownership ─────────────────────────────────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // The specific message that triggered this flag
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            required: true
        },

        // ─── Risk level ────────────────────────────────────────────────────────
        // 1 = Mild distress      — emotional heaviness, hopelessness
        // 2 = Moderate risk      — passive ideation, "don't want to be here"
        // 3 = Active ideation    — expressed desire to end life
        // 4 = Imminent / acute   — plan, timeline, or repeated Level 3 in same session
        level: {
            type: Number,
            enum: [1, 2, 3, 4],
            required: true
        },

        // ─── Context ───────────────────────────────────────────────────────────
        // Brief clinical note written by the observer — NOT the raw user message.
        // e.g. "User expressed passive suicidal ideation in context of relationship breakdown."
        context: {
            type: String,
            required: true
        },

        // The specific signal type that was detected
        // e.g. "personal_suicidal_ideation", "self_harm_mention", "hopelessness", "plan_disclosed"
        signalType: {
            type: String,
            required: true
        },

        // ─── Resolution ────────────────────────────────────────────────────────
        // Set to true manually or by a future resolution check
        resolved: {
            type: Boolean,
            default: false
        },

        resolvedAt: {
            type: Date,
            default: null
        },

        // ─── Emergency contact notification ────────────────────────────────────
        // True if an email was sent to the user's emergency contact (Level 4 only, opt-in)
        emergencyContactNotified: {
            type: Boolean,
            default: false
        },

        emergencyContactNotifiedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
crisisFlagSchema.index({ userId: 1, createdAt: -1 });
crisisFlagSchema.index({ userId: 1, level: 1 });
crisisFlagSchema.index({ resolved: 1 });   // For future admin dashboard queries

module.exports = mongoose.model("CrisisFlag", crisisFlagSchema, "crisis_flags");

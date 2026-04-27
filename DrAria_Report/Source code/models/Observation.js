const mongoose = require("mongoose");

// Generated async by the silent observer after every ~10 message exchanges.
// Contains derived clinical insights — never the user's raw words.
// Stored for ALL users regardless of encryption mode.

const observationSchema = new mongoose.Schema(
    {
        // ─── Ownership ─────────────────────────────────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Sequential counter — increments every time a chunk is processed.
        // Used to group observations for longitudinal synthesis.
        chunkNumber: {
            type: Number,
            required: true
        },

        // Message IDs that this observation covers
        messageRange: {
            fromMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
            toMessageId:   { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
        },

        // ─── Emotional state ───────────────────────────────────────────────────
        // 0 = severe distress, 10 = thriving
        emotionalState: {
            type: Number,
            min: 0,
            max: 10
        },

        // ─── Thematic content ──────────────────────────────────────────────────
        // e.g. ["work_stress", "paternal_relationship", "self_worth"]
        themes: {
            type: [String],
            default: []
        },

        // ─── Risk signals ──────────────────────────────────────────────────────
        // Populated only when present — empty array means no flags.
        // e.g. ["personal_suicidal_ideation", "self_harm_mention"]
        // Distinguished from: ["grief_about_others", "academic_mention"] — not flags
        ideationFlags: {
            type: [String],
            default: []
        },

        // ─── Session quality ───────────────────────────────────────────────────
        sessionQuality: {
            type: String,
            enum: [
                "opening_up",   // person is sharing more than before
                "resistant",    // person is deflecting or avoiding
                "productive",   // good exploration happening
                "repetitive",   // same ground being covered again
                "breakthrough", // significant realization or shift
                "distressed",   // person is in acute emotional pain
                "neutral"       // no strong signal
            ],
            default: "neutral"
        },

        // ─── Risk trajectory ───────────────────────────────────────────────────
        // Direction of travel compared to previous observation
        riskTrajectory: {
            type: String,
            enum: ["improving", "stable", "declining", "acute", "unknown"],
            default: "unknown"
        },

        // True if a significant moment happened — stored in episodic memory
        breakthroughMoment: {
            type: Boolean,
            default: false
        },

        // Brief description of the breakthrough (if any) — used to populate episodic memory
        breakthroughNote: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
observationSchema.index({ userId: 1, createdAt: -1 });
observationSchema.index({ userId: 1, chunkNumber: 1 });

module.exports = mongoose.model("Observation", observationSchema, "observations");

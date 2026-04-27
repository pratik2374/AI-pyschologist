const mongoose = require("mongoose");

// One document per user — the living profile of who this person is.
// Synthesized from observations every 5 conversation chunks.
// Injected at the start of every session so Dr. Aria always knows this person deeply.

const longitudinalProfileSchema = new mongoose.Schema(
    {
        // ─── Ownership — one profile per user ──────────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        // ─── Recurring themes ──────────────────────────────────────────────────
        // Topics that keep coming up across sessions
        // e.g. ["paternal approval", "work anxiety", "fear of failure"]
        recurringThemes: {
            type: [String],
            default: []
        },

        // ─── What works for this person ────────────────────────────────────────
        // Free-form clinical note on effective approaches
        // e.g. "Responds well to Socratic questioning. Resistant to direct advice.
        //       Humanistic approach builds most trust. CBT works once rapport is established."
        whatWorks: {
            type: String,
            default: null
        },

        // e.g. "Does not respond to reframing early in session. Shuts down if pushed on family."
        whatDoesntWork: {
            type: String,
            default: null
        },

        // ─── Attachment & communication style ─────────────────────────────────
        // e.g. "anxious-preoccupied", "avoidant", "secure", "disorganized"
        attachmentStyle: {
            type: String,
            default: null
        },

        // e.g. "Uses humor to deflect from pain. Opens up gradually. Prefers questions to statements."
        communicationStyle: {
            type: String,
            default: null
        },

        // ─── Progress markers ──────────────────────────────────────────────────
        // Observable signs of growth or change over time
        // e.g. ["First acknowledged anxiety without dismissing it (Week 3)",
        //       "Connected work stress to childhood pattern (Week 7)"]
        progressMarkers: {
            type: [String],
            default: []
        },

        // ─── Episodic memory ───────────────────────────────────────────────────
        // Key moments Dr. Aria should be able to reference naturally
        episodicMemory: [
            {
                date:        { type: Date },
                summary:     { type: String },  // e.g. "Cried for the first time. Discussed father's death."
                significance: { type: String }  // e.g. "breakthrough", "crisis", "turning_point", "first_disclosure"
            }
        ],

        // ─── Risk state ────────────────────────────────────────────────────────
        currentRiskLevel: {
            type: String,
            enum: ["none", "low", "moderate", "high"],
            default: "none"
        },

        // Historical record of crisis events
        riskHistory: [
            {
                level:     { type: Number },  // 1–4
                date:      { type: Date },
                context:   { type: String },  // Brief clinical note, not raw message
                resolved:  { type: Boolean, default: false }
            }
        ],

        // ─── Synthesis metadata ────────────────────────────────────────────────
        // How many times this profile has been synthesized
        synthesisCount: {
            type: Number,
            default: 0
        },

        lastSynthesizedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// Note: userId uniqueness is declared in the field definition above (unique: true)
// so we do not repeat it here to avoid Mongoose duplicate-index warnings.

module.exports = mongoose.model("LongitudinalProfile", longitudinalProfileSchema, "longitudinal_profiles");

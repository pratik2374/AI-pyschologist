const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        // ─── Ownership ─────────────────────────────────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // ─── Content ───────────────────────────────────────────────────────────
        // "user" = message from the person, "aria" = response from Dr. Aria
        role: {
            type: String,
            enum: ["user", "aria"],
            required: true
        },

        // Stored encrypted (AES-256-GCM) for Mode A users.
        // For Mode B users this field holds the ciphertext the server cannot decrypt.
        content: {
            type: String,
            required: true
        },

        // ─── Conversation continuity ───────────────────────────────────────────
        // Time in milliseconds since the user's previous message.
        // Used by Dr. Aria to decide whether to acknowledge a gap.
        // Null for the very first message.
        gapDuration: {
            type: Number,
            default: null
        },

        // ─── Memory / compression state ────────────────────────────────────────
        // True once this message has been compressed into a ChapterSummary.
        // Archived messages are no longer loaded verbatim into the context window.
        isArchived: {
            type: Boolean,
            default: false
        },

        // Which chapter this message belongs to after archiving.
        // Null until archived.
        chapterNumber: {
            type: Number,
            default: null
        },

        // ─── Clinical metadata (set by observer async after each response) ─────
        // The therapy approach Dr. Aria was using for this exchange.
        therapyMode: {
            type: String,
            enum: ["cbt", "humanistic", "psychoanalytic", "none"],
            default: "none"
        },

        // Flagged true if the observer detected a crisis signal in this exchange.
        crisisDetected: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// Primary query: fetch all messages for a user ordered by time
messageSchema.index({ userId: 1, createdAt: 1 });

// Fetch only unarchived (verbatim) messages for context window
messageSchema.index({ userId: 1, isArchived: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema, "messages");

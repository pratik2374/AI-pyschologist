const mongoose = require("mongoose");

// A compressed summary of a block of ~50 messages.
// Created automatically when messageCount crosses a threshold.
// Replaces verbatim messages in Dr. Aria's context window for older history.
// Stored encrypted for Mode A users.

const chapterSummarySchema = new mongoose.Schema(
    {
        // ─── Ownership ─────────────────────────────────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Sequential — Chapter 1, Chapter 2, etc.
        // Dr. Aria can reference: "When you first came here (Chapter 1)..."
        chapterNumber: {
            type: Number,
            required: true
        },

        // ─── Content ───────────────────────────────────────────────────────────
        // The compressed narrative summary of this block of messages.
        // Written in third-person clinical style for context injection.
        // Encrypted for Mode A users.
        summary: {
            type: String,
            required: true
        },

        // ─── Source range ──────────────────────────────────────────────────────
        messageRange: {
            fromMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
            toMessageId:   { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
            fromDate:      { type: Date },
            toDate:        { type: Date },
            messageCount:  { type: Number }
        },

        // ─── Quick-reference metadata (unencrypted even for Mode A) ────────────
        // Used to quickly scan what a chapter is about without decrypting the summary
        keyThemes: {
            type: [String],
            default: []
        },

        dominantEmotion: {
            type: String
        },

        hadCrisisEvent: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
chapterSummarySchema.index({ userId: 1, chapterNumber: 1 });

module.exports = mongoose.model("ChapterSummary", chapterSummarySchema, "chapter_summaries");

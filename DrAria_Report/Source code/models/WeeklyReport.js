const mongoose = require("mongoose");

// Generated every Sunday for opted-in (Mode A) users.
// A clinical-style summary of the past 7 days, written in Dr. Aria's voice.
// Emailed via Resend, also injected into Dr. Aria's context at the start of the next session.

const weeklyReportSchema = new mongoose.Schema(
    {
        // ─── Ownership ─────────────────────────────────────────────────────────
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // The Sunday that starts this report's week
        // Used for deduplication — one report per user per week
        weekOf: {
            type: Date,
            required: true
        },

        // ─── Content ───────────────────────────────────────────────────────────
        // The full HTML report content — encrypted for Mode A users
        reportContent: {
            type: String,
            required: true
        },

        // A short plaintext summary (2–3 sentences) used for context injection
        // into Dr. Aria's system prompt at the start of the next session.
        // Not encrypted — it's a high-level summary, not raw content.
        contextSummary: {
            type: String,
            default: null
        },

        // ─── Delivery ──────────────────────────────────────────────────────────
        emailSent: {
            type: Boolean,
            default: false
        },

        emailedAt: {
            type: Date,
            default: null
        },

        // Resend message ID for delivery tracking
        resendMessageId: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
weeklyReportSchema.index({ userId: 1, weekOf: -1 });

// Unique constraint: one report per user per week
weeklyReportSchema.index({ userId: 1, weekOf: 1 }, { unique: true });

module.exports = mongoose.model("WeeklyReport", weeklyReportSchema, "weekly_reports");

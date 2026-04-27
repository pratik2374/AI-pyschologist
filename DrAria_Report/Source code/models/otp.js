const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    // Stored as String — otpGenerator returns a string and we compare as strings.
    // Using Number caused silent coercion bugs with leading-zero OTPs.
    otp: {
        type:     String,
        required: true
    },

    email: {
        type:     String,
        required: true
    },

    // TTL index — MongoDB auto-deletes this document after 10 minutes.
    // Default is Date.now (no parentheses) — evaluated per-document, not at schema compile time.
    createdAt: {
        type:    Date,
        default: Date.now,
        expires: 10 * 60    // 600 seconds
    }
});

module.exports = mongoose.model("OTP", otpSchema);

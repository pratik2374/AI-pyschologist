const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // ─── Core identity ─────────────────────────────────────────────────────
        name: {
            type: String,
            required: true,
            trim: true
        },

        // What Dr. Aria calls them — can be different from legal name
        preferredName: {
            type: String,
            trim: true
        },

        age: {
            type: Number
        },

        city: {
            type: String,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            required: true,
            enum: ["Admin", "Visitor"],
            default: "Visitor"
        },

        // ─── Encryption & privacy ──────────────────────────────────────────────
        // A = server holds encryption key (reports + observer enabled)
        // B = client holds key (zero knowledge, no reports, no raw message access)
        encryptionMode: {
            type: String,
            enum: ["A", "B"],
            default: "A"
        },

        reportOptIn: {
            type: Boolean,
            default: false   // Explicit opt-in required — never default to true
        },

        // ─── Emergency contact ─────────────────────────────────────────────────
        // Stored as a single AES-256-GCM encrypted JSON blob (Mode A).
        // Format when encrypted: encrypt(JSON.stringify({name, phone, email}), userKey)
        // Mode B users: null — they control their own data entirely.
        emergencyContactEncrypted: {
            type: String,
            default: null
        },

        // ─── Conversation state ────────────────────────────────────────────────
        // True until the user sends their first message
        // Used to show the static first-time opening message from Dr. Aria
        firstSession: {
            type: Boolean,
            default: true
        },

        // Timestamp of last message — used to calculate gap duration for Dr. Aria's opener
        lastSeenAt: {
            type: Date
        },

        // Total messages sent — used to trigger chapter compression (every 50)
        messageCount: {
            type: Number,
            default: 0
        },

        // How many conversation chunks have been processed by the observer
        // Used to trigger longitudinal profile synthesis (every 5 chunks)
        chunkCount: {
            type: Number,
            default: 0
        },

        // ─── Encryption ───────────────────────────────────────────────────────────
        // Per-user AES-256-GCM key, encrypted with the server master key (ENCRYPTION_MASTER_KEY).
        // Generated on signup for Mode A users.
        // Mode B: null — the client holds its own key, server never sees it.
        encryptionKeyEncrypted: {
            type: String,
            default: null
        },

        // ─── Password reset ────────────────────────────────────────────────────
        resetPasswordToken: {
            type: String
        },

        resetPasswordExpiry: {
            type: Date
        }
    },
    { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
// Note: email uniqueness is declared in the field definition above (unique: true)
// so we do not repeat it here to avoid Mongoose duplicate-index warnings.
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);

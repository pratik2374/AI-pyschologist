const User      = require("../models/User");
const OTP       = require("../models/otp");
const bcrypt    = require("bcrypt");
const jwt       = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const { sendmail } = require("../utils/mailsender");
const { generateUserKey, encryptUserKey, isMasterKeyConfigured } = require("../utils/encryption");

// ─── Shared constants ──────────────────────────────────────────────────────────
const JWT_EXPIRY     = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;   // 7 days in ms
const ONE_DAY_MS     = 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;

const cookieOptions = {
    expires:  new Date(Date.now() + COOKIE_MAX_AGE),
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
};

// Fields stripped from every user response — never sent to client
const SENSITIVE_FIELDS = '-password -resetPasswordToken -resetPasswordExpiry -encryptionKeyEncrypted -emergencyContactEncrypted';


// ─── Generate OTP ──────────────────────────────────────────────────────────────
exports.generateOTP = async (req, res) => {
    try {
        const email = req.body?.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email address is required" });
        }

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars:       false
        });

        await OTP.create({ otp, email });

        await sendmail(
            email,
            "Your Dr. Aria sign-up code",
            `<p style="font-family:sans-serif;font-size:16px;color:#1a1a2e">
                Your one-time code is:<br/><br/>
                <strong style="font-size:32px;letter-spacing:0.15em">${otp}</strong><br/><br/>
                This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
             </p>`
        );

        return res.status(200).json({ success: true, message: "OTP sent successfully" });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Error sending OTP" });
    }
};


// ─── Signup ────────────────────────────────────────────────────────────────────
exports.signup = async (req, res) => {
    try {
        const {
            name,
            preferredName,
            email: rawEmail,
            password,
            otp,
            encryptionMode   // Optional — defaults to 'A'. User may choose 'B' at signup.
        } = req.body;

        const email = rawEmail?.trim().toLowerCase();

        // ── Required field validation ──────────────────────────────────────────
        if (!name || !email || !password || !otp) {
            return res.status(400).json({
                success: false,
                message: "name, email, password, and otp are required"
            });
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
            });
        }

        // ── OTP verification ───────────────────────────────────────────────────
        // OTP is stored as a string — compare with string coercion on both sides
        const recentOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!recentOTP) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired. Please request a new one."
            });
        }

        if (String(recentOTP.otp) !== String(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // ── Duplicate account check ────────────────────────────────────────────
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        // ── Encryption key (Mode A only) ───────────────────────────────────────
        const mode = encryptionMode === 'B' ? 'B' : 'A';   // default to A; only accept A or B
        let encryptionKeyEncrypted = null;

        if (mode === 'A' && isMasterKeyConfigured()) {
            const userKey = generateUserKey();
            encryptionKeyEncrypted = encryptUserKey(userKey);
        }

        // ── Create user ────────────────────────────────────────────────────────
        // role is ALWAYS 'Visitor' — never trust the client-supplied role.
        // Admin accounts are created directly in the database by operators.
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name:          name.trim(),
            preferredName: preferredName?.trim() || undefined,
            email,
            password:      hashedPassword,
            role:          'Visitor',
            encryptionMode: mode,
            encryptionKeyEncrypted
        });

        // ── Delete used OTP ────────────────────────────────────────────────────
        await OTP.deleteMany({ email });

        // ── Issue JWT ──────────────────────────────────────────────────────────
        const token = jwt.sign(
            { role: user.role, userid: user._id, email: user.email },
            process.env.SECRET_KEY,
            { expiresIn: JWT_EXPIRY }
        );

        // Strip sensitive fields before returning user object
        const userObj = await User.findById(user._id).select(SENSITIVE_FIELDS).lean();

        return res.status(201).cookie("token", token, cookieOptions).json({
            success: true,
            message: "Account created successfully",
            user:    userObj
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Error creating account" });
    }
};


// ─── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const email    = req.body?.email?.trim().toLowerCase();
        const password = req.body?.password;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });

        // Generic message — never reveal whether the email exists
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { role: user.role, userid: user._id, email: user.email },
            process.env.SECRET_KEY,
            { expiresIn: JWT_EXPIRY }
        );

        const userObj = await User.findById(user._id).select(SENSITIVE_FIELDS).lean();

        return res.status(200).cookie("token", token, cookieOptions).json({
            success: true,
            message: "Logged in successfully",
            user:    userObj
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Error logging in" });
    }
};


// ─── Logout ────────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
    return res.status(200).cookie("token", "", {
        expires:  new Date(0),
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
    }).json({ success: true, message: "Logged out successfully" });
};


// ─── Me (get current user) ─────────────────────────────────────────────────────
/**
 * GET /auth/me
 * Returns the current authenticated user's profile.
 * Used by the frontend to hydrate auth state on page load without re-logging in.
 */
exports.me = async (req, res) => {
    try {
        const userId = req.decoded?.userid;
        const user   = await User.findById(userId).select(SENSITIVE_FIELDS).lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, user });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Error fetching user" });
    }
};


// ─── Update Profile ────────────────────────────────────────────────────────────
/**
 * PUT /auth/profile
 * Updates mutable profile fields: preferredName, age, city, reportOptIn.
 *
 * Encryption mode: A→B is allowed (user wants more privacy).
 * B→A is NOT allowed via this endpoint — it would mean the server starts holding
 * keys for a user who previously trusted us with nothing. Requires re-signup.
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.decoded?.userid;
        const { preferredName, age, city, reportOptIn, encryptionMode } = req.body;

        const updates = {};

        if (preferredName !== undefined) {
            updates.preferredName = String(preferredName).trim().slice(0, 50);
        }

        if (age !== undefined) {
            const n = parseInt(age, 10);
            if (!isNaN(n) && n >= 13 && n <= 120) updates.age = n;
        }

        if (city !== undefined) {
            updates.city = String(city).trim().slice(0, 100);
        }

        if (reportOptIn !== undefined) {
            updates.reportOptIn = Boolean(reportOptIn);
        }

        // Encryption mode: A→B only
        if (encryptionMode === 'B') {
            const current = await User.findById(userId).select('encryptionMode').lean();
            if (current?.encryptionMode === 'A') {
                updates.encryptionMode         = 'B';
                updates.encryptionKeyEncrypted = null;  // server discards the key — point of no return
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: "No valid fields to update" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true }
        ).select(SENSITIVE_FIELDS).lean();

        return res.status(200).json({
            success: true,
            message: "Profile updated",
            user:    updatedUser
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Error updating profile" });
    }
};


// ─── Refresh Token ─────────────────────────────────────────────────────────────
/**
 * POST /auth/refresh
 * Issues a fresh 7d JWT if the current token is within 24h of expiry.
 * Call this on app startup and periodically while the user is active.
 * If the token still has more than 24h remaining, returns 200 without issuing a new token.
 */
exports.refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "No token found" });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        const msUntilExpiry = (decoded.exp * 1000) - Date.now();

        // Token has plenty of time left — no refresh needed
        if (msUntilExpiry > ONE_DAY_MS) {
            return res.status(200).json({ success: true, refreshed: false, message: "Token still valid" });
        }

        // Issue a fresh 7d token
        const newToken = jwt.sign(
            { role: decoded.role, userid: decoded.userid, email: decoded.email },
            process.env.SECRET_KEY,
            { expiresIn: JWT_EXPIRY }
        );

        return res.status(200).cookie("token", newToken, {
            ...cookieOptions,
            expires: new Date(Date.now() + COOKIE_MAX_AGE)
        }).json({ success: true, refreshed: true, message: "Token refreshed" });

    } catch (err) {
        // Expired or tampered token — force re-login
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

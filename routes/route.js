const express = require("express");
const rateLimit = require("express-rate-limit");
const route = express.Router();

const { AuthN, isVisitor } = require("../middlewares/auth");
const { generateOTP, signup, login, logout, me, updateProfile, refreshToken } = require("../controllers/Auth");
const { resetPasswordLink, resetPassword } = require("../controllers/resetpassword");
const { pastHistory, currChat } = require("../controllers/ChatBotIntraction");
const {
    viewProfile,
    updateEmergencyContact,
    getEmergencyContact,
    deleteAccount
} = require("../controllers/privacy");

// ─── Rate limiters ─────────────────────────────────────────────────────────────
// In development / test mode we relax limits significantly so the test suite
// can run multiple times in a single 15-minute window without hitting 429.
// Production limits are strict. NODE_ENV=production is required for strict limits.

const isDev = process.env.NODE_ENV !== 'production';

// Strict limiter for OTP — prevents spam / brute force
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,        // 10 minutes
    max: isDev ? 100 : 3,             // dev: 100/window  prod: 3/window
    message: { success: false, message: "Too many OTP requests. Please wait 10 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

// General auth limiter — login, signup, password reset
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: isDev ? 200 : 10,            // dev: 200/window  prod: 10/window
    message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

// Chat limiter — per user (not per IP), more permissive than auth
// Keyed on decoded user ID so one user can't flood the Groq API
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,              // 1 minute window
    max: 20,                          // 20 messages per minute (same in dev/prod)
    keyGenerator: (req) => req.decoded?.userid?.toString() || req.ip,
    message: { success: false, message: "Slow down a little — you've sent a lot of messages. Try again in a minute." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET'  // History fetches don't count
});

// ─── Auth ──────────────────────────────────────────────────────────────────────
route.post("/auth/generate-otp",      otpLimiter,  generateOTP);
route.post("/auth/signup",            authLimiter, signup);
route.post("/auth/login",             authLimiter, login);
route.post("/auth/logout",                         logout);
route.post("/auth/refresh",                        refreshToken);   // no AuthN — verifies its own cookie

// ─── Auth (protected) ─────────────────────────────────────────────────────────
route.get("/auth/me",                 AuthN,                        me);
route.put("/auth/profile",            AuthN, isVisitor,             updateProfile);

// ─── Password reset ────────────────────────────────────────────────────────────
route.post("/auth/forgot-password",   authLimiter, resetPasswordLink);
route.post("/auth/reset-password/:token",          resetPassword);

// ─── Chat (protected) ──────────────────────────────────────────────────────────
route.get("/chat/history",            AuthN, isVisitor,             pastHistory);
route.post("/chat",                   AuthN, isVisitor, chatLimiter, currChat);

// ─── Privacy (protected) ──────────────────────────────────────────────────────
route.get("/privacy/profile",                  AuthN, isVisitor, viewProfile);
route.get("/privacy/emergency-contact",        AuthN, isVisitor, getEmergencyContact);
route.put("/privacy/emergency-contact",        AuthN, isVisitor, updateEmergencyContact);
route.delete("/privacy/account",               AuthN, isVisitor, deleteAccount);

module.exports = route;

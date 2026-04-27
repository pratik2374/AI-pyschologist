require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Trust proxy ───────────────────────────────────────────────────────────────
// Required when running behind Azure App Service / nginx / load balancer.
// Allows express to read X-Forwarded-Proto for HTTPS detection.
// Set TRUST_PROXY=true in production .env; leave unset for local dev.
if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
}

// ─── HTTPS redirect ────────────────────────────────────────────────────────────
// In production, redirect all plain HTTP traffic to HTTPS.
// In development (NODE_ENV !== 'production') this is skipped so localhost works.
// Azure App Service enforces HTTPS at the load balancer level — this is a
// belt-and-suspenders check for any traffic that slips through.
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
            return next();
        }
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    });
}

// ─── Connect DB ────────────────────────────────────────────────────────────────
require("./config/database").connect();

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({
    // HSTS: tell browsers to only connect via HTTPS for 1 year
    // Only active in production — dev browsers should not cache this
    hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false
}));

const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(u => u.trim()) : [];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like server-to-server or curl)
        if (!origin) return callback(null, true);
        
        // Allow if it matches the exact FRONTEND_URL
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Allow any Vercel preview URL or local dev URL automatically
        if (origin.endsWith('.vercel.app') || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        
        return callback(null, false); // Fail silently instead of throwing error to prevent crash logs
    },
    credentials: true    // Required for HttpOnly cookies to work cross-origin
}));

// ─── Body + cookie parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));   // Prevent oversized payloads
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// ─── Routes ────────────────────────────────────────────────────────────────────
const routes = require("./routes/route");
app.use("/api/v1", routes);

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start weekly report cron after server is live
    const { startWeeklyReportCron } = require("./utils/weeklyReportCron");
    startWeeklyReportCron();
});

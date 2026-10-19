const jwt = require("jsonwebtoken");


// ─── AuthN — verify JWT from HttpOnly cookie or Authorization header ──────────
exports.AuthN = (req, res, next) => {
    try {
        const token = req.cookies?.token || (req.headers?.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in."
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.decoded   = decoded;
        next();

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session. Please log in again."
        });
    }
};


// ─── isVisitor — allow only Visitor role ──────────────────────────────────────
exports.isVisitor = (req, res, next) => {
    if (req.decoded?.role !== "Visitor") {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }
    next();
};


// ─── isAdmin — allow only Admin role ──────────────────────────────────────────
exports.isAdmin = (req, res, next) => {
    if (req.decoded?.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied"
        });
    }
    next();
};

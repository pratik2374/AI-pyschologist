const crypto = require("crypto");
const User   = require("../models/User");
const bcrypt = require("bcrypt");
const { sendmail } = require("../utils/mailsender");


// ─── Send reset password link ──────────────────────────────────────────────────
exports.resetPasswordLink = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        const user = await User.findOne({ email });

        // Generic response — don't reveal whether the account exists
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account with that email exists, a reset link has been sent"
            });
        }

        const token = crypto.randomUUID();
        const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.updateOne({
            resetPasswordToken: token,
            resetPasswordExpiry: expiryTime
        });

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

        await sendmail(
            email,
            "Reset your Dr. Aria password",
            `<p style="font-family:sans-serif">
                You requested a password reset. Click the link below to set a new password:
                <br/><br/>
                <a href="${resetUrl}" style="color:#6366f1">${resetUrl}</a>
                <br/><br/>
                This link expires in <strong>10 minutes</strong>.
                If you did not request this, you can safely ignore this email.
            </p>`
        );

        return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a reset link has been sent"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error occurred while sending reset link"
        });
    }
};


// ─── Reset password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Both password fields are required"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        const user = await User.findOne({ resetPasswordToken: token });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset link"
            });
        }

        if (user.resetPasswordExpiry < Date.now()) {
            await user.updateOne({
                $unset: { resetPasswordToken: "", resetPasswordExpiry: "" }
            });

            return res.status(400).json({
                success: false,
                message: "Reset link has expired. Please request a new one."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await user.updateOne({
            $set: { password: hashedPassword },
            $unset: { resetPasswordToken: "", resetPasswordExpiry: "" }
        });

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error occurred while resetting password"
        });
    }
};

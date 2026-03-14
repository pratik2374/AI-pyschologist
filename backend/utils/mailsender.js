const nodemailer = require("nodemailer");
require("dotenv").config();

// Brevo / generic SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendmail = async (email, title, body) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error("MAIL_USER or MAIL_PASS not set for SMTP");
  }

  const from =
    process.env.MAIL_FROM || `"AI Psychologist" <${process.env.MAIL_USER}>`;

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: title,
    text: body,
  });

  console.log("Mail sent successfully via Brevo/SMTP!", info.messageId);
  return info;
};
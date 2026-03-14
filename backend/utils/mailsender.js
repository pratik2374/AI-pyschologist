const nodemailer = require("nodemailer");

require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 587,
  secure: String(process.env.MAIL_SECURE || "false") === "true", // true for 465, false for 587
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.USER_PASS,
  },
  connectionTimeout: process.env.MAIL_CONNECTION_TIMEOUT_MS
    ? Number(process.env.MAIL_CONNECTION_TIMEOUT_MS)
    : 12000,
  greetingTimeout: process.env.MAIL_GREETING_TIMEOUT_MS
    ? Number(process.env.MAIL_GREETING_TIMEOUT_MS)
    : 12000,
  socketTimeout: process.env.MAIL_SOCKET_TIMEOUT_MS
    ? Number(process.env.MAIL_SOCKET_TIMEOUT_MS)
    : 20000,
});

exports.sendmail = async (email, title, body) =>{
  const result = await transporter.sendMail({
    from: `"AI Psychologist" <${process.env.USER_EMAIL}>`,
    to: `${email}`,
    subject: title,
    text: body,
  });

  console.log("Mail sent successfully!", result?.messageId || "");
  return result;
}
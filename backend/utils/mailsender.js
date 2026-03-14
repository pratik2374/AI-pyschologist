const nodemailer = require("nodemailer");

require("dotenv").config();

exports.sendmail = async (email, title, body) =>{
  const provider = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    if (!from) throw new Error("MAIL_FROM is not set (e.g. \"AI Psychologist <onboarding@resend.dev>\")");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: title,
        text: body,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(
        `Resend error ${resp.status}: ${
          data?.message || data?.error || JSON.stringify(data)
        }`
      );
    }

    console.log("Mail sent successfully via Resend!", data?.id || "");
    return data;
  }

  // Default: SMTP (nodemailer) with simple config
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 587,
    secure: String(process.env.MAIL_SECURE || "false") === "true", // true for 465, false for 587
    auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.USER_PASS,
    },
  });

  const from = process.env.MAIL_FROM || `"AI Psychologist" <${process.env.USER_EMAIL}>`;
  const result = await transporter.sendMail({
    from,
    to: `${email}`,
    subject: title,
    text: body,
  });

  console.log("Mail sent successfully via SMTP!", result?.messageId || "");
  return result;
}
const { Resend } = require("resend");
require("dotenv").config();

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.MAIL_FROM;

if (!apiKey) {
  // Fail fast at startup if key missing
  throw new Error("RESEND_API_KEY is not set");
}
if (!fromAddress) {
  throw new Error(
    'MAIL_FROM is not set (e.g. AI Psychologist <onboarding@resend.dev>)'
  );
}

const resend = new Resend(apiKey);

exports.sendmail = async (email, title, body) => {
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [email],
    subject: title,
    text: body,
  });

  if (error) {
    throw new Error(
      `Resend SDK error: ${error.message || JSON.stringify(error)}`
    );
  }

  console.log("Mail sent successfully via Resend SDK!", data?.id || "");
  return data;
};
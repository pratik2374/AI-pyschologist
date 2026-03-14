require("dotenv").config();

exports.sendmail = async (email, title, body) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.MAIL_FROM_EMAIL;
  const fromName = process.env.MAIL_FROM_NAME || "AI Psychologist";

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }
  if (!fromEmail) {
    throw new Error("MAIL_FROM_EMAIL is not set");
  }

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email }],
      subject: title,
      textContent: body,
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(
      `Brevo API error ${resp.status}: ${
        data?.message || data?.error || JSON.stringify(data)
      }`
    );
  }

  console.log("Mail sent successfully via Brevo HTTP API!", data?.messageId || "");
  return data;
};
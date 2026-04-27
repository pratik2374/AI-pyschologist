// Weekly Report Email Template
// Clean, readable HTML — designed for both desktop and mobile email clients.
// Dr. Aria's brand: warm, minimal, no clinical coldness.

/**
 * Builds the full HTML email for a weekly report.
 *
 * @param {string} name       — user's preferred name
 * @param {string} reportText — the plaintext letter from Dr. Aria
 * @param {Date}   weekOf     — the Sunday this report covers
 * @returns {string} HTML string ready to pass to Resend
 */
const buildReportEmail = (name, reportText, weekOf) => {
    const weekLabel = weekOf.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });

    // Convert plain text paragraphs to <p> tags
    const bodyHtml = reportText
        .split(/\n\n+/)
        .map(para => para.trim())
        .filter(para => para.length > 0)
        .map(para => `<p style="margin:0 0 18px 0;line-height:1.7">${escapeHtml(para)}</p>`)
        .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your week with Dr. Aria</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px 28px;">
              <p style="margin:0;font-size:13px;color:#8888aa;letter-spacing:0.08em;text-transform:uppercase">Dr. Aria</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#ffffff;line-height:1.3">
                Your week in reflection
              </h1>
              <p style="margin:6px 0 0;font-size:14px;color:#8888aa">Week of ${escapeHtml(weekLabel)}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;color:#2d2d2d;font-size:16px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px">
              <hr style="border:none;border-top:1px solid #ebebeb;margin:0"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6">
                This reflection was written just for you by Dr. Aria.<br/>
                Your conversations are encrypted and private.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#aaa">
                You're receiving this because you opted in to weekly reflections.<br/>
                To unsubscribe, update your preferences in the app.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
};


// ── Helper ─────────────────────────────────────────────────────────────────────

const escapeHtml = (str) => {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
};


module.exports = { buildReportEmail };

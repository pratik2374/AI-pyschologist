const { Resend } = require('resend');

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend.
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} html     - HTML body content
 */
exports.sendmail = async (to, subject, html) => {
    const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        html
    });

    if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
};

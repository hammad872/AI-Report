const nodemailer = require('nodemailer');

let transporter;

const getSmtpPass = () => (process.env.SMTP_PASS || '').replace(/\s/g, '');

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER } = process.env;
  const SMTP_PASS = getSmtpPass();

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const subject = 'Reset your PeakPerformance password';
  const text = `You requested a password reset.\n\nOpen this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Click here to set a new password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  if (!mailer) {
    console.log(`[email] SMTP not configured. Password reset link for ${to}:\n${resetUrl}`);
    return;
  }

  try {
    await mailer.verify();
    const info = await mailer.sendMail({ from, to, subject, text, html });
    console.log(`[email] Password reset sent to ${to} (messageId: ${info.messageId})`);
  } catch (error) {
    console.error(`[email] Failed to send password reset to ${to}:`, error.message);
    console.log(`[email] Fallback reset link for ${to}:\n${resetUrl}`);
    throw error;
  }
};

module.exports = { sendPasswordResetEmail };

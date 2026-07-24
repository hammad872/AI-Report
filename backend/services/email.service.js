const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;   // not configured — caller falls back to console logging
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE) === 'true',   // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
};

const otpTemplate = (name, otp, minutes) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 12px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px 0;">
                <div style="font-size:15px;font-weight:700;color:#111;">PeakPerformance.pk</div>
                <div style="font-size:11px;color:#888;margin-top:2px;">Sports Science Platform</div>
                <div style="height:2px;background:#e07b39;margin:16px 0 24px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px;">
                  Hi ${name},
                </p>
                <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 22px;">
                  Use the code below to verify your email address and finish creating your account.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px;">
                <div style="display:inline-block;background:#faf7f4;border:1px solid #e5e7eb;border-radius:10px;padding:16px 28px;">
                  <span style="font-size:30px;font-weight:700;letter-spacing:9px;color:#111;">${otp}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 8px;">
                <p style="font-size:12px;color:#666;line-height:1.6;margin:0 0 6px;">
                  This code expires in ${minutes} minutes.
                </p>
                <p style="font-size:12px;color:#666;line-height:1.6;margin:0;">
                  If you didn't request this, you can safely ignore this email — no account will be created.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <div style="border-top:1px solid #e5e7eb;padding-top:14px;font-size:11px;color:#aaa;">
                  peakperformance.pk
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

/**
 * Sends the signup verification code.
 * In development with no SMTP configured, the code is printed to the console
 * so you can test the flow without a mail provider.
 */
const sendOtpEmail = async (to, name, otp, minutes) => {
  const tx = getTransporter();

  if (!tx) {
    console.warn(`[email] SMTP not configured — OTP for ${to} is: ${otp}`);
    return;
  }

  await tx.sendMail({
    from: process.env.MAIL_FROM || `PeakPerformance <${process.env.SMTP_USER}>`,
    to,
    subject: `${otp} is your PeakPerformance verification code`,
    text: `Hi ${name},\n\nYour verification code is ${otp}. It expires in ${minutes} minutes.\n\nIf you didn't request this, you can ignore this email.\n\npeakperformance.pk`,
    html: otpTemplate(name, otp, minutes)
  });
};

module.exports = { sendOtpEmail };
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { sendPasswordResetEmail } = require('../services/email.service');

const RESET_TOKEN_HOURS = 1;

const signAuthToken = (user) =>
  jwt.sign(
    { email: user.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

exports.login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Auth environment is not configured' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({ token: signAuthToken(user) });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = hashResetToken(resetToken);
    user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/?token=${resetToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (error) {
      console.error('[auth] forgot-password email failed:', error.message);
      return res.status(500).json({
        error: 'Could not send reset email. Check SMTP settings or use the link logged in the server console.',
      });
    }
  } else {
    console.log(`[auth] forgot-password requested for unknown email: ${normalizedEmail}`);
  }

  return res.json({
    message: 'If an account exists for that email, a reset link has been sent.',
  });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = await User.findOne({
    resetToken: hashResetToken(token),
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  user.password = password;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return res.json({ message: 'Password updated successfully. You can sign in now.' });
};

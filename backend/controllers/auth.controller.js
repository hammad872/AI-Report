const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const PendingSignup = require('../models/PendingSignup.model');
const { sendOtpEmail } = require('../services/email.service');

const OTP_TTL_MINUTES = 10;      // how long a code stays valid
const PENDING_TTL_MINUTES = 60;  // how long an unfinished signup survives
const MAX_OTP_ATTEMPTS = 5;      // wrong guesses before the code is burned
const RESEND_COOLDOWN_SEC = 60;

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

const fail = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * POST /api/auth/signup
 * Body: { name, email, password, confirmPassword }
 *
 * Does NOT create a User — it stages the signup and emails a code.
 * The account is only created once the code is verified.
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      throw fail('All fields are required.', 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw fail('Please enter a valid email address.', 400);
    }
    if (password.length < 8) {
      throw fail('Password must be at least 8 characters.', 400);
    }
    if (password !== confirmPassword) {
      throw fail('Passwords do not match.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      throw fail('An account with this email already exists.', 409);
    }

    const otp = generateOtp();
    const now = Date.now();

    // Upsert: restarting a signup replaces the previous pending record
    await PendingSignup.findOneAndUpdate(
      { email: cleanEmail },
      {
        name: name.trim(),
        email: cleanEmail,
        password: await bcrypt.hash(password, 12),
        otpHash: await bcrypt.hash(otp, 10),
        otpExpiresAt: new Date(now + OTP_TTL_MINUTES * 60 * 1000),
        attempts: 0,
        lastSentAt: new Date(now),
        expiresAt: new Date(now + PENDING_TTL_MINUTES * 60 * 1000)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(cleanEmail, name.trim(), otp, OTP_TTL_MINUTES);

    res.status(200).json({
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      expiresInMinutes: OTP_TTL_MINUTES
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 *
 * On success the User is created and a token is issued — no separate login step.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw fail('Email and verification code are required.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const pending = await PendingSignup.findOne({ email: cleanEmail });

    if (!pending) {
      throw fail('No pending signup found for this email. Please sign up again.', 404);
    }
    if (pending.otpExpiresAt < new Date()) {
      throw fail('This code has expired. Request a new one.', 400);
    }
    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      throw fail('Too many incorrect attempts. Request a new code.', 429);
    }

    const match = await bcrypt.compare(String(otp).trim(), pending.otpHash);

    if (!match) {
      pending.attempts += 1;
      await pending.save();
      const left = MAX_OTP_ATTEMPTS - pending.attempts;
      throw fail(
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.`
          : 'Incorrect code. Too many attempts — request a new code.',
        400
      );
    }

    // Race guard: someone may have registered this email in the meantime
    if (await User.findOne({ email: cleanEmail })) {
      await PendingSignup.deleteOne({ _id: pending._id });
      throw fail('An account with this email already exists.', 409);
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.password,     // already hashed
      emailVerifiedAt: new Date()
    });
    user.$locals.passwordAlreadyHashed = true;
    await user.save();

    await PendingSignup.deleteOne({ _id: pending._id });

    res.status(201).json({
      message: 'Email verified. Account created.',
      token: signToken(user),
      user: user.toPublic()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw fail('Email is required.', 400);

    const cleanEmail = email.toLowerCase().trim();
    const pending = await PendingSignup.findOne({ email: cleanEmail });

    if (!pending) {
      throw fail('No pending signup found for this email. Please sign up again.', 404);
    }

    const sinceLast = (Date.now() - pending.lastSentAt.getTime()) / 1000;
    if (sinceLast < RESEND_COOLDOWN_SEC) {
      throw fail(
        `Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - sinceLast)}s before requesting another code.`,
        429
      );
    }

    const otp = generateOtp();
    const now = Date.now();

    pending.otpHash = await bcrypt.hash(otp, 10);
    pending.otpExpiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000);
    pending.attempts = 0;
    pending.lastSentAt = new Date(now);
    pending.expiresAt = new Date(now + PENDING_TTL_MINUTES * 60 * 1000);
    await pending.save();

    await sendOtpEmail(pending.email, pending.name, otp, OTP_TTL_MINUTES);

    res.json({
      message: `New code sent to ${pending.email}`,
      expiresInMinutes: OTP_TTL_MINUTES
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw fail('Email and password are required.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // password has select:false, so ask for it explicitly
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // If they started a signup but never verified, say something useful
      if (!user && (await PendingSignup.exists({ email: cleanEmail }))) {
        throw fail('This email is not verified yet. Please complete signup.', 403);
      }
      throw fail('Incorrect email or password.', 401);
    }

    res.json({
      message: 'Logged in successfully',
      token: signToken(user),
      user: user.toPublic()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me  (protected)
 */
const getMe = async (req, res) => {
  res.json({ user: req.user.toPublic() });
};

/**
 * PATCH /api/auth/password  (protected)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw fail('Current and new password are required.', 400);
    }
    if (newPassword.length < 8) {
      throw fail('New password must be at least 8 characters.', 400);
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      throw fail('Passwords do not match.', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      throw fail('Current password is incorrect.', 401);
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, verifyOtp, resendOtp, login, getMe, changePassword };
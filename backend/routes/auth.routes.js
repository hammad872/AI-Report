const express = require('express');
const router = express.Router();
const {
  signup, verifyOtp, resendOtp, login, getMe, changePassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/signup', signup);          // stages signup + emails OTP
router.post('/verify-otp', verifyOtp);   // creates the account, returns token
router.post('/resend-otp', resendOtp);
router.post('/login', login);

router.get('/me', protect, getMe);
router.patch('/password', protect, changePassword);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  googleAuth,
  registerStudent,
  checkApplicationStatus,
  login,
  requestOtp,
  otpLogin,
  getMe,
  logout,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfileImage } = require('../middleware/uploadMiddleware');

// Public
router.post('/google', googleAuth);
router.post('/register-student', uploadProfileImage.single('profileImage'), registerStudent);
router.get('/application-status/:email', checkApplicationStatus);
router.post('/login', login);
router.post('/request-otp', requestOtp);
router.post('/otp-login', otpLogin);

// Private
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/update-password', protect, updatePassword);

module.exports = router;

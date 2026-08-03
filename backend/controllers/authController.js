const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const StudentApplication = require('../models/StudentApplication');
const ProgressReport = require('../models/ProgressReport');
const Otp = require('../models/Otp');
const { generateToken, sendTokenResponse } = require('../utils/generateToken');

// @desc    Google OAuth login & first-time approval request
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { email, name, googleId } = req.body;

  if (!email || !googleId) {
    return res.status(400).json({ success: false, message: 'Email and Google ID are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'account deactivated by admin' });
    }
    return sendTokenResponse(user, 200, res);
  }

  // User not created yet -> Check for pending/rejected/approved StudentApplication
  let application = await StudentApplication.findOne({ email: normalizedEmail });

  if (!application) {
    // First time user logging in -> Create a pending application for SuperAdmin approval
    const studentName = name && name.trim() ? name.trim() : normalizedEmail.split('@')[0];
    application = await StudentApplication.create({
      name: studentName,
      email: normalizedEmail,
      password: googleId,
      status: 'pending',
    });
  }

  if (application.status === 'pending') {
    return res.status(200).json({
      success: true,
      pendingApproval: true,
      status: 'pending',
      email: normalizedEmail,
      message: 'Registration submitted. Please wait for SuperAdmin approval.',
    });
  }

  if (application.status === 'rejected') {
    return res.status(401).json({
      success: false,
      status: 'rejected',
      message: 'Your registration was rejected by SuperAdmin',
      reason: application.rejectionReason,
    });
  }
});

// @desc    Student self-registration (creates a pending application, NOT a login-able account)
// @route   POST /api/auth/register-student
// @access  Public
const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, rollNumber, department, course, semester } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists' });
  }

  const existingApplication = await StudentApplication.findOne({ email });
  if (existingApplication) {
    return res.status(400).json({
      success: false,
      message: `You already have an application with status: ${existingApplication.status}`,
    });
  }

  const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : null;

  const application = await StudentApplication.create({
    name,
    email,
    password,
    phone,
    rollNumber,
    department,
    course,
    semester,
    profileImage,
  });

  res.status(201).json({
    success: true,
    message: 'Registration submitted successfully. Please wait for SuperAdmin approval.',
    application: {
      id: application._id,
      name: application.name,
      email: application.email,
      status: application.status,
    },
  });
});

// @desc    Check the status of a submitted student application
// @route   GET /api/auth/application-status/:email
// @access  Public
const checkApplicationStatus = asyncHandler(async (req, res) => {
  const email = req.params.email.toLowerCase().trim();
  const user = await User.findOne({ email });

  if (user && user.status === 'approved') {
    const token = generateToken(user._id, user.role);
    return res.json({
      success: true,
      status: 'approved',
      isApproved: true,
      token,
      user,
      vcode: user.studentInfo?.rollNumber || 'unknown',
    });
  }

  const application = await StudentApplication.findOne({ email });
  if (!application) {
    return res.status(404).json({ success: false, message: 'No application found for this email' });
  }
  res.json({
    success: true,
    status: application.status,
    rejectionReason: application.rejectionReason || undefined,
  });
});

// @desc    Login for superadmin, faculty and approved students
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    // Give a more helpful message if a student registration is still pending
    const application = await StudentApplication.findOne({ email });
    if (application && application.status === 'pending') {
      return res.status(401).json({ success: false, message: 'Your registration is still pending SuperAdmin approval' });
    }
    if (application && application.status === 'rejected') {
      return res.status(401).json({ success: false, message: 'Your registration was rejected', reason: application.rejectionReason });
    }
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'account deactivated by admin' });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Get currently logged in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('studentInfo.assignedFaculty', 'name email facultyInfo');
  res.json({ success: true, user });
});

// @desc    Logout - clears the auth cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// @desc    Update own password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Generate and send OTP via email securely from backend
// @route   POST /api/auth/request-otp
// @access  Public
const requestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide email' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Validate check for active or rejected student applications
  const checkRes = await StudentApplication.findOne({ email: normalizedEmail });
  if (checkRes && checkRes.status === 'rejected') {
    return res.status(401).json({
      success: false,
      status: 'rejected',
      message: 'Your registration was rejected by SuperAdmin',
      reason: checkRes.rejectionReason,
    });
  }

  // 1. Generate 6-digit OTP passcode
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 1 * 60 * 1000; // valid for 1 minute
  const timeStr = new Date(expiry).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 2. Save OTP record in DB (overwriting any previous OTP for the same email)
  await Otp.deleteMany({ email: normalizedEmail });
  await Otp.create({ email: normalizedEmail, code });

  // Debug print in terminal console for easy developer testing
  console.log("==========================================");
  console.log(`[BACKEND SECURE OTP CODE FOR ${normalizedEmail}]: ${code} (expires in 60s at ${timeStr})`);
  console.log("==========================================");

  // 3. Send email via EmailJS API securely from backend
  const serviceId = process.env.EMAILJS_SERVICE_ID || "service_ptafsqi";
  const templateId = process.env.EMAILJS_TEMPLATE_ID || "template_bpiaj3s";
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || "WGpMDI4EQf2GSpNim";
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || ""; // Optional accessToken

  try {
    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        email: normalizedEmail,
        to_name: normalizedEmail.split("@")[0],
        passcode: code,
        time: timeStr
      }
    };
    if (privateKey) {
      payload.accessToken = privateKey;
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`EmailJS responded with status ${response.status}: ${errText}`);
    }
  } catch (err) {
    console.error("Backend OTP email delivery failed:", err.message || err);
    // In development mode or if keys are empty/unset, we succeed so local developer testing continues (via console.log)
    if (publicKey === "your_public_key" || !publicKey) {
      // Allow local console testing
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ success: false, message: 'Failed to send verification email.' });
    }
  }

  res.json({ success: true, message: 'Verification code sent successfully.' });
});

// @desc    Passwordless OTP login (called with email & passcode)
// @route   POST /api/auth/otp-login
// @access  Public
const otpLogin = asyncHandler(async (req, res) => {
  const { email, passcode } = req.body;
  if (!email || !passcode) {
    return res.status(400).json({ success: false, message: 'Please provide email and passcode' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Retrieve the active OTP record
  const activeOtp = await Otp.findOne({ email: normalizedEmail });
  if (!activeOtp) {
    return res.status(400).json({ success: false, message: 'No active verification code found or code expired' });
  }

  // 2. High-precision manual expiration check (60 seconds)
  const otpAgeMs = Date.now() - new Date(activeOtp.createdAt).getTime();
  if (otpAgeMs > 60 * 1000) {
    await Otp.deleteOne({ _id: activeOtp._id });
    return res.status(400).json({ success: false, message: 'This OTP has expired. Please request a new OTP code.' });
  }

  // 3. Compare passcode
  if (activeOtp.code !== passcode) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check and try again.' });
  }

  // 4. Verification successful, delete code immediately to prevent replay
  await Otp.deleteOne({ _id: activeOtp._id });

  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'account deactivated by admin' });
    }
    return sendTokenResponse(user, 200, res);
  }

  // User not created yet -> Check for pending/rejected/approved StudentApplication
  let application = await StudentApplication.findOne({ email: normalizedEmail });

  if (!application) {
    // First time OTP user registering -> Create a pending application for SuperAdmin approval
    const studentName = normalizedEmail.split('@')[0];
    application = await StudentApplication.create({
      name: studentName,
      email: normalizedEmail,
      password: 'otp_password_' + Math.random().toString(36).slice(-8),
      status: 'pending',
    });
  }

  if (application.status === 'pending') {
    return res.json({
      success: true,
      pendingApproval: true,
      status: 'pending',
      email: normalizedEmail,
      message: 'Registration submitted. Please wait for SuperAdmin approval.',
    });
  }

  if (application.status === 'rejected') {
    return res.status(401).json({
      success: false,
      status: 'rejected',
      message: 'Your registration was rejected by SuperAdmin',
      reason: application.rejectionReason,
    });
  }
});

module.exports = {
  googleAuth,
  registerStudent,
  checkApplicationStatus,
  login,
  requestOtp,
  otpLogin,
  getMe,
  logout,
  updatePassword,
};


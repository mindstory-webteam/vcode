const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const StudentApplication = require('../models/StudentApplication');
const { sendTokenResponse } = require('../utils/generateToken');

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
  const application = await StudentApplication.findOne({ email: req.params.email.toLowerCase() });
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
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact the SuperAdmin.' });
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

module.exports = {
  registerStudent,
  checkApplicationStatus,
  login,
  getMe,
  logout,
  updatePassword,
};

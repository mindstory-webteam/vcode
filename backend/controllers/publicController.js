const asyncHandler = require('../middleware/asyncHandler');
const ProgressReport = require('../models/ProgressReport');
const User = require('../models/User');

// @desc    Get progress report publicly by slug (VCode or Roll Number)
// @route   GET /api/public/verify/:slug
// @access  Public
const verifyStudentProgress = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  // The slug might be "VC-0001", "VC-03SU22CC098", or just "0001" or "03SU22CC098"
  // Let's strip "VC-" if it's there to easily search.
  const rawId = slug.startsWith('VC-') ? slug.slice(3) : slug;

  // We check two things:
  // 1. Is rawId the `program.code` in a ProgressReport?
  // 2. Is rawId the `verificationCode` in a ProgressReport?
  let report = await ProgressReport.findOne({ 'gradeCard.program.code': rawId })
    .populate('student', 'name profileImage studentInfo')
    .populate('faculty', 'name email facultyInfo');

  if (!report) {
    report = await ProgressReport.findOne({ 'gradeCard.verification.verificationCode': rawId })
      .populate('student', 'name profileImage studentInfo')
      .populate('faculty', 'name email facultyInfo');
  }

  // 3. Is rawId the `studentInfo.rollNumber` in a User?
  if (!report) {
    // Try by user roll number
    const user = await User.findOne({ 'studentInfo.rollNumber': rawId, role: 'student' });
    if (user) {
      report = await ProgressReport.findOne({ student: user._id })
        .populate('student', 'name profileImage studentInfo')
        .populate('faculty', 'name email facultyInfo');
    }
  }

  if (!report) {
    return res.status(404).json({ success: false, message: 'No student progress card found for this ID' });
  }
  
  res.json({ success: true, user: report.student, report });
});

module.exports = {
  verifyStudentProgress,
};

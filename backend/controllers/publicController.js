const asyncHandler = require('../middleware/asyncHandler');
const ProgressReport = require('../models/ProgressReport');
const User = require('../models/User');

// @desc    Get progress report publicly by slug (VCode or Roll Number)
// @route   GET /api/public/verify/:slug
// @access  Public
const verifyStudentProgress = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const mongoose = require('mongoose');
  if (!mongoose.isValidObjectId(slug)) {
    return res.status(404).json({ success: false, message: 'Invalid Student ID format' });
  }

  const report = await ProgressReport.findOne({ student: slug })
    .populate('student', 'name profileImage studentInfo')
    .populate('faculty', 'name email facultyInfo');

  if (!report) {
    return res.status(404).json({ success: false, message: 'No student progress card found for this ID' });
  }

  res.json({ success: true, user: report.student, report });
});

module.exports = {
  verifyStudentProgress,
};
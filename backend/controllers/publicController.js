const asyncHandler = require('../middleware/asyncHandler');
const ProgressReport = require('../models/ProgressReport');
const User = require('../models/User');

// @desc    Get progress report publicly by slug (VCode or Roll Number)
// @route   GET /api/public/verify/:slug
// @access  Public
const verifyStudentProgress = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const mongoose = require('mongoose');

  let report = null;

  // 1. Try finding by student ID (ObjectId)
  if (mongoose.isValidObjectId(slug)) {
    report = await ProgressReport.findOne({ student: slug })
      .populate('student', 'name profileImage studentInfo')
      .populate('faculty', 'name email facultyInfo');
  }

  // 2. Try finding by decoded VCode (hex encoded rollNumber)
  if (!report) {
    const decodeVCode = (hex) => {
      try {
        if (!hex || hex.length % 2 !== 0) return '';
        if (!/^[0-9a-fA-F]+$/.test(hex)) return '';
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
      } catch (e) {
        return '';
      }
    };

    const decodedRoll = decodeVCode(slug);
    if (decodedRoll) {
      const studentUser = await User.findOne({ 'studentInfo.rollNumber': decodedRoll, role: 'student' });
      if (studentUser) {
        report = await ProgressReport.findOne({ student: studentUser._id })
          .populate('student', 'name profileImage studentInfo')
          .populate('faculty', 'name email facultyInfo');
      }
    }
  }

  // 3. Try finding by raw slug as the rollNumber
  if (!report) {
    const studentUser = await User.findOne({ 'studentInfo.rollNumber': slug, role: 'student' });
    if (studentUser) {
      report = await ProgressReport.findOne({ student: studentUser._id })
        .populate('student', 'name profileImage studentInfo')
        .populate('faculty', 'name email facultyInfo');
    }
  }

  if (!report) {
    return res.status(404).json({ success: false, message: 'No student progress card found for this VCode/ID' });
  }

  res.json({ success: true, user: report.student, report });
});

module.exports = {
  verifyStudentProgress,
};
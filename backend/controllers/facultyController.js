const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const ProgressReport = require('../models/ProgressReport');

// @desc    Get all students assigned to the logged-in faculty
// @route   GET /api/faculty/students
// @access  Private/Faculty
const getMyStudents = asyncHandler(async (req, res) => {
  const students = await User.find({
    role: 'student',
    'studentInfo.assignedFaculty': req.user._id,
  }).sort('name');

  res.json({ success: true, count: students.length, students });
});

// Helper: verify the target student is assigned to this faculty
const ensureStudentIsAssigned = async (facultyId, studentId) => {
  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    'studentInfo.assignedFaculty': facultyId,
  });
  return student;
};

// @desc    Get a specific assigned student's full progress report
// @route   GET /api/faculty/students/:studentId/progress-report
// @access  Private/Faculty
const getStudentProgressReport = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const report = await ProgressReport.findOne({ student: student._id })
    .populate('student', 'name email studentInfo')
    .populate('entries.updatedBy', 'name role')
    .populate('gradeCard.lastUpdatedBy', 'name role');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  res.json({ success: true, report });
});

// @desc    Add a new progress entry (grade/remark/attendance/etc.) for an assigned student
// @route   POST /api/faculty/students/:studentId/progress-report/entries
// @access  Private/Faculty
// body: { title, category, description, marks, grade, remarks }
const addProgressEntry = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const { title, category, description, marks, grade, remarks } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'title is required' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
  }

  report.entries.push({
    title,
    category,
    description,
    marks,
    grade,
    remarks,
    updatedBy: req.user._id,
  });
  await report.save();

  res.status(201).json({
    success: true,
    message: 'Progress entry added — reflected immediately on the student\'s report',
    report,
  });
});

// @desc    Update an existing progress entry
// @route   PUT /api/faculty/students/:studentId/progress-report/entries/:entryId
// @access  Private/Faculty
const updateProgressEntry = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  const entry = report.entries.id(req.params.entryId);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Entry not found' });
  }

  const { title, category, description, marks, grade, remarks } = req.body;
  if (title !== undefined) entry.title = title;
  if (category !== undefined) entry.category = category;
  if (description !== undefined) entry.description = description;
  if (marks !== undefined) entry.marks = marks;
  if (grade !== undefined) entry.grade = grade;
  if (remarks !== undefined) entry.remarks = remarks;
  entry.updatedBy = req.user._id;

  await report.save();
  res.json({ success: true, message: 'Progress entry updated', report });
});

// @desc    Delete a progress entry
// @route   DELETE /api/faculty/students/:studentId/progress-report/entries/:entryId
// @access  Private/Faculty
const deleteProgressEntry = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  report.entries.pull({ _id: req.params.entryId });
  await report.save();

  res.json({ success: true, message: 'Progress entry removed', report });
});

// @desc    Update overall remarks for a student's progress report
// @route   PUT /api/faculty/students/:studentId/progress-report/remarks
// @access  Private/Faculty
const updateOverallRemarks = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const { overallRemarks } = req.body;
  const report = await ProgressReport.findOneAndUpdate(
    { student: student._id },
    { overallRemarks },
    { new: true }
  );

  res.json({ success: true, message: 'Overall remarks updated', report });
});

// ---------------------------------------------------------------------------
// GRADE CARD (new) — Faculty can update the grade card ONLY for students
// assigned to them. Accepts any subset of gradeCard fields; only provided
// keys are merged in, everything else on the report is left untouched.
// ---------------------------------------------------------------------------

// @desc    Update / fill the full grade card for an assigned student
// @route   PUT /api/faculty/students/:studentId/progress-report/grade-card
// @access  Private/Faculty
// body: any subset of {
//   program, overallGrade, industryReadiness, placementStatus,
//   skillScores, readinessBreakdown, experience, verifiedSkills,
//   portfolioHighlights, achievements, mentorEvaluation, mentorRemarks,
//   interviewReadiness, verification
// }
const updateGradeCard = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
  }

  const allowedFields = [
    'program',
    'overallGrade',
    'industryReadiness',
    'placementStatus',
    'skillScores',
    'readinessBreakdown',
    'experience',
    'verifiedSkills',
    'portfolioHighlights',
    'achievements',
    'mentorEvaluation',
    'mentorRemarks',
    'interviewReadiness',
    'verification',
  ];

  if (!report.gradeCard) {
    report.gradeCard = {};
  }

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      report.gradeCard[field] = req.body[field];
    }
  });

  report.gradeCard.lastUpdatedBy = req.user._id;
  report.gradeCard.lastUpdatedAt = new Date();

  await report.save();

  res.json({
    success: true,
    message: 'Grade card updated — visible immediately to the student',
    report,
  });
});

// ---------------------------------------------------------------------------
// PROFILE PHOTO — Faculty can set/replace the profile photo ONLY for
// students assigned to them.
// ---------------------------------------------------------------------------

// @desc    Upload / replace profile photo for an assigned student
// @route   PUT /api/faculty/students/:studentId/profile-photo
// @access  Private/Faculty
// form-data: photo (single image file)
const uploadStudentProfilePhoto = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an image file' });
  }

  student.profileImage = `/uploads/profiles/${req.file.filename}`;
  await student.save();

  res.json({
    success: true,
    message: 'Profile photo updated',
    profileImage: student.profileImage,
  });
});

module.exports = {
  getMyStudents,
  getStudentProgressReport,
  addProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  updateOverallRemarks,
  updateGradeCard,
  uploadStudentProfilePhoto,
};
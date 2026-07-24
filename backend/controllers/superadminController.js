const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const StudentApplication = require('../models/StudentApplication');
const ProgressReport = require('../models/ProgressReport');
const { deleteFromCloudinary } = require('../middleware/uploadMiddleware');
const { generateToken } = require('../utils/generateToken');

// ---------------------------------------------------------------------------
// FACULTY MANAGEMENT
// ---------------------------------------------------------------------------

// @desc    Create a faculty account
// @route   POST /api/superadmin/faculty
// @access  Private/SuperAdmin
const createFaculty = asyncHandler(async (req, res) => {
  const { name, email, password, phone, department, designation, employeeId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'A user with this email already exists' });
  }

  const faculty = await User.create({
    name,
    email,
    password,
    phone,
    role: 'faculty',
    status: 'approved',
    facultyInfo: { department, designation, employeeId },
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Faculty created successfully', user: faculty });
});

// @desc    Bulk create faculty accounts
// @route   POST /api/superadmin/faculty/bulk
// @access  Private/SuperAdmin
// body: { faculties: [{name,email,password,phone,department,designation,employeeId}, ...] }
const bulkCreateFaculty = asyncHandler(async (req, res) => {
  const { faculties } = req.body;
  if (!Array.isArray(faculties) || faculties.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide a non-empty array "faculties"' });
  }

  const results = { created: [], failed: [] };

  for (const f of faculties) {
    try {
      if (!f.name || !f.email || !f.password) {
        results.failed.push({ email: f.email, reason: 'Missing name, email or password' });
        continue;
      }
      const existing = await User.findOne({ email: f.email });
      if (existing) {
        results.failed.push({ email: f.email, reason: 'Email already exists' });
        continue;
      }
      const faculty = await User.create({
        name: f.name,
        email: f.email,
        password: f.password,
        phone: f.phone,
        role: 'faculty',
        status: 'approved',
        facultyInfo: { department: f.department, designation: f.designation, employeeId: f.employeeId },
        createdBy: req.user._id,
      });
      results.created.push(faculty);
    } catch (err) {
      results.failed.push({ email: f.email, reason: err.message });
    }
  }

  res.status(201).json({ success: true, ...results });
});

// @desc    Get all faculty
// @route   GET /api/superadmin/faculty
// @access  Private/SuperAdmin
const getAllFaculty = asyncHandler(async (req, res) => {
  const faculty = await User.find({ role: 'faculty' }).sort('-createdAt');
  res.json({ success: true, count: faculty.length, faculty });
});

// ---------------------------------------------------------------------------
// STUDENT APPLICATIONS (REGISTRATION APPROVAL FLOW)
// ---------------------------------------------------------------------------

// @desc    Get all student applications (optionally filter by status)
// @route   GET /api/superadmin/applications?status=pending
// @access  Private/SuperAdmin
const getApplications = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const applications = await StudentApplication.find(filter).sort('-createdAt');
  res.json({ success: true, count: applications.length, applications });
});

// @desc    Get single application
// @route   GET /api/superadmin/applications/:id
// @access  Private/SuperAdmin
const getApplicationById = asyncHandler(async (req, res) => {
  const application = await StudentApplication.findById(req.params.id);
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  res.json({ success: true, application });
});

// @desc    Approve a student application -> creates the real student User account
// @route   PUT /api/superadmin/applications/:id/approve
// @access  Private/SuperAdmin
// body (optional): { assignedFacultyId }
const approveApplication = asyncHandler(async (req, res) => {
  const application = await StudentApplication.findById(req.params.id).select('+password');
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  if (application.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Application already ${application.status}` });
  }

  const { assignedFacultyId } = req.body;
  let assignedFaculty = null;

  if (assignedFacultyId) {
    const facultyUser = await User.findOne({ _id: assignedFacultyId, role: 'faculty' });
    if (!facultyUser) {
      return res.status(400).json({ success: false, message: 'Assigned faculty not found' });
    }
    assignedFaculty = facultyUser._id;
  }

  // Create the real user account. Password hash is copied directly since it's
  // already hashed in the application; we bypass the pre-save hook by using insertMany-like approach.
  const newUser = new User({
    name: application.name,
    email: application.email,
    phone: application.phone,
    role: 'student',
    status: 'approved',
    profileImage: application.profileImage,
    profileImagePublicId: application.profileImagePublicId,
    studentInfo: {
      rollNumber: application.rollNumber,
      department: application.department,
      course: application.course,
      semester: application.semester,
      assignedFaculty,
    },
    createdBy: req.user._id,
  });
  newUser.password = application.password; // already hashed
  newUser._passwordAlreadyHashed = true; // prevent pre-save hook from re-hashing
  await newUser.save();

  // Create an empty progress report for the student right away
  await ProgressReport.create({
    student: newUser._id,
    faculty: assignedFaculty,
  });

  application.status = 'approved';
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();
  application.createdUser = newUser._id;
  await application.save();

  // Notify real-time clients via Socket.io
  const token = generateToken(newUser._id, newUser.role);
  const io = req.app.get('io');
  if (io) {
    const payload = {
      email: application.email,
      status: 'approved',
      isApproved: true,
      token,
      user: newUser,
      vcode: newUser.studentInfo?.rollNumber || 'unknown',
    };
    const room = `application:${application.email.toLowerCase().trim()}`;
    io.to(room).emit('application_approved', payload);
    io.emit('application_approved', payload);
  }

  res.json({
    success: true,
    message: 'Application approved. Student account created.',
    user: newUser,
  });
});

// @desc    Reject a student application
// @route   PUT /api/superadmin/applications/:id/reject
// @access  Private/SuperAdmin
// body: { reason }
const rejectApplication = asyncHandler(async (req, res) => {
  const application = await StudentApplication.findById(req.params.id);
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  if (application.status !== 'pending') {
    return res.status(400).json({ success: false, message: `Application already ${application.status}` });
  }

  // Clean up the applicant's uploaded profile image from Cloudinary
  if (application.profileImagePublicId) {
    try {
      await deleteFromCloudinary(application.profileImagePublicId, 'image');
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  application.status = 'rejected';
  application.rejectionReason = req.body.reason || 'Not specified';
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();
  await application.save();

  res.json({ success: true, message: 'Application rejected', application });
});

// ---------------------------------------------------------------------------
// STUDENT MANAGEMENT
// ---------------------------------------------------------------------------

// @desc    Superadmin can also directly create a student (skip registration flow)
// @route   POST /api/superadmin/students
// @access  Private/SuperAdmin
const createStudent = asyncHandler(async (req, res) => {
  const { name, email, password, phone, rollNumber, department, course, semester, assignedFacultyId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'A user with this email already exists' });
  }

  let assignedFaculty = null;
  if (assignedFacultyId) {
    const facultyUser = await User.findOne({ _id: assignedFacultyId, role: 'faculty' });
    if (!facultyUser) {
      return res.status(400).json({ success: false, message: 'Assigned faculty not found' });
    }
    assignedFaculty = facultyUser._id;
  }

  const student = await User.create({
    name,
    email,
    password,
    phone,
    role: 'student',
    status: 'approved',
    studentInfo: { rollNumber, department, course, semester, assignedFaculty },
    createdBy: req.user._id,
  });

  await ProgressReport.create({ student: student._id, faculty: assignedFaculty });

  res.status(201).json({ success: true, message: 'Student created successfully', user: student });
});

// @desc    Get all students
// @route   GET /api/superadmin/students
// @access  Private/SuperAdmin
const getAllStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: 'student' })
    .populate('studentInfo.assignedFaculty', 'name email facultyInfo')
    .sort('-createdAt');
  res.json({ success: true, count: students.length, students });
});

// @desc    Assign / reassign a faculty to a student
// @route   PUT /api/superadmin/students/:id/assign-faculty
// @access  Private/SuperAdmin
// body: { facultyId }
const assignFaculty = asyncHandler(async (req, res) => {
  const { facultyId } = req.body;
  if (!facultyId) {
    return res.status(400).json({ success: false, message: 'facultyId is required' });
  }

  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const faculty = await User.findOne({ _id: facultyId, role: 'faculty' });
  if (!faculty) {
    return res.status(404).json({ success: false, message: 'Faculty not found' });
  }

  student.studentInfo.assignedFaculty = faculty._id;
  await student.save();

  // Keep the progress report's faculty reference in sync
  await ProgressReport.findOneAndUpdate(
    { student: student._id },
    { faculty: faculty._id },
    { upsert: true }
  );

  res.json({ success: true, message: `Faculty '${faculty.name}' assigned to student '${student.name}'`, student });
});

// @desc    Activate / deactivate any user account
// @route   PUT /api/superadmin/users/:id/toggle-active
// @access  Private/SuperAdmin
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.role === 'superadmin') {
    return res.status(400).json({ success: false, message: 'Cannot deactivate a superadmin account' });
  }
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, message: `User is now ${user.isActive ? 'active' : 'inactive'}`, user });
});

// @desc    Delete a user (faculty or student)
// @route   DELETE /api/superadmin/users/:id
// @access  Private/SuperAdmin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.role === 'superadmin') {
    return res.status(400).json({ success: false, message: 'Cannot delete a superadmin account' });
  }

  if (user.role === 'student') {
    // Clean up the student's files from Cloudinary before deleting DB records
    const report = await ProgressReport.findOne({ student: user._id });
    if (report && Array.isArray(report.documents)) {
      for (const doc of report.documents) {
        if (doc.publicId) {
          const resourceType = doc.fileType && doc.fileType.startsWith('image/') ? 'image' : 'raw';
          try {
            await deleteFromCloudinary(doc.publicId, resourceType);
          } catch (err) {
            console.error('Cloudinary delete failed:', err.message);
          }
        }
      }
    }
    if (user.profileImagePublicId) {
      try {
        await deleteFromCloudinary(user.profileImagePublicId, 'image');
      } catch (err) {
        console.error('Cloudinary delete failed:', err.message);
      }
    }
    await ProgressReport.findOneAndDelete({ student: user._id });
  }
  if (user.role === 'faculty') {
    // Unassign this faculty from any students
    await User.updateMany(
      { 'studentInfo.assignedFaculty': user._id },
      { $set: { 'studentInfo.assignedFaculty': null } }
    );
    await ProgressReport.updateMany({ faculty: user._id }, { $set: { faculty: null } });
  }

  await user.deleteOne();
  res.json({ success: true, message: 'User deleted successfully' });
});

// @desc    Dashboard stats
// @route   GET /api/superadmin/dashboard
// @access  Private/SuperAdmin
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalFaculty, totalStudents, pendingApplications, unassignedStudents] = await Promise.all([
    User.countDocuments({ role: 'faculty' }),
    User.countDocuments({ role: 'student' }),
    StudentApplication.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'student', 'studentInfo.assignedFaculty': null }),
  ]);

  res.json({
    success: true,
    stats: { totalFaculty, totalStudents, pendingApplications, unassignedStudents },
  });
});

// ---------------------------------------------------------------------------
// PROGRESS REPORT MANAGEMENT (SuperAdmin can manage ANY student's report,
// unlike faculty who are restricted to their assigned students)
// ---------------------------------------------------------------------------

// Helper: fetch a student by id, 404 if not found / not a student
const findStudentOr404 = async (studentId, res) => {
  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found' });
    return null;
  }
  return student;
};

// @desc    Get any student's full progress report
// @route   GET /api/superadmin/students/:studentId/progress-report
// @access  Private/SuperAdmin
const getStudentProgressReportAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id })
    // FIX: this select list was missing profileImage, phone, isActive, status,
    // and createdAt — the report page renders all of these, but Mongoose's
    // populate() only returns fields explicitly listed here. Widened to match
    // everything the frontend actually reads off `report.student`.
    .populate('student', 'name email phone profileImage isActive status createdAt studentInfo')
    .populate('faculty', 'name email facultyInfo')
    .populate('entries.updatedBy', 'name role')
    .populate('documents.uploadedBy', 'name role')
    .populate('gradeCard.lastUpdatedBy', 'name role')
    .populate('attendance.markedBy', 'name role');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  res.json({ success: true, report });
});

// @desc    Add a new progress entry for any student
// @route   POST /api/superadmin/students/:studentId/progress-report/entries
// @access  Private/SuperAdmin
// body: { title, category, description, marks, grade, remarks }
const addProgressEntryAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const { title, category, description, marks, grade, remarks } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'title is required' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
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

// @desc    Update an existing progress entry for any student
// @route   PUT /api/superadmin/students/:studentId/progress-report/entries/:entryId
// @access  Private/SuperAdmin
const updateProgressEntryAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

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

// @desc    Delete a progress entry for any student
// @route   DELETE /api/superadmin/students/:studentId/progress-report/entries/:entryId
// @access  Private/SuperAdmin
const deleteProgressEntryAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  report.entries.pull({ _id: req.params.entryId });
  await report.save();

  res.json({ success: true, message: 'Progress entry removed', report });
});

// @desc    Update overall remarks for any student's progress report
// @route   PUT /api/superadmin/students/:studentId/progress-report/remarks
// @access  Private/SuperAdmin
const updateOverallRemarksAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const { overallRemarks } = req.body;
  const report = await ProgressReport.findOneAndUpdate(
    { student: student._id },
    { overallRemarks },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, message: 'Overall remarks updated', report });
});

// ---------------------------------------------------------------------------
// GRADE CARD (SuperAdmin can update the grade card for ANY student, no
// assignment restriction). Accepts any subset of gradeCard fields; only
// provided keys are merged in.
// ---------------------------------------------------------------------------

// @desc    Update / fill the full grade card for any student
// @route   PUT /api/superadmin/students/:studentId/progress-report/grade-card
// @access  Private/SuperAdmin
// body: any subset of {
//   program, overallGrade, industryReadiness, placementStatus,
//   skillScores, readinessBreakdown, experience, verifiedSkills,
//   portfolioHighlights, achievements, mentorEvaluation, mentorRemarks,
//   interviewReadiness, verification
// }
const updateGradeCardAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
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
// ATTENDANCE — SuperAdmin can mark/update attendance for ANY student, no
// assignment restriction. One record per calendar date; marking the same
// date again updates the existing record instead of creating a duplicate.
// ---------------------------------------------------------------------------

// @desc    Mark or update attendance for a specific date (upsert by date)
// @route   PUT /api/superadmin/students/:studentId/progress-report/attendance
// @access  Private/SuperAdmin
// body: { date, status, remarks }
const markAttendanceAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const { date, status, remarks } = req.body;
  if (!date || !status) {
    return res.status(400).json({ success: false, message: 'date and status are required' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
  }

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const existing = report.attendance.find((a) => {
    const d = new Date(a.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === day.getTime();
  });

  if (existing) {
    existing.status = status;
    existing.remarks = remarks;
    existing.markedBy = req.user._id;
  } else {
    report.attendance.push({ date: day, status, remarks, markedBy: req.user._id });
  }

  await report.save();
  res.json({ success: true, message: 'Attendance saved', report });
});

// @desc    Delete an attendance record for any student
// @route   DELETE /api/superadmin/students/:studentId/progress-report/attendance/:attendanceId
// @access  Private/SuperAdmin
const deleteAttendanceAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  report.attendance.pull({ _id: req.params.attendanceId });
  await report.save();

  res.json({ success: true, message: 'Attendance record removed', report });
});


// ---------------------------------------------------------------------------
// PROFILE PHOTO — SuperAdmin can set/replace the profile photo for ANY
// student, no assignment restriction.
// ---------------------------------------------------------------------------

// @desc    Upload / replace profile photo for any student
// @route   PUT /api/superadmin/students/:studentId/profile-photo
// @access  Private/SuperAdmin
// form-data: photo (single image file)
const uploadStudentProfilePhotoAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an image file' });
  }

  // Delete the previous photo from Cloudinary so orphaned images don't pile up
  if (student.profileImagePublicId) {
    try {
      await deleteFromCloudinary(student.profileImagePublicId, 'image');
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  student.profileImage = req.file.path; // Cloudinary secure URL
  student.profileImagePublicId = req.file.filename; // Cloudinary public_id
  await student.save();

  res.json({
    success: true,
    message: 'Profile photo updated',
    profileImage: student.profileImage,
  });
});


module.exports = {
  createFaculty,
  bulkCreateFaculty,
  getAllFaculty,
  getApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  createStudent,
  getAllStudents,
  assignFaculty,
  toggleUserActive,
  deleteUser,
  getDashboardStats,
  getStudentProgressReportAdmin,
  addProgressEntryAdmin,
  updateProgressEntryAdmin,
  deleteProgressEntryAdmin,
  updateOverallRemarksAdmin,
  updateGradeCardAdmin,
  uploadStudentProfilePhotoAdmin,
  markAttendanceAdmin,
  deleteAttendanceAdmin,
};
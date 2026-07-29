const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const StudentApplication = require('../models/StudentApplication');
const ProgressReport = require('../models/ProgressReport');
const { deleteFromCloudinary } = require('../middleware/uploadMiddleware');
const { generateToken } = require('../utils/generateToken');
const XLSX = require('xlsx');
const { buildGradeCardWorkbook, parseGradeCardWorkbook } = require('../utils/gradeCardExcel');
const { buildProgressReportWorkbook, parseProgressReportWorkbook } = require('../utils/progressReportExcel');
const { buildBulkProgressTemplate, parseBulkProgressWorkbook } = require('../utils/bulkProgressImportExcel');

const GRADE_CARD_FIELDS = [
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

  // Notify real-time clients via Socket.io
  const io = req.app.get('io');
  if (io) {
    const payload = {
      email: application.email,
      status: 'rejected',
      reason: application.rejectionReason,
    };
    const room = `application:${application.email.toLowerCase().trim()}`;
    io.to(room).emit('application_rejected', payload);
    io.emit('application_rejected', payload);
  }

  res.json({ success: true, message: 'Application rejected', application });
});

// @desc    Delete a student application
// @route   DELETE /api/superadmin/applications/:id
// @access  Private/SuperAdmin
const deleteApplication = asyncHandler(async (req, res) => {
  const application = await StudentApplication.findById(req.params.id);
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }

  // Clean up the applicant's uploaded profile image from Cloudinary
  if (application.profileImagePublicId) {
    try {
      await deleteFromCloudinary(application.profileImagePublicId, 'image');
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  await application.deleteOne();
  res.json({ success: true, message: 'Application deleted successfully' });
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
    if (report) {
      // 1. Delete documents
      if (Array.isArray(report.documents)) {
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
      // 2. Delete certificate PDF
      if (report.certificatePdfPublicId) {
        try {
          await deleteFromCloudinary(report.certificatePdfPublicId, 'raw');
        } catch (err) {
          console.error('Cloudinary certificate delete failed:', err.message);
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
    await StudentApplication.findOneAndDelete({ email: user.email });
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

// @desc    Update a student's profile (name, phone, department, etc)
// @route   PUT /api/superadmin/students/:studentId/profile
// @access  Private/SuperAdmin
const updateStudentProfileAdmin = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.studentId, role: 'student' });
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const { name, email, phone, rollNumber, department, course, semester, assignedFaculty, studentInfo } = req.body;

  if (name !== undefined) student.name = name;
  if (email !== undefined) student.email = email.toLowerCase().trim();
  if (phone !== undefined) student.phone = phone;

  // Flatten logic so it handles both flat payload and nested studentInfo payload
  const info = studentInfo || {};
  const newRollNumber = rollNumber !== undefined ? rollNumber : info.rollNumber;
  const newDept = department !== undefined ? department : info.department;
  const newCourse = course !== undefined ? course : info.course;
  const newSemester = semester !== undefined ? semester : info.semester;

  if (newRollNumber !== undefined) student.studentInfo.rollNumber = newRollNumber;
  if (newDept !== undefined) student.studentInfo.department = newDept;
  if (newCourse !== undefined) student.studentInfo.course = newCourse;
  if (newSemester !== undefined) student.studentInfo.semester = newSemester;

  if (assignedFaculty !== undefined) {
    student.studentInfo.assignedFaculty = assignedFaculty || null;

    // Also update the progress report's faculty reference
    await ProgressReport.updateOne(
      { student: student._id },
      { $set: { faculty: assignedFaculty || null } }
    );
  }

  await student.save();

  // Emit progress update so student portal refreshes student details in real-time
  const socketHelper = require('../socketHelper');
  socketHelper.emitProgressUpdate(student._id);

  res.json({ success: true, message: 'Student profile updated', user: student });
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
// PROGRESS ENTRIES — Excel export and bulk import (SuperAdmin, any student,
// no assignment restriction). Bulk import always appends new entries
// (entries don't have a natural per-row unique key like attendance's date,
// so there's no upsert-by-date equivalent here).
// ---------------------------------------------------------------------------

const VALID_ENTRY_CATEGORIES = ['academic', 'attendance', 'behavior', 'project', 'exam', 'other'];

// @desc    Export any student's progress entries as an .xlsx file
// @route   GET /api/superadmin/students/:studentId/progress-report/entries/export
// @access  Private/SuperAdmin
const exportEntriesAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id }).populate('entries.updatedBy', 'name');
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  const rows = report.entries.map((e) => ({
    Title: e.title,
    Category: e.category,
    Description: e.description || '',
    Marks: e.marks ?? '',
    Grade: e.grade || '',
    Remarks: e.remarks || '',
    'Updated By': e.updatedBy?.name || '',
    'Updated At': e.updatedAt ? new Date(e.updatedAt).toLocaleDateString('en-GB') : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 28 }, { wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 34 }, { wch: 18 }, { wch: 14 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entries');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const safeName = (student.name || 'student').replace(/[^a-z0-9]+/gi, '_');

  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_entries.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// @desc    Bulk-add progress entries from an Excel file (.xlsx/.xls) for any
//          student, no assignment restriction. Expected columns
//          (case-insensitive header row): Title | Category | Description |
//          Marks | Grade | Remarks. Category must be one of: academic,
//          attendance, behavior, project, exam, other — anything else falls
//          back to "other". Every valid row is appended as a new entry
//          (no de-duplication).
// @route   POST /api/superadmin/students/:studentId/progress-report/entries/bulk-upload
// @access  Private/SuperAdmin
// form-data: file (single .xlsx/.xls)
const bulkUploadEntriesAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an Excel file (.xlsx or .xls)' });
  }

  let rows;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Could not read this Excel file' });
  }

  if (!rows.length) {
    return res.status(400).json({ success: false, message: 'The Excel file has no data rows' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
  }

  const results = { added: 0, failed: [] };

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const title = (row.Title ?? row.title ?? '').toString().trim();
    if (!title) {
      results.failed.push({ row: rowNum, reason: 'Missing title' });
      return;
    }

    let category = (row.Category ?? row.category ?? 'other').toString().trim().toLowerCase();
    if (!VALID_ENTRY_CATEGORIES.includes(category)) category = 'other';

    const description = (row.Description ?? row.description ?? '').toString().trim();
    const marksRaw = row.Marks ?? row.marks;
    const marks = marksRaw === '' || marksRaw === undefined ? undefined : Number(marksRaw);
    const grade = (row.Grade ?? row.grade ?? '').toString().trim() || undefined;
    const remarks = (row.Remarks ?? row.remarks ?? '').toString().trim();

    report.entries.push({
      title,
      category,
      description,
      marks,
      grade,
      remarks,
      updatedBy: req.user._id,
    });
    results.added += 1;
  });

  await report.save();

  res.json({
    success: true,
    message: `Bulk import complete — ${results.added} entries added${results.failed.length ? `, ${results.failed.length} failed` : ''
      }`,
    ...results,
    report,
  });
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

  if (!report.gradeCard) {
    report.gradeCard = {};
  }

  GRADE_CARD_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) {
      report.gradeCard[field] = req.body[field];
    }
  });

  report.gradeCard.lastUpdatedBy = req.user._id;
  report.gradeCard.lastUpdatedAt = new Date();

  await report.save();

  res.json({
    success: true,
    message: 'Grade card updated ',
    report,
  });
});

// @desc    Delete / clear the full grade card for any student
// @route   DELETE /api/superadmin/students/:studentId/progress-report/grade-card
// @access  Private/SuperAdmin
const deleteGradeCardAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  report.gradeCard = {};
  await report.save();

  res.json({
    success: true,
    message: 'Grade card deleted successfully',
    report,
  });
});


// @desc    Export any student's grade card as a multi-sheet .xlsx file
// @route   GET /api/superadmin/students/:studentId/progress-report/grade-card/export
// @access  Private/SuperAdmin
const exportGradeCardAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  const workbook = buildGradeCardWorkbook(report.gradeCard);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const safeName = (student.name || 'student').replace(/[^a-z0-9]+/gi, '_');

  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_grade_card.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// @desc    Import / replace the grade card for any student from an uploaded
//          .xlsx file matching the export format (Overview + Skill Scores +
//          Experience Stats + Verified Skills + Portfolio Highlights +
//          Achievements + Mentor Ratings sheets). Only sheets present in the
//          file are applied — remove a sheet before re-uploading to leave
//          that part of the grade card untouched.
// @route   POST /api/superadmin/students/:studentId/progress-report/grade-card/import
// @access  Private/SuperAdmin
// form-data: file (single .xlsx/.xls)
const importGradeCardAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an Excel file (.xlsx or .xls)' });
  }

  let parsed;
  try {
    parsed = parseGradeCardWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Could not read this Excel file' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
  }
  if (!report.gradeCard) {
    report.gradeCard = {};
  }

  Object.keys(parsed).forEach((field) => {
    report.gradeCard[field] = parsed[field];
  });

  report.gradeCard.lastUpdatedBy = req.user._id;
  report.gradeCard.lastUpdatedAt = new Date();

  await report.save();

  res.json({
    success: true,
    message: 'Grade card imported from Excel',
    report,
  });
});

// ---------------------------------------------------------------------------
// FULL PROGRESS REPORT — export/import everything (remarks + entries +
// attendance + grade card) as ONE multi-sheet .xlsx file, for ANY student,
// no assignment restriction.
// ---------------------------------------------------------------------------

// @desc    Export any student's FULL progress report as one .xlsx
// @route   GET /api/superadmin/students/:studentId/progress-report/export
// @access  Private/SuperAdmin
const exportFullProgressReportAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  const workbook = buildProgressReportWorkbook(report);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const safeName = (student.name || 'student').replace(/[^a-z0-9]+/gi, '_');

  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_progress_report.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// @desc    Bulk import the FULL progress report from one Excel file, for any
//          student, no assignment restriction. Sheets: Overview | Entries |
//          Attendance | Skill Scores | Experience Stats | Verified Skills |
//          Portfolio Highlights | Achievements | Mentor Ratings.
//          - Overview sets overallRemarks + gradeCard scalar fields.
//          - Entries REPLACES the entries array (no dedup key exists).
//          - Attendance upserts by date.
//          - Grade-card array sheets replace their arrays.
//          Only sheets present in the file are applied.
// @route   POST /api/superadmin/students/:studentId/progress-report/import
// @access  Private/SuperAdmin
// form-data: file (single .xlsx/.xls)
const importFullProgressReportAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an Excel file (.xlsx or .xls)' });
  }

  let parsed;
  try {
    parsed = parseProgressReportWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Could not read this Excel file' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
  }

  if (parsed.overallRemarks !== undefined) {
    report.overallRemarks = parsed.overallRemarks;
  }

  if (parsed.entries) {
    report.entries = parsed.entries.map((e) => ({ ...e, updatedBy: req.user._id }));
  }

  let attendanceSummary = null;
  if (parsed.attendance) {
    let added = 0;
    let updated = 0;
    parsed.attendance.forEach((a) => {
      const existing = report.attendance.find((x) => {
        const d = new Date(x.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === a.date.getTime();
      });
      if (existing) {
        existing.status = a.status;
        existing.remarks = a.remarks;
        existing.markedBy = req.user._id;
        updated += 1;
      } else {
        report.attendance.push({ ...a, markedBy: req.user._id });
        added += 1;
      }
    });
    attendanceSummary = { added, updated, failed: parsed.attendanceErrors || [] };
  }

  if (parsed.gradeCard) {
    if (!report.gradeCard) report.gradeCard = {};
    GRADE_CARD_FIELDS.forEach((field) => {
      if (parsed.gradeCard[field] !== undefined) {
        report.gradeCard[field] = parsed.gradeCard[field];
      }
    });
    report.gradeCard.lastUpdatedBy = req.user._id;
    report.gradeCard.lastUpdatedAt = new Date();
  }

  await report.save();

  res.json({
    success: true,
    message: 'Full progress report imported from Excel',
    entriesImported: parsed.entries ? parsed.entries.length : undefined,
    attendance: attendanceSummary,
    report,
  });
});

// ---------------------------------------------------------------------------
// ATTENDANCE — SuperAdmin can mark/update attendance for ANY student, no
// assignment restriction. One record per calendar date; marking the same
// date again updates the existing record instead of creating a duplicate.
// ---------------------------------------------------------------------------

const VALID_ATTENDANCE_STATUSES = ['present', 'absent', 'half_day', 'leave'];

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

// @desc    Bulk upload attendance from an Excel file (.xlsx/.xls) for any
//          student, no assignment restriction. Expected columns
//          (case-insensitive header row): Date | Status | Remarks
//          Date accepts real Excel date cells or common date strings.
//          Status must be one of: present, absent, half_day (or "half day"), leave.
//          One record per date — matching an existing date updates it instead
//          of creating a duplicate, same as the single markAttendanceAdmin route.
// @route   POST /api/superadmin/students/:studentId/progress-report/attendance/bulk-upload
// @access  Private/SuperAdmin
// form-data: file (single .xlsx/.xls)
const bulkUploadAttendanceAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an Excel file (.xlsx or .xls)' });
  }

  let rows;
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Could not read this Excel file' });
  }

  if (!rows.length) {
    return res.status(400).json({ success: false, message: 'The Excel file has no data rows' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({
      student: student._id,
      faculty: student.studentInfo?.assignedFaculty || null,
    });
  }

  const results = { added: 0, updated: 0, failed: [] };

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2 accounts for 1-based rows and the header row
    const rawDate = row.Date ?? row.date;
    const rawStatusInput = row.Status ?? row.status ?? '';
    const rawStatus = rawStatusInput.toString().trim().toLowerCase().replace(/\s+/g, '_');
    const remarks = (row.Remarks ?? row.remarks ?? '').toString().trim();

    if (!rawDate) {
      results.failed.push({ row: rowNum, reason: 'Missing date' });
      return;
    }

    const day = rawDate instanceof Date ? new Date(rawDate) : new Date(rawDate);
    if (isNaN(day.getTime())) {
      results.failed.push({ row: rowNum, reason: 'Invalid date' });
      return;
    }
    day.setHours(0, 0, 0, 0);

    if (!VALID_ATTENDANCE_STATUSES.includes(rawStatus)) {
      results.failed.push({
        row: rowNum,
        reason: `Invalid status "${rawStatusInput}" (use present, absent, half_day, or leave)`,
      });
      return;
    }

    const existing = report.attendance.find((a) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    });

    if (existing) {
      existing.status = rawStatus;
      existing.remarks = remarks;
      existing.markedBy = req.user._id;
      results.updated += 1;
    } else {
      report.attendance.push({ date: day, status: rawStatus, remarks, markedBy: req.user._id });
      results.added += 1;
    }
  });

  await report.save();

  res.json({
    success: true,
    message: `Bulk upload complete — ${results.added} added, ${results.updated} updated${results.failed.length ? `, ${results.failed.length} failed` : ''
      }`,
    ...results,
    report,
  });
});

// @desc    Export any student's attendance records as an .xlsx file
// @route   GET /api/superadmin/students/:studentId/progress-report/attendance/export
// @access  Private/SuperAdmin
const exportAttendanceAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  const report = await ProgressReport.findOne({ student: student._id }).populate('attendance.markedBy', 'name');
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  const records = [...report.attendance].sort((a, b) => new Date(a.date) - new Date(b.date));

  const rows = records.map((r) => ({
    Date: new Date(r.date).toLocaleDateString('en-GB'),
    Status: r.status,
    Remarks: r.remarks || '',
    'Marked By': r.markedBy?.name || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 32 }, { wch: 20 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const safeName = (student.name || 'student').replace(/[^a-z0-9]+/gi, '_');

  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_attendance.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
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

  // Emit progress update so the student portal refreshes the photo in real-time
  const socketHelper = require('../socketHelper');
  socketHelper.emitProgressUpdate(student._id);

  res.json({
    success: true,
    message: 'Profile photo updated',
    profileImage: student.profileImage,
  });
});

// @desc    Delete profile photo for any student
// @route   DELETE /api/superadmin/students/:studentId/profile-photo
// @access  Private/SuperAdmin
const deleteStudentProfilePhotoAdmin = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(req.params.studentId, res);
  if (!student) return;

  if (student.profileImagePublicId) {
    try {
      await deleteFromCloudinary(student.profileImagePublicId, 'image');
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  student.profileImage = null;
  student.profileImagePublicId = null;
  await student.save();

  const socketHelper = require('../socketHelper');
  socketHelper.emitProgressUpdate(student._id);

  res.json({
    success: true,
    message: 'Profile photo deleted',
  });
});


// ---------------------------------------------------------------------------
// BULK IMPORT STUDENTS & PROGRESS REPORTS
// GET  /api/superadmin/students/bulk-import-template
// POST /api/superadmin/students/bulk-import-progress
// ---------------------------------------------------------------------------

const downloadBulkProgressTemplateAdmin = asyncHandler(async (req, res) => {
  const workbook = buildBulkProgressTemplate();
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="bulk_students_progress_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

const bulkImportStudentsAndProgressReportsAdmin = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach an Excel file (.xlsx or .xls)' });
  }

  let parsedStudents;
  try {
    parsedStudents = parseBulkProgressWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Could not parse Excel workbook: ' + err.message });
  }

  if (!parsedStudents || !parsedStudents.length) {
    return res.status(400).json({ success: false, message: 'No student data found in the uploaded file.' });
  }

  const summary = { studentsCreated: 0, studentsUpdated: 0, reportsUpdated: 0, errors: [] };

  for (const item of parsedStudents) {
    const acc = item.account || {};
    const email = (acc.email || '').toLowerCase().trim();
    const rollNumber = (acc.rollNumber || '').trim();
    if (!email && !rollNumber) { summary.errors.push({ reason: 'Skipped: missing email and roll number' }); continue; }

    try {
      // 1. Find or create User (student account)
      let student = null;
      if (email) student = await User.findOne({ email, role: 'student' });
      if (!student && rollNumber) student = await User.findOne({ 'studentInfo.rollNumber': rollNumber, role: 'student' });

      if (!student) {
        let assignedFaculty = null;
        if (acc.assignedFacultyEmail) {
          const fac = await User.findOne({ email: acc.assignedFacultyEmail.toLowerCase().trim(), role: 'faculty' });
          if (fac) assignedFaculty = fac._id;
        }
        student = await User.create({
          name: acc.name || email.split('@')[0] || 'Student',
          email: email || `${rollNumber.toLowerCase()}@student.local`,
          password: acc.password || 'Student@123',
          phone: acc.phone || '',
          role: 'student',
          status: 'approved',
          isActive: true,
          studentInfo: { rollNumber: rollNumber || '', department: acc.department || '', course: acc.course || '', semester: acc.semester || '', assignedFaculty },
          createdBy: req.user._id,
        });
        // Sync any pending StudentApplication
        if (email) {
          const pendingApp = await StudentApplication.findOne({ email, status: 'pending' });
          if (pendingApp) {
            pendingApp.status = 'approved';
            pendingApp.reviewedBy = req.user._id;
            pendingApp.reviewedAt = new Date();
            pendingApp.createdUser = student._id;
            await pendingApp.save();
          }
        }
        summary.studentsCreated += 1;
      } else {
        if (acc.name) student.name = acc.name;
        if (acc.phone) student.phone = acc.phone;
        if (acc.rollNumber) student.studentInfo.rollNumber = acc.rollNumber;
        if (acc.department) student.studentInfo.department = acc.department;
        if (acc.course) student.studentInfo.course = acc.course;
        if (acc.semester) student.studentInfo.semester = acc.semester;
        if (acc.assignedFacultyEmail) {
          const fac = await User.findOne({ email: acc.assignedFacultyEmail.toLowerCase().trim(), role: 'faculty' });
          if (fac) student.studentInfo.assignedFaculty = fac._id;
        }
        await student.save();
        summary.studentsUpdated += 1;
      }

      // 2. Find or create ProgressReport (progress card)
      let report = await ProgressReport.findOne({ student: student._id });
      if (!report) report = await ProgressReport.create({ student: student._id, faculty: student.studentInfo?.assignedFaculty || null });

      let reportChanged = false;
      if (item.overallRemarks !== undefined) { report.overallRemarks = item.overallRemarks; reportChanged = true; }
      if (item.entries && item.entries.length > 0) { report.entries = item.entries.map(e => ({ ...e, updatedBy: req.user._id })); reportChanged = true; }
      if (item.attendance && item.attendance.length > 0) {
        for (const a of item.attendance) {
          const existing = report.attendance.find(x => { const d = new Date(x.date); d.setHours(0, 0, 0, 0); return d.getTime() === a.date.getTime(); });
          if (existing) { existing.status = a.status; existing.remarks = a.remarks; existing.markedBy = req.user._id; }
          else report.attendance.push({ ...a, markedBy: req.user._id });
        }
        reportChanged = true;
      }
      if (item.gradeCard && Object.keys(item.gradeCard).length > 0) {
        if (!report.gradeCard) report.gradeCard = {};
        for (const field of GRADE_CARD_FIELDS) { if (item.gradeCard[field] !== undefined) report.gradeCard[field] = item.gradeCard[field]; }
        report.gradeCard.lastUpdatedBy = req.user._id;
        report.gradeCard.lastUpdatedAt = new Date();
        reportChanged = true;
      }
      if (reportChanged) { await report.save(); summary.reportsUpdated += 1; }
    } catch (err) {
      summary.errors.push({ student: email || rollNumber, reason: err.message });
    }
  }

  res.json({ success: true, message: `Bulk import complete: ${summary.studentsCreated} student(s) created, ${summary.studentsUpdated} updated, ${summary.reportsUpdated} progress report(s) saved.`, ...summary });
});

// ---------------------------------------------------------------------------
// UPLOAD CERTIFICATE PDF TO PROGRESS REPORT
// PUT /api/superadmin/students/:studentId/progress-report/certificate
// ---------------------------------------------------------------------------
const uploadCertificateToProgressReportAdmin = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  let report = await ProgressReport.findOne({ student: studentId });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found for this student' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach a PDF file' });
  }

  // Remove previous certificate from Cloudinary if it exists
  if (report.certificatePdfPublicId) {
    try {
      await deleteFromCloudinary(report.certificatePdfPublicId, 'raw');
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  report.certificatePdf = req.file.path;        // Cloudinary secure URL
  report.certificatePdfPublicId = req.file.filename; // Cloudinary public_id
  await report.save();

  // Explicitly emit socket update for the student portal to refresh
  const socketHelper = require('../socketHelper');
  socketHelper.emitProgressUpdate(studentId);

  res.json({
    success: true,
    message: 'Certificate uploaded successfully',
    certificatePdf: report.certificatePdf,
  });
});

// ---------------------------------------------------------------------------
// DELETE CERTIFICATE PDF FROM PROGRESS REPORT
// DELETE /api/superadmin/students/:studentId/progress-report/certificate
// ---------------------------------------------------------------------------
const deleteCertificateFromProgressReportAdmin = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  let report = await ProgressReport.findOne({ student: studentId });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found for this student' });
  }

  // Remove certificate from Cloudinary if it exists
  if (report.certificatePdfPublicId) {
    try {
      await deleteFromCloudinary(report.certificatePdfPublicId, 'raw');
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  report.certificatePdf = null;
  report.certificatePdfPublicId = null;
  await report.save();

  // Explicitly emit socket update for the student portal to refresh
  const socketHelper = require('../socketHelper');
  socketHelper.emitProgressUpdate(studentId);

  res.json({
    success: true,
    message: 'Certificate deleted successfully',
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
  deleteApplication,
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
  deleteGradeCardAdmin,
  uploadStudentProfilePhotoAdmin,
  deleteStudentProfilePhotoAdmin,
  markAttendanceAdmin,
  deleteAttendanceAdmin,
  bulkUploadAttendanceAdmin,
  exportAttendanceAdmin,
  exportEntriesAdmin,
  bulkUploadEntriesAdmin,
  exportGradeCardAdmin,
  importGradeCardAdmin,
  exportFullProgressReportAdmin,
  importFullProgressReportAdmin,
  downloadBulkProgressTemplateAdmin,
  bulkImportStudentsAndProgressReportsAdmin,
  updateStudentProfileAdmin,
  uploadCertificateToProgressReportAdmin,
  deleteCertificateFromProgressReportAdmin,
};
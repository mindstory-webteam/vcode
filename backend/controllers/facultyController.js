const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const ProgressReport = require('../models/ProgressReport');
const { deleteFromCloudinary } = require('../middleware/uploadMiddleware');
const XLSX = require('xlsx');
const { buildGradeCardWorkbook, parseGradeCardWorkbook } = require('../utils/gradeCardExcel');
const { buildProgressReportWorkbook, parseProgressReportWorkbook } = require('../utils/progressReportExcel');

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
    .populate('gradeCard.lastUpdatedBy', 'name role')
    .populate('attendance.markedBy', 'name role');

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
// PROGRESS ENTRIES — Excel export and bulk import (Faculty, assigned
// students only). Bulk import always appends new entries (entries don't
// have a natural per-row unique key like attendance's date, so there's no
// upsert-by-date equivalent here).
// ---------------------------------------------------------------------------

const VALID_ENTRY_CATEGORIES = ['academic', 'attendance', 'behavior', 'project', 'exam', 'other'];

// @desc    Export an assigned student's progress entries as an .xlsx file
// @route   GET /api/faculty/students/:studentId/progress-report/entries/export
// @access  Private/Faculty
const exportEntries = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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

// @desc    Bulk-add progress entries from an Excel file (.xlsx/.xls) for an
//          assigned student. Expected columns (case-insensitive header row):
//          Title | Category | Description | Marks | Grade | Remarks
//          Category must be one of: academic, attendance, behavior, project,
//          exam, other — anything else falls back to "other". Every valid
//          row is appended as a new entry (no de-duplication).
// @route   POST /api/faculty/students/:studentId/progress-report/entries/bulk-upload
// @access  Private/Faculty
// form-data: file (single .xlsx/.xls)
const bulkUploadEntries = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
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
    message: `Bulk import complete — ${results.added} entries added${
      results.failed.length ? `, ${results.failed.length} failed` : ''
    }`,
    ...results,
    report,
  });
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
    message: 'Grade card updated',
    report,
  });
});

// @desc    Export an assigned student's grade card as a multi-sheet .xlsx file
// @route   GET /api/faculty/students/:studentId/progress-report/grade-card/export
// @access  Private/Faculty
const exportGradeCard = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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

// @desc    Import / replace the grade card for an assigned student from an
//          uploaded .xlsx file matching the export format (Overview +
//          Skill Scores + Experience Stats + Verified Skills + Portfolio
//          Highlights + Achievements + Mentor Ratings sheets). Only sheets
//          present in the file are applied — remove a sheet before
//          re-uploading to leave that part of the grade card untouched.
// @route   POST /api/faculty/students/:studentId/progress-report/grade-card/import
// @access  Private/Faculty
// form-data: file (single .xlsx/.xls)
const importGradeCard = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
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
// attendance + grade card) as ONE multi-sheet .xlsx file, for an assigned
// student only.
// ---------------------------------------------------------------------------

// @desc    Export an assigned student's FULL progress report as one .xlsx
// @route   GET /api/faculty/students/:studentId/progress-report/export
// @access  Private/Faculty
const exportFullProgressReport = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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

// @desc    Bulk import the FULL progress report from one Excel file, for an
//          assigned student. Sheets: Overview | Entries | Attendance |
//          Skill Scores | Experience Stats | Verified Skills |
//          Portfolio Highlights | Achievements | Mentor Ratings.
//          - Overview sets overallRemarks + gradeCard scalar fields.
//          - Entries REPLACES the entries array (no dedup key exists).
//          - Attendance upserts by date.
//          - Grade-card array sheets replace their arrays.
//          Only sheets present in the file are applied.
// @route   POST /api/faculty/students/:studentId/progress-report/import
// @access  Private/Faculty
// form-data: file (single .xlsx/.xls)
const importFullProgressReport = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
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
// ATTENDANCE — Faculty can mark/update attendance ONLY for students
// assigned to them. One record per calendar date; marking the same date
// again updates the existing record instead of creating a duplicate.
// ---------------------------------------------------------------------------

const VALID_ATTENDANCE_STATUSES = ['present', 'absent', 'half_day', 'leave'];

// @desc    Mark or update attendance for a specific date (upsert by date)
// @route   PUT /api/faculty/students/:studentId/progress-report/attendance
// @access  Private/Faculty
// body: { date, status, remarks }
const markAttendance = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const { date, status, remarks } = req.body;
  if (!date || !status) {
    return res.status(400).json({ success: false, message: 'date and status are required' });
  }

  let report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
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

// @desc    Delete an attendance record
// @route   DELETE /api/faculty/students/:studentId/progress-report/attendance/:attendanceId
// @access  Private/Faculty
const deleteAttendance = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

  const report = await ProgressReport.findOne({ student: student._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  report.attendance.pull({ _id: req.params.attendanceId });
  await report.save();

  res.json({ success: true, message: 'Attendance record removed', report });
});

// @desc    Bulk upload attendance from an Excel file (.xlsx/.xls) for an
//          assigned student. Expected columns (case-insensitive header row):
//          Date | Status | Remarks
//          Date accepts real Excel date cells or common date strings.
//          Status must be one of: present, absent, half_day (or "half day"), leave.
//          One record per date — matching an existing date updates it instead
//          of creating a duplicate, same as the single markAttendance route.
// @route   POST /api/faculty/students/:studentId/progress-report/attendance/bulk-upload
// @access  Private/Faculty
// form-data: file (single .xlsx/.xls)
const bulkUploadAttendance = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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
    report = await ProgressReport.create({ student: student._id, faculty: req.user._id });
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
    message: `Bulk upload complete — ${results.added} added, ${results.updated} updated${
      results.failed.length ? `, ${results.failed.length} failed` : ''
    }`,
    ...results,
    report,
  });
});

// @desc    Export an assigned student's attendance records as an .xlsx file
// @route   GET /api/faculty/students/:studentId/progress-report/attendance/export
// @access  Private/Faculty
const exportAttendance = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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

// @desc    Delete profile photo for assigned student
// @route   DELETE /api/faculty/students/:studentId/profile-photo
// @access  Private/Faculty
const deleteStudentProfilePhoto = asyncHandler(async (req, res) => {
  const student = await ensureStudentIsAssigned(req.user._id, req.params.studentId);
  if (!student) {
    return res.status(403).json({ success: false, message: 'This student is not assigned to you' });
  }

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

module.exports = {
  getMyStudents,
  getStudentProgressReport,
  addProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  updateOverallRemarks,
  updateGradeCard,
  uploadStudentProfilePhoto,
  deleteStudentProfilePhoto,
  markAttendance,
  deleteAttendance,
  bulkUploadAttendance,
  exportAttendance,
  exportEntries,
  bulkUploadEntries,
  exportGradeCard,
  importGradeCard,
  exportFullProgressReport,
  importFullProgressReport,
};
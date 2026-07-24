const express = require('express');
const router = express.Router();
const {
  getMyStudents,
  getStudentProgressReport,
  addProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  updateOverallRemarks,
  updateGradeCard,
  uploadStudentProfilePhoto,
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
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadProfileImage, uploadExcel } = require('../middleware/uploadMiddleware');

// Every route here requires a logged-in faculty member
router.use(protect, authorize('faculty'));

router.get('/students', getMyStudents);
router.get('/students/:studentId/progress-report', getStudentProgressReport);
router.post('/students/:studentId/progress-report/entries', addProgressEntry);
router.put('/students/:studentId/progress-report/entries/:entryId', updateProgressEntry);
router.delete('/students/:studentId/progress-report/entries/:entryId', deleteProgressEntry);
router.get('/students/:studentId/progress-report/entries/export', exportEntries);
router.post(
  '/students/:studentId/progress-report/entries/bulk-upload',
  uploadExcel.single('file'),
  bulkUploadEntries
);
router.put('/students/:studentId/progress-report/remarks', updateOverallRemarks);
router.put('/students/:studentId/progress-report/grade-card', updateGradeCard);
router.get('/students/:studentId/progress-report/grade-card/export', exportGradeCard);
router.post(
  '/students/:studentId/progress-report/grade-card/import',
  uploadExcel.single('file'),
  importGradeCard
);

// Full-report (remarks + entries + attendance + grade card) single-file export/import
router.get('/students/:studentId/progress-report/export', exportFullProgressReport);
router.post(
  '/students/:studentId/progress-report/import',
  uploadExcel.single('file'),
  importFullProgressReport
);

router.put('/students/:studentId/progress-report/attendance', markAttendance);
router.delete('/students/:studentId/progress-report/attendance/:attendanceId', deleteAttendance);
router.post(
  '/students/:studentId/progress-report/attendance/bulk-upload',
  uploadExcel.single('file'),
  bulkUploadAttendance
);
router.get('/students/:studentId/progress-report/attendance/export', exportAttendance);
router.put('/students/:studentId/profile-photo', uploadProfileImage.single('photo'), uploadStudentProfilePhoto);

module.exports = router;
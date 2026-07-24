const express = require('express');
const router = express.Router();
const {
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
  bulkUploadAttendanceAdmin,
  exportAttendanceAdmin,
} = require('../controllers/superadminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadProfileImage, uploadExcel } = require('../middleware/uploadMiddleware');

// Every route here requires a logged-in superadmin
router.use(protect, authorize('superadmin'));

router.get('/dashboard', getDashboardStats);

// Faculty management
router.post('/faculty', createFaculty);
router.post('/faculty/bulk', bulkCreateFaculty);
router.get('/faculty', getAllFaculty);

// Student registration applications
router.get('/applications', getApplications);
router.get('/applications/:id', getApplicationById);
router.put('/applications/:id/approve', approveApplication);
router.put('/applications/:id/reject', rejectApplication);

// Student management
router.post('/students', createStudent);
router.get('/students', getAllStudents);
router.put('/students/:id/assign-faculty', assignFaculty);

// Progress report management (SuperAdmin can manage ANY student, no assignment restriction)
router.get('/students/:studentId/progress-report', getStudentProgressReportAdmin);
router.post('/students/:studentId/progress-report/entries', addProgressEntryAdmin);
router.put('/students/:studentId/progress-report/entries/:entryId', updateProgressEntryAdmin);
router.delete('/students/:studentId/progress-report/entries/:entryId', deleteProgressEntryAdmin);
router.put('/students/:studentId/progress-report/remarks', updateOverallRemarksAdmin);
router.put('/students/:studentId/progress-report/grade-card', updateGradeCardAdmin);
router.put('/students/:studentId/progress-report/attendance', markAttendanceAdmin);
router.delete('/students/:studentId/progress-report/attendance/:attendanceId', deleteAttendanceAdmin);
router.post(
  '/students/:studentId/progress-report/attendance/bulk-upload',
  uploadExcel.single('file'),
  bulkUploadAttendanceAdmin
);
router.get('/students/:studentId/progress-report/attendance/export', exportAttendanceAdmin);
router.put('/students/:studentId/profile-photo', uploadProfileImage.single('photo'), uploadStudentProfilePhotoAdmin);

// General user management
router.put('/users/:id/toggle-active', toggleUserActive);
router.delete('/users/:id', deleteUser);

module.exports = router;
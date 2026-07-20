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
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadProfileImage } = require('../middleware/uploadMiddleware');

// Every route here requires a logged-in faculty member
router.use(protect, authorize('faculty'));

router.get('/students', getMyStudents);
router.get('/students/:studentId/progress-report', getStudentProgressReport);
router.post('/students/:studentId/progress-report/entries', addProgressEntry);
router.put('/students/:studentId/progress-report/entries/:entryId', updateProgressEntry);
router.delete('/students/:studentId/progress-report/entries/:entryId', deleteProgressEntry);
router.put('/students/:studentId/progress-report/remarks', updateOverallRemarks);
router.put('/students/:studentId/progress-report/grade-card', updateGradeCard);
router.put('/students/:studentId/profile-photo', uploadProfileImage.single('photo'), uploadStudentProfilePhoto);

module.exports = router;
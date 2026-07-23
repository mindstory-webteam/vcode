const express = require('express');
const router = express.Router();
const { getMyProgressReport, uploadDocument, deleteDocument } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadDocument: uploadDocMiddleware } = require('../middleware/uploadMiddleware');

// Every route here requires a logged-in, approved student
router.use(protect, authorize('student'));

router.get('/progress-report', getMyProgressReport);
router.post('/documents', uploadDocMiddleware.single('file'), uploadDocument);
router.delete('/documents/:docId', deleteDocument);

module.exports = router;
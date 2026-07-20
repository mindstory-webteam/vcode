const asyncHandler = require('../middleware/asyncHandler');
const ProgressReport = require('../models/ProgressReport');
const { deleteFromCloudinary } = require('../middleware/uploadMiddleware');

// @desc    Get logged-in student's own progress report
// @route   GET /api/student/progress-report
// @access  Private/Student
const getMyProgressReport = asyncHandler(async (req, res) => {
  const report = await ProgressReport.findOne({ student: req.user._id })
    .populate('faculty', 'name email facultyInfo')
    .populate('entries.updatedBy', 'name role')
    .populate('documents.uploadedBy', 'name role');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  res.json({ success: true, report });
});

// @desc    Upload a supporting document (certificate, assignment, etc.)
// @route   POST /api/student/documents
// @access  Private/Student
// form-data: file (single), description (text, optional)
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please attach a file' });
  }

  let report = await ProgressReport.findOne({ student: req.user._id });
  if (!report) {
    report = await ProgressReport.create({ student: req.user._id });
  }

  report.documents.push({
    fileName: req.file.originalname,
    filePath: req.file.path, // Cloudinary secure URL
    publicId: req.file.filename, // Cloudinary public_id (needed for deletion)
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    description: req.body.description || '',
    uploadedBy: req.user._id,
  });
  await report.save();

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    document: report.documents[report.documents.length - 1],
  });
});

// @desc    Delete own uploaded document
// @route   DELETE /api/student/documents/:docId
// @access  Private/Student
const deleteDocument = asyncHandler(async (req, res) => {
  const report = await ProgressReport.findOne({ student: req.user._id });
  if (!report) {
    return res.status(404).json({ success: false, message: 'Progress report not found' });
  }

  const doc = report.documents.id(req.params.docId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Remove the file from Cloudinary first
  // (PDF/DOCX were uploaded as 'raw', images as 'image')
  if (doc.publicId) {
    const resourceType = doc.fileType && doc.fileType.startsWith('image/') ? 'image' : 'raw';
    try {
      await deleteFromCloudinary(doc.publicId, resourceType);
    } catch (err) {
      // Don't block DB cleanup if Cloudinary delete fails; log for later cleanup
      console.error('Cloudinary delete failed:', err.message);
    }
  }

  report.documents.pull({ _id: req.params.docId });
  await report.save();

  res.json({ success: true, message: 'Document deleted' });
});

module.exports = { getMyProgressReport, uploadDocument, deleteDocument };
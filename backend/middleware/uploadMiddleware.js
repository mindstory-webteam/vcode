// middleware/upload.js
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// ---------- helpers ----------
const makePublicId = (file) => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname);
  const safeBase = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  return `${safeBase}-${uniqueSuffix}`;
};

// ---------- storage: documents (PDF, DOC/DOCX, images) ----------
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'uploads/documents',
      public_id: makePublicId(file),
      // 'auto' lets Cloudinary treat PDFs/DOCX as raw files and JPG/PNG as images
      resource_type: isImage ? 'image' : 'raw',
      // keep the original extension for raw files so download links work
      format: isImage ? undefined : path.extname(file.originalname).slice(1),
    };
  },
});

// ---------- storage: profile pictures (images only) ----------
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'uploads/profiles',
    public_id: makePublicId(file),
    resource_type: 'image',
    // auto-optimize profile pictures
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
  }),
});

// ---------- file filters (unchanged logic from your original) ----------
const documentFileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: PDF, DOC/DOCX, JPG, PNG'), false);
  }
};

const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG/PNG images are allowed for profile pictures'), false);
  }
};

// ---------- file filter: Excel workbooks (.xlsx / .xls) ----------
const excelFileFilter = (req, file, cb) => {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];
  if (allowed.includes(file.mimetype) || /\.(xlsx|xls)$/i.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx or .xls files are allowed'), false);
  }
};

const maxSizeBytes = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

// ---------- exported uploaders ----------
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: maxSizeBytes },
});

const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: maxSizeBytes },
});

// Excel files (e.g. bulk attendance upload) don't go to Cloudinary — they're
// parsed in-memory by the controller (via the `xlsx` package) and never
// persisted as a file, so this uses memoryStorage instead of CloudinaryStorage.
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: excelFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a spreadsheet
});

// ---------- delete helper (use when replacing/removing files) ----------
// publicId is req.file.filename; pass resourceType 'raw' for PDFs/DOCX
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { uploadDocument, uploadProfileImage, uploadExcel, deleteFromCloudinary };
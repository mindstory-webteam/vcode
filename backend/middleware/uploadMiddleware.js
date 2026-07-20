const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const documentsDir = path.join(__dirname, '..', 'uploads', 'documents');
const profilesDir = path.join(__dirname, '..', 'uploads', 'profiles');
ensureDir(documentsDir);
ensureDir(profilesDir);

const makeStorage = (destDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
      cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
    },
  });

// Allowed types for student document uploads (certificates, assignments, reports, images)
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

// Only images for profile pictures
const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG/PNG images are allowed for profile pictures'), false);
  }
};

const maxSizeBytes = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

const uploadDocument = multer({
  storage: makeStorage(documentsDir),
  fileFilter: documentFileFilter,
  limits: { fileSize: maxSizeBytes },
});

const uploadProfileImage = multer({
  storage: makeStorage(profilesDir),
  fileFilter: imageFileFilter,
  limits: { fileSize: maxSizeBytes },
});

module.exports = { uploadDocument, uploadProfileImage };

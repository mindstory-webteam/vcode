const mongoose = require('mongoose');

// A single update/entry added by the faculty (grades, remarks, attendance, etc.)
const entrySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['academic', 'attendance', 'behavior', 'project', 'exam', 'other'],
      default: 'other',
    },
    description: { type: String, trim: true },
    marks: { type: Number, default: null }, // optional numeric score
    grade: { type: String, default: null }, // optional letter grade
    remarks: { type: String, trim: true },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// A document uploaded by the student (certificates, assignments, etc.)
const documentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, required: true }, // relative path, served statically
    fileType: { type: String },
    fileSize: { type: Number },
    description: { type: String, trim: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// ATTENDANCE — one record per calendar date, marked by Faculty (assigned
// students only) or SuperAdmin (any student). Upserted by date in the
// controller, so there should only ever be one entry per day.
// ---------------------------------------------------------------------------
const attendanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day'],
      required: true,
      default: 'present',
    },
    remarks: { type: String, trim: true },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// GRADE CARD sub-schemas (mirrors the "Verified Grade Card / Industry
// Readiness Report" format — filled in by Faculty or SuperAdmin only)
// ---------------------------------------------------------------------------

// Section 01 / 04: per-skill score (Theory, SEO, Social Media Marketing, etc.)
const skillScoreSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    score: { type: Number, min: 0, max: 100, default: null },
    grade: { type: String, trim: true, default: null }, // e.g. 'A+', 'A', 'B'
  },
  { _id: true }
);

// Section 06: verified skill tags with a score (SEO 96, Meta Ads 93, etc.)
const verifiedSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    score: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: true }
);

// Section 05: flexible key/value stat, e.g. { label: 'Live Client Projects', value: '4' }
const statSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// Section 05: professional / internship experience block
const experienceSchema = new mongoose.Schema(
  {
    role: { type: String, trim: true, default: '' }, // e.g. 'Digital Marketing Intern'
    organization: { type: String, trim: true, default: '' }, // e.g. 'Viral Cat Agency'
    durationLabel: { type: String, trim: true, default: '' }, // e.g. '3 Months'
    hours: { type: Number, default: null }, // e.g. 320
    stats: [statSchema], // Live Client Projects, Client Accounts, SEO Audits, etc.
  },
  { _id: false }
);

// Section 07: portfolio highlight / project card
const portfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: '' },
    tools: [{ type: String, trim: true }],
    result: { type: String, trim: true, default: '' }, // e.g. '+38% qualified leads in 30 days'
    link: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

// Section 09: mentor's star ratings (1-5) per criterion
const mentorRatingSchema = new mongoose.Schema(
  {
    criteria: { type: String, required: true, trim: true }, // Professionalism, Leadership, etc.
    score: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false }
);

const gradeCardSchema = new mongoose.Schema(
  {
    // Header / program info
    program: {
      name: { type: String, trim: true, default: '' }, // e.g. 'Digital Marketing Professional Program'
      code: { type: String, trim: true, default: '' }, // AUTO-GENERATED, e.g. 'VC-260001'
      durationLabel: { type: String, trim: true, default: '' }, // e.g. '3 Months'
      batch: { type: String, trim: true, default: '' }, // e.g. 'Jul 2026'
      summary: { type: String, trim: true, default: '' }, // short description paragraph
    },

    overallGrade: { type: String, trim: true, default: null }, // e.g. 'A+'
    industryReadiness: { type: Number, min: 0, max: 100, default: null }, // overall %
    placementStatus: {
      type: String,
      enum: ['not_ready', 'in_training', 'job_ready', 'placed'],
      default: 'in_training',
    },

    // Section 01 / 04
    skillScores: [skillScoreSchema],

    // Section 02: Industry Readiness breakdown
    readinessBreakdown: {
      technicalSkills: { type: Number, min: 0, max: 100, default: null },
      clientReadiness: { type: Number, min: 0, max: 100, default: null },
      communication: { type: Number, min: 0, max: 100, default: null },
      portfolioDepth: { type: Number, min: 0, max: 100, default: null },
    },

    // Section 05
    experience: experienceSchema,

    // Section 06
    verifiedSkills: [verifiedSkillSchema],

    // Section 07
    portfolioHighlights: [portfolioItemSchema],

    // Section 08
    achievements: [{ type: String, trim: true }], // e.g. 'Top Performer', 'Agency Certified'

    // Section 09
    mentorEvaluation: {
      ratings: [mentorRatingSchema],
      recommendation: { type: String, trim: true, default: '' }, // 'Highly Recommended'
    },

    // Section 10
    mentorRemarks: {
      text: { type: String, trim: true, default: '' },
      mentorName: { type: String, trim: true, default: '' },
      mentorTitle: { type: String, trim: true, default: '' },
    },

    // Section 11
    interviewReadiness: {
      status: { type: String, trim: true, default: '' }, // 'READY FOR PLACEMENT'
      resumeQuality: { type: Number, min: 0, max: 100, default: null },
      portfolioQuality: { type: Number, min: 0, max: 100, default: null },
      communication: { type: Number, min: 0, max: 100, default: null },
      presentationConfidence: { type: Number, min: 0, max: 100, default: null },
    },

    // Verification / issuing metadata
    verification: {
      docId: { type: String, trim: true, default: '' }, // e.g. 'VCA/GC/2026/240001'
      issuedDate: { type: Date, default: null },
      verifyUrl: { type: String, trim: true, default: '' },
      verificationCode: { type: String, trim: true, default: '' },
    },

    // Who last touched the grade card (faculty or superadmin)
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastUpdatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const progressReportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one progress report per student
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    overallRemarks: { type: String, trim: true, default: '' },
    entries: [entrySchema],
    documents: [documentSchema],

    // Certificate PDF uploaded by admin (stored in Cloudinary)
    certificatePdf: { type: String, default: null }, // Cloudinary secure URL
    certificatePdfPublicId: { type: String, default: null }, // Cloudinary public_id

    // New: full grade card, editable only by Faculty (assigned) / SuperAdmin (any)
    gradeCard: { type: gradeCardSchema, default: () => ({}) },

    // New: attendance tracker, editable only by Faculty (assigned) / SuperAdmin (any)
    attendance: [attendanceSchema],
  },
  { timestamps: true }
);

const socketHelper = require('../socketHelper');
const generateProgramCode = require('../utils/generateProgramCode');

// ---------------------------------------------------------------------------
// AUTO PROGRAM CODE + duplicate guards
//
// - Empty gradeCard.program.code  -> generated automatically (VC-260001, ...)
// - Controllers replace the whole `program` object on partial updates, which
//   would blank the code; the previously stored code is restored so a student
//   keeps the SAME code for life.
// - A manually typed code is respected as long as nobody else owns it.
// - To deliberately release the code (e.g. deleteGradeCard), set
//   `report.$locals.clearProgramCode = true` before save().
// ---------------------------------------------------------------------------
progressReportSchema.pre('save', async function (next) {
  const doc = this;

  try {
    if (!doc.gradeCard) doc.gradeCard = {};
    if (!doc.gradeCard.program) doc.gradeCard.program = {};

    const clearing = doc.$locals && doc.$locals.clearProgramCode === true;
    let progCode = (doc.gradeCard.program.code || '').trim();

    if (clearing) {
      doc.gradeCard.program.code = '';
      progCode = '';
    } else {
      // 1. Restore the existing code if this save didn't carry one
      if (!progCode && !doc.isNew) {
        const prev = await mongoose
          .model('ProgressReport')
          .findById(doc._id)
          .select('gradeCard.program.code')
          .lean();
        if (prev?.gradeCard?.program?.code) {
          progCode = prev.gradeCard.program.code.trim();
        }
      }

      // 2. Still nothing -> generate a fresh one (retry if it collides with a
      //    manually entered code)
      if (!progCode) {
        for (let i = 0; i < 5; i += 1) {
          const candidate = await generateProgramCode();
          const taken = await mongoose.model('ProgressReport').findOne({
            _id: { $ne: doc._id },
            'gradeCard.program.code': candidate,
          });
          if (!taken) {
            progCode = candidate;
            break;
          }
        }
        if (!progCode) {
          return next(new Error('Could not generate a unique Program Code, please try again.'));
        }
      }

      doc.gradeCard.program.code = progCode;
    }

    // 3. Uniqueness checks (original behaviour kept)
    if (progCode) {
      const duplicate = await mongoose.model('ProgressReport').findOne({
        _id: { $ne: doc._id },
        'gradeCard.program.code': progCode,
      });
      if (duplicate) {
        return next(new Error(`Program Code "${progCode}" is already assigned to another student.`));
      }
    }

    const verCode = doc.gradeCard?.verification?.verificationCode;
    if (verCode && verCode.trim() !== '') {
      const duplicate = await mongoose.model('ProgressReport').findOne({
        _id: { $ne: doc._id },
        'gradeCard.verification.verificationCode': verCode.trim(),
      });
      if (duplicate) {
        return next(new Error(`Verification Code "${verCode}" is already assigned to another student.`));
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
});

progressReportSchema.post('save', function (doc) {
  if (doc && doc.student) {
    socketHelper.emitProgressUpdate(doc.student);
  }
});

progressReportSchema.post('findOneAndUpdate', function (doc) {
  if (doc && doc.student) {
    socketHelper.emitProgressUpdate(doc.student);
  }
});

module.exports = mongoose.model('ProgressReport', progressReportSchema);
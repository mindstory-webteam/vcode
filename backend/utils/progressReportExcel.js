// utils/progressReportExcel.js
//
// Full ProgressReport <-> multi-sheet .xlsx conversion. Extends the same
// pattern as gradeCardExcel.js but adds Overall Remarks, Entries, and
// Attendance sheets so the WHOLE report can be exported/imported at once.

const XLSX = require('xlsx');

function addSheet(workbook, name, rows, headers) {
  const sheet = rows.length
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.json_to_sheet([{}], { header: headers });
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

const VALID_ENTRY_CATEGORIES = ['academic', 'attendance', 'behavior', 'project', 'exam', 'other'];
const VALID_ATTENDANCE_STATUSES = ['present', 'absent', 'half_day', 'leave'];

// ---------------------------------------------------------------------------
// Build: full report -> multi-sheet workbook
// ---------------------------------------------------------------------------
function buildProgressReportWorkbook(report = {}) {
  const gc = report.gradeCard || {};
  const workbook = XLSX.utils.book_new();

  // ---- Overview: overall remarks + all gradeCard scalar fields ----
  const overviewRows = [
    { Field: 'Overall Remarks', Value: report.overallRemarks || '' },
    { Field: 'Program Name', Value: gc.program?.name || '' },
    { Field: 'Program Code', Value: gc.program?.code || '' },
    { Field: 'Duration', Value: gc.program?.durationLabel || '' },
    { Field: 'Batch', Value: gc.program?.batch || '' },
    { Field: 'Program Summary', Value: gc.program?.summary || '' },
    { Field: 'Overall Grade', Value: gc.overallGrade || '' },
    { Field: 'Industry Readiness (%)', Value: gc.industryReadiness ?? '' },
    { Field: 'Placement Status', Value: gc.placementStatus || '' },
    { Field: 'Readiness - Technical Skills (%)', Value: gc.readinessBreakdown?.technicalSkills ?? '' },
    { Field: 'Readiness - Client Readiness (%)', Value: gc.readinessBreakdown?.clientReadiness ?? '' },
    { Field: 'Readiness - Communication (%)', Value: gc.readinessBreakdown?.communication ?? '' },
    { Field: 'Readiness - Portfolio Depth (%)', Value: gc.readinessBreakdown?.portfolioDepth ?? '' },
    { Field: 'Experience Role', Value: gc.experience?.role || '' },
    { Field: 'Experience Organization', Value: gc.experience?.organization || '' },
    { Field: 'Experience Duration', Value: gc.experience?.durationLabel || '' },
    { Field: 'Experience Hours', Value: gc.experience?.hours ?? '' },
    { Field: 'Mentor Recommendation', Value: gc.mentorEvaluation?.recommendation || '' },
    { Field: 'Mentor Remarks Text', Value: gc.mentorRemarks?.text || '' },
    { Field: 'Mentor Name', Value: gc.mentorRemarks?.mentorName || '' },
    { Field: 'Mentor Title', Value: gc.mentorRemarks?.mentorTitle || '' },
    { Field: 'Interview Readiness Status', Value: gc.interviewReadiness?.status || '' },
    { Field: 'Interview - Resume Quality (%)', Value: gc.interviewReadiness?.resumeQuality ?? '' },
    { Field: 'Interview - Portfolio Quality (%)', Value: gc.interviewReadiness?.portfolioQuality ?? '' },
    { Field: 'Interview - Communication (%)', Value: gc.interviewReadiness?.communication ?? '' },
    { Field: 'Interview - Presentation Confidence (%)', Value: gc.interviewReadiness?.presentationConfidence ?? '' },
    { Field: 'Verification Doc ID', Value: gc.verification?.docId || '' },
    {
      Field: 'Verification Issued Date',
      Value: gc.verification?.issuedDate ? new Date(gc.verification.issuedDate).toLocaleDateString('en-GB') : '',
    },
    { Field: 'Verification URL', Value: gc.verification?.verifyUrl || '' },
    { Field: 'Verification Code', Value: gc.verification?.verificationCode || '' },
  ];
  const overviewSheet = XLSX.utils.json_to_sheet(overviewRows);
  overviewSheet['!cols'] = [{ wch: 34 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // ---- Entries ----
  addSheet(
    workbook,
    'Entries',
    (report.entries || []).map((e) => ({
      Title: e.title,
      Category: e.category,
      Description: e.description || '',
      Marks: e.marks ?? '',
      Grade: e.grade || '',
      Remarks: e.remarks || '',
    })),
    ['Title', 'Category', 'Description', 'Marks', 'Grade', 'Remarks']
  );

  // ---- Attendance ----
  addSheet(
    workbook,
    'Attendance',
    (report.attendance || []).map((a) => ({
      Date: a.date ? new Date(a.date).toLocaleDateString('en-GB') : '',
      Status: a.status,
      Remarks: a.remarks || '',
    })),
    ['Date', 'Status', 'Remarks']
  );

  // ---- Grade-card array sheets (same as gradeCardExcel.js) ----
  addSheet(
    workbook,
    'Skill Scores',
    (gc.skillScores || []).map((s) => ({ 'Skill Name': s.skillName, Score: s.score ?? '', Grade: s.grade || '' })),
    ['Skill Name', 'Score', 'Grade']
  );
  addSheet(
    workbook,
    'Experience Stats',
    (gc.experience?.stats || []).map((s) => ({ Label: s.label, Value: s.value })),
    ['Label', 'Value']
  );
  addSheet(
    workbook,
    'Verified Skills',
    (gc.verifiedSkills || []).map((s) => ({ 'Skill Name': s.skillName, Score: s.score ?? '' })),
    ['Skill Name', 'Score']
  );
  addSheet(
    workbook,
    'Portfolio Highlights',
    (gc.portfolioHighlights || []).map((p) => ({
      Title: p.title,
      Role: p.role || '',
      Tools: (p.tools || []).join(', '),
      Result: p.result || '',
      Link: p.link || '',
    })),
    ['Title', 'Role', 'Tools', 'Result', 'Link']
  );
  addSheet(
    workbook,
    'Achievements',
    (gc.achievements || []).map((a) => ({ Achievement: a })),
    ['Achievement']
  );
  addSheet(
    workbook,
    'Mentor Ratings',
    (gc.mentorEvaluation?.ratings || []).map((r) => ({ Criteria: r.criteria, Score: r.score })),
    ['Criteria', 'Score']
  );

  const widthMap = {
    Entries: [{ wch: 28 }, { wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 34 }],
    Attendance: [{ wch: 12 }, { wch: 12 }, { wch: 32 }],
    'Skill Scores': [{ wch: 28 }, { wch: 14 }, { wch: 14 }],
    'Experience Stats': [{ wch: 28 }, { wch: 14 }],
    'Verified Skills': [{ wch: 28 }, { wch: 14 }],
    Achievements: [{ wch: 40 }],
    'Mentor Ratings': [{ wch: 28 }, { wch: 14 }],
    'Portfolio Highlights': [{ wch: 26 }, { wch: 20 }, { wch: 30 }, { wch: 34 }, { wch: 30 }],
  };
  Object.entries(widthMap).forEach(([name, cols]) => {
    if (workbook.Sheets[name]) workbook.Sheets[name]['!cols'] = cols;
  });

  return workbook;
}

// ---------------------------------------------------------------------------
// Parse: uploaded workbook -> { overallRemarks?, entries?, attendance?,
//                                attendanceErrors?, gradeCard? }
//
// Only sheets present in the file produce a key — same "partial update"
// contract as gradeCardExcel.js, so deleting a sheet before re-upload
// leaves that section of the report untouched.
// ---------------------------------------------------------------------------
function parseProgressReportWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const getSheet = (name) => {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : null;
  };
  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));

  const result = {};

  const overviewRows = getSheet('Overview');
  if (overviewRows) {
    const map = {};
    overviewRows.forEach((r) => {
      const field = (r.Field || r.field || '').toString().trim();
      if (field) map[field] = r.Value ?? r.value ?? '';
    });

    result.overallRemarks = map['Overall Remarks'] || '';

    result.gradeCard = result.gradeCard || {};
    const gc = result.gradeCard;
    gc.program = {
      name: map['Program Name'] || '',
      code: map['Program Code'] || '',
      durationLabel: map['Duration'] || '',
      batch: map['Batch'] || '',
      summary: map['Program Summary'] || '',
    };
    gc.overallGrade = map['Overall Grade'] || null;
    gc.industryReadiness = num(map['Industry Readiness (%)']);
    gc.placementStatus = map['Placement Status'] || 'in_training';
    gc.readinessBreakdown = {
      technicalSkills: num(map['Readiness - Technical Skills (%)']),
      clientReadiness: num(map['Readiness - Client Readiness (%)']),
      communication: num(map['Readiness - Communication (%)']),
      portfolioDepth: num(map['Readiness - Portfolio Depth (%)']),
    };
    gc.experience = {
      role: map['Experience Role'] || '',
      organization: map['Experience Organization'] || '',
      durationLabel: map['Experience Duration'] || '',
      hours: num(map['Experience Hours']),
      stats: [],
    };
    gc.mentorEvaluation = { ratings: [], recommendation: map['Mentor Recommendation'] || '' };
    gc.mentorRemarks = {
      text: map['Mentor Remarks Text'] || '',
      mentorName: map['Mentor Name'] || '',
      mentorTitle: map['Mentor Title'] || '',
    };
    gc.interviewReadiness = {
      status: map['Interview Readiness Status'] || '',
      resumeQuality: num(map['Interview - Resume Quality (%)']),
      portfolioQuality: num(map['Interview - Portfolio Quality (%)']),
      communication: num(map['Interview - Communication (%)']),
      presentationConfidence: num(map['Interview - Presentation Confidence (%)']),
    };
    const issuedRaw = map['Verification Issued Date'];
    let issuedDate = null;
    if (issuedRaw) {
      const d = issuedRaw instanceof Date ? issuedRaw : new Date(issuedRaw);
      if (!isNaN(d.getTime())) issuedDate = d;
    }
    gc.verification = {
      docId: map['Verification Doc ID'] || '',
      issuedDate,
      verifyUrl: map['Verification URL'] || '',
      verificationCode: map['Verification Code'] || '',
    };
  }

  // Entries sheet: treated as the COMPLETE list (entries have no natural
  // dedup key, so on a full-report re-upload we replace rather than append).
  const entryRows = getSheet('Entries');
  if (entryRows) {
    result.entries = entryRows
      .filter((r) => (r.Title || '').toString().trim())
      .map((r) => {
        let category = (r.Category || 'other').toString().trim().toLowerCase();
        if (!VALID_ENTRY_CATEGORIES.includes(category)) category = 'other';
        const marksRaw = r.Marks;
        return {
          title: r.Title.toString().trim(),
          category,
          description: (r.Description || '').toString().trim(),
          marks: marksRaw === '' || marksRaw === undefined ? undefined : Number(marksRaw),
          grade: (r.Grade || '').toString().trim() || undefined,
          remarks: (r.Remarks || '').toString().trim(),
        };
      });
  }

  // Attendance sheet: upserted by date, same semantics as the standalone
  // attendance bulk-upload route.
  const attendanceRows = getSheet('Attendance');
  if (attendanceRows) {
    result.attendance = [];
    result.attendanceErrors = [];
    attendanceRows.forEach((r, idx) => {
      const rawDate = r.Date;
      const rawStatusInput = (r.Status || '').toString();
      const rawStatus = rawStatusInput.trim().toLowerCase().replace(/\s+/g, '_');
      const remarks = (r.Remarks || '').toString().trim();

      if (!rawDate) {
        result.attendanceErrors.push({ row: idx + 2, reason: 'Missing date' });
        return;
      }
      const day = rawDate instanceof Date ? new Date(rawDate) : new Date(rawDate);
      if (isNaN(day.getTime())) {
        result.attendanceErrors.push({ row: idx + 2, reason: 'Invalid date' });
        return;
      }
      day.setHours(0, 0, 0, 0);

      if (!VALID_ATTENDANCE_STATUSES.includes(rawStatus)) {
        result.attendanceErrors.push({
          row: idx + 2,
          reason: `Invalid status "${rawStatusInput}" (use present, absent, half_day, or leave)`,
        });
        return;
      }
      result.attendance.push({ date: day, status: rawStatus, remarks });
    });
  }

  result.gradeCard = result.gradeCard || {};
  const skillScoreRows = getSheet('Skill Scores');
  if (skillScoreRows) {
    result.gradeCard.skillScores = skillScoreRows
      .filter((r) => (r['Skill Name'] || '').toString().trim())
      .map((r) => ({
        skillName: r['Skill Name'].toString().trim(),
        score: num(r.Score),
        grade: (r.Grade || '').toString().trim() || null,
      }));
  }
  const statRows = getSheet('Experience Stats');
  if (statRows) {
    const stats = statRows
      .filter((r) => (r.Label || '').toString().trim())
      .map((r) => ({ label: r.Label.toString().trim(), value: (r.Value || '').toString().trim() }));
    result.gradeCard.experience = result.gradeCard.experience || {
      role: '', organization: '', durationLabel: '', hours: null, stats: [],
    };
    result.gradeCard.experience.stats = stats;
  }
  const verifiedRows = getSheet('Verified Skills');
  if (verifiedRows) {
    result.gradeCard.verifiedSkills = verifiedRows
      .filter((r) => (r['Skill Name'] || '').toString().trim())
      .map((r) => ({ skillName: r['Skill Name'].toString().trim(), score: num(r.Score) }));
  }
  const portfolioRows = getSheet('Portfolio Highlights');
  if (portfolioRows) {
    result.gradeCard.portfolioHighlights = portfolioRows
      .filter((r) => (r.Title || '').toString().trim())
      .map((r) => ({
        title: r.Title.toString().trim(),
        role: (r.Role || '').toString().trim(),
        tools: (r.Tools || '').toString().split(',').map((t) => t.trim()).filter(Boolean),
        result: (r.Result || '').toString().trim(),
        link: (r.Link || '').toString().trim(),
      }));
  }
  const achievementRows = getSheet('Achievements');
  if (achievementRows) {
    result.gradeCard.achievements = achievementRows.map((r) => (r.Achievement || '').toString().trim()).filter(Boolean);
  }
  const ratingRows = getSheet('Mentor Ratings');
  if (ratingRows) {
    const ratings = ratingRows
      .filter((r) => (r.Criteria || '').toString().trim())
      .map((r) => ({ criteria: r.Criteria.toString().trim(), score: Number(r.Score) || 1 }));
    result.gradeCard.mentorEvaluation = result.gradeCard.mentorEvaluation || { ratings: [], recommendation: '' };
    result.gradeCard.mentorEvaluation.ratings = ratings;
  }
  if (Object.keys(result.gradeCard).length === 0) delete result.gradeCard;

  return result;
}

module.exports = { buildProgressReportWorkbook, parseProgressReportWorkbook };
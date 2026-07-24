// utils/gradeCardExcel.js
//
// Converts a gradeCard object (see ProgressReport model) to/from a
// multi-sheet .xlsx workbook. The grade card has several nested arrays
// (skill scores, portfolio items, mentor ratings, etc.) that don't fit a
// single flat sheet, so each array gets its own sheet and scalar fields
// live together on an "Overview" sheet as Field/Value pairs.
//
// Shared by facultyController.js and superadminController.js so the
// export/import format only needs to be defined once.

const XLSX = require('xlsx');

function addSheet(workbook, name, rows, headers) {
  const sheet = rows.length
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.json_to_sheet([{}], { header: headers }); // keep header row even when empty
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

// ---------------------------------------------------------------------------
// Build: gradeCard object -> multi-sheet workbook
// ---------------------------------------------------------------------------
function buildGradeCardWorkbook(gradeCard = {}) {
  const gc = gradeCard || {};
  const workbook = XLSX.utils.book_new();

  // ---- Overview: all scalar / single-object fields as Field/Value rows ----
  const overviewRows = [
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

  // ---- Skill Scores ----
  addSheet(
    workbook,
    'Skill Scores',
    (gc.skillScores || []).map((s) => ({ 'Skill Name': s.skillName, Score: s.score ?? '', Grade: s.grade || '' })),
    ['Skill Name', 'Score', 'Grade']
  );

  // ---- Experience Stats ----
  addSheet(
    workbook,
    'Experience Stats',
    (gc.experience?.stats || []).map((s) => ({ Label: s.label, Value: s.value })),
    ['Label', 'Value']
  );

  // ---- Verified Skills ----
  addSheet(
    workbook,
    'Verified Skills',
    (gc.verifiedSkills || []).map((s) => ({ 'Skill Name': s.skillName, Score: s.score ?? '' })),
    ['Skill Name', 'Score']
  );

  // ---- Portfolio Highlights ----
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

  // ---- Achievements ----
  addSheet(
    workbook,
    'Achievements',
    (gc.achievements || []).map((a) => ({ Achievement: a })),
    ['Achievement']
  );

  // ---- Mentor Ratings ----
  addSheet(
    workbook,
    'Mentor Ratings',
    (gc.mentorEvaluation?.ratings || []).map((r) => ({ Criteria: r.criteria, Score: r.score })),
    ['Criteria', 'Score']
  );

  // Widen the array-sheet columns a bit
  ['Skill Scores', 'Experience Stats', 'Verified Skills', 'Achievements', 'Mentor Ratings'].forEach((name) => {
    if (workbook.Sheets[name]) workbook.Sheets[name]['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
  });
  if (workbook.Sheets['Portfolio Highlights']) {
    workbook.Sheets['Portfolio Highlights']['!cols'] = [
      { wch: 26 }, { wch: 20 }, { wch: 30 }, { wch: 34 }, { wch: 30 },
    ];
  }

  return workbook;
}

// ---------------------------------------------------------------------------
// Parse: uploaded workbook buffer -> partial gradeCard object
//
// Only sheets that are present in the workbook are translated into fields —
// this lets someone re-upload just an edited "Skill Scores" sheet (deleting
// the others) without wiping out the rest of the grade card, matching the
// same "only provided keys are merged in" behavior as updateGradeCard.
// ---------------------------------------------------------------------------
function parseGradeCardWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const getSheet = (name) => {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : null;
  };
  const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v));

  const gradeCard = {};

  const overviewRows = getSheet('Overview');
  if (overviewRows) {
    const map = {};
    overviewRows.forEach((r) => {
      const field = (r.Field || r.field || '').toString().trim();
      if (field) map[field] = r.Value ?? r.value ?? '';
    });

    gradeCard.program = {
      name: map['Program Name'] || '',
      code: map['Program Code'] || '',
      durationLabel: map['Duration'] || '',
      batch: map['Batch'] || '',
      summary: map['Program Summary'] || '',
    };
    gradeCard.overallGrade = map['Overall Grade'] || null;
    gradeCard.industryReadiness = num(map['Industry Readiness (%)']);
    gradeCard.placementStatus = map['Placement Status'] || 'in_training';
    gradeCard.readinessBreakdown = {
      technicalSkills: num(map['Readiness - Technical Skills (%)']),
      clientReadiness: num(map['Readiness - Client Readiness (%)']),
      communication: num(map['Readiness - Communication (%)']),
      portfolioDepth: num(map['Readiness - Portfolio Depth (%)']),
    };
    gradeCard.experience = {
      role: map['Experience Role'] || '',
      organization: map['Experience Organization'] || '',
      durationLabel: map['Experience Duration'] || '',
      hours: num(map['Experience Hours']),
      stats: [],
    };
    gradeCard.mentorEvaluation = {
      ratings: [],
      recommendation: map['Mentor Recommendation'] || '',
    };
    gradeCard.mentorRemarks = {
      text: map['Mentor Remarks Text'] || '',
      mentorName: map['Mentor Name'] || '',
      mentorTitle: map['Mentor Title'] || '',
    };
    gradeCard.interviewReadiness = {
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
    gradeCard.verification = {
      docId: map['Verification Doc ID'] || '',
      issuedDate,
      verifyUrl: map['Verification URL'] || '',
      verificationCode: map['Verification Code'] || '',
    };
  }

  const skillScoreRows = getSheet('Skill Scores');
  if (skillScoreRows) {
    gradeCard.skillScores = skillScoreRows
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
    gradeCard.experience = gradeCard.experience || { role: '', organization: '', durationLabel: '', hours: null, stats: [] };
    gradeCard.experience.stats = stats;
  }

  const verifiedRows = getSheet('Verified Skills');
  if (verifiedRows) {
    gradeCard.verifiedSkills = verifiedRows
      .filter((r) => (r['Skill Name'] || '').toString().trim())
      .map((r) => ({ skillName: r['Skill Name'].toString().trim(), score: num(r.Score) }));
  }

  const portfolioRows = getSheet('Portfolio Highlights');
  if (portfolioRows) {
    gradeCard.portfolioHighlights = portfolioRows
      .filter((r) => (r.Title || '').toString().trim())
      .map((r) => ({
        title: r.Title.toString().trim(),
        role: (r.Role || '').toString().trim(),
        tools: (r.Tools || '')
          .toString()
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        result: (r.Result || '').toString().trim(),
        link: (r.Link || '').toString().trim(),
      }));
  }

  const achievementRows = getSheet('Achievements');
  if (achievementRows) {
    gradeCard.achievements = achievementRows.map((r) => (r.Achievement || '').toString().trim()).filter(Boolean);
  }

  const ratingRows = getSheet('Mentor Ratings');
  if (ratingRows) {
    const ratings = ratingRows
      .filter((r) => (r.Criteria || '').toString().trim())
      .map((r) => ({ criteria: r.Criteria.toString().trim(), score: Number(r.Score) || 1 }));
    gradeCard.mentorEvaluation = gradeCard.mentorEvaluation || { ratings: [], recommendation: '' };
    gradeCard.mentorEvaluation.ratings = ratings;
  }

  return gradeCard;
}

module.exports = { buildGradeCardWorkbook, parseGradeCardWorkbook };
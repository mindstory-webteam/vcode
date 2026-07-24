const XLSX = require('xlsx');

const VALID_ENTRY_CATEGORIES = ['academic', 'attendance', 'behavior', 'project', 'exam', 'other'];
const VALID_ATTENDANCE_STATUSES = ['present', 'absent', 'half_day', 'leave'];

function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const parsed = Number(v);
  return isNaN(parsed) ? null : parsed;
}

function str(v) {
  return v !== undefined && v !== null ? v.toString().trim() : '';
}

/**
 * Build a sample multi-sheet Excel template for bulk student + progress import.
 */
function buildBulkProgressTemplate() {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    {
      'Full Name': 'John Doe',
      'Email': 'johndoe@gmail.com',
      'Password': 'Password123',
      'Roll Number': '240001',
      'Phone': '9876543210',
      'Department': 'Computer Science',
      'Course': 'B.Tech',
      'Semester': '6th',
      'Assigned Faculty Email': '',
      'Overall Remarks': 'Excellent academic and practical performance.',
      'Program Name': 'Full Stack Web Development',
      'Program Code': 'VC-240001',
      'Duration': '6 Months',
      'Batch': 'BATCH 2026',
      'Program Summary': 'Hands-on web app development, React, Node.js, and Cloud deployment.',
      'Overall Grade': 'A+',
      'Industry Readiness (%)': 95,
      'Placement Status': 'job_ready',
      'Readiness - Technical Skills (%)': 96,
      'Readiness - Client Readiness (%)': 94,
      'Readiness - Communication (%)': 92,
      'Readiness - Portfolio Depth (%)': 95,
      'Experience Role': 'Full Stack Developer Intern',
      'Experience Organization': 'MindStory Tech',
      'Experience Duration': '3 Months',
      'Experience Hours': 320,
      'Mentor Recommendation': 'Highly Recommended',
      'Mentor Remarks Text': 'John is an outstanding developer ready for senior fullstack roles.',
      'Mentor Name': 'Lead Mentor',
      'Mentor Title': 'Senior Tech Lead',
      'Interview Readiness Status': 'READY FOR PLACEMENT',
      'Interview - Resume Quality (%)': 95,
      'Interview - Portfolio Quality (%)': 94,
      'Interview - Communication (%)': 92,
      'Interview - Presentation Confidence (%)': 96,
      'Verification Doc ID': 'VCA/GC/2026/240001',
      'Verification Issued Date': '2026-07-24',
    },
  ]), 'Students');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    {
      'Student Email': 'johndoe@gmail.com',
      'Roll Number': '240001',
      'Title': 'React & Next.js Milestone Project',
      'Category': 'project',
      'Description': 'Built full-stack e-commerce application with Next.js & Stripe.',
      'Marks': 95,
      'Grade': 'A+',
      'Remarks': 'Exceptional UI and clean architecture.',
    },
  ]), 'Entries');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Date': '2026-07-24', 'Status': 'present', 'Remarks': 'On time' },
  ]), 'Attendance');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Skill Name': 'Frontend (React/Next.js)', 'Score': 96, 'Grade': 'A+' },
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Skill Name': 'Backend (Node/Express)', 'Score': 94, 'Grade': 'A' },
  ]), 'Skill Scores');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Skill Name': 'TypeScript', 'Score': 95 },
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Skill Name': 'MongoDB', 'Score': 92 },
  ]), 'Verified Skills');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    {
      'Student Email': 'johndoe@gmail.com',
      'Roll Number': '240001',
      'Title': 'AI Progress Management System',
      'Role': 'Lead Developer',
      'Tools': 'React, Node.js, Socket.io',
      'Result': 'Deployed to production with 99.9% uptime',
      'Link': 'https://example.com',
    },
  ]), 'Portfolio Highlights');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Achievement': 'Top Performer - July 2026' },
  ]), 'Achievements');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Criteria': 'Technical Skills', 'Score': 5 },
    { 'Student Email': 'johndoe@gmail.com', 'Roll Number': '240001', 'Criteria': 'Communication', 'Score': 5 },
  ]), 'Mentor Ratings');

  return workbook;
}

/**
 * Parse a bulk Excel workbook. Returns array of student objects:
 * { account, overallRemarks, entries, attendance, gradeCard }
 */
function parseBulkProgressWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const getSheet = (name) => {
    const s = workbook.Sheets[name];
    return s ? XLSX.utils.sheet_to_json(s, { defval: '' }) : [];
  };

  const map = new Map();

  const getOrInit = (email, rollNumber, name) => {
    const key = (email || rollNumber || '').toString().trim().toLowerCase();
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, { account: { name: name || '', email: email || '', rollNumber: rollNumber || '' }, overallRemarks: undefined, entries: undefined, attendance: undefined, gradeCard: {} });
    }
    return map.get(key);
  };

  // Students sheet
  getSheet('Students').forEach((r) => {
    const email = str(r['Email'] || r['email'] || r['Student Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber'] || r['Roll No']);
    const name = str(r['Full Name'] || r['name'] || r['Name']);
    const d = getOrInit(email, rollNumber, name);
    if (!d) return;
    if (name) d.account.name = name;
    if (email) d.account.email = email;
    if (rollNumber) d.account.rollNumber = rollNumber;
    if (r['Password']) d.account.password = str(r['Password']);
    if (r['Phone']) d.account.phone = str(r['Phone']);
    if (r['Department']) d.account.department = str(r['Department']);
    if (r['Course']) d.account.course = str(r['Course']);
    if (r['Semester']) d.account.semester = str(r['Semester']);
    if (r['Assigned Faculty Email']) d.account.assignedFacultyEmail = str(r['Assigned Faculty Email']);
    if (r['Overall Remarks'] !== undefined) d.overallRemarks = str(r['Overall Remarks']);
    const gc = d.gradeCard;
    if (r['Program Name'] || r['Program Code']) gc.program = { name: str(r['Program Name']), code: str(r['Program Code']), durationLabel: str(r['Duration']), batch: str(r['Batch']), summary: str(r['Program Summary']) };
    if (r['Overall Grade'] !== undefined) gc.overallGrade = str(r['Overall Grade']) || null;
    if (r['Industry Readiness (%)'] !== undefined) gc.industryReadiness = num(r['Industry Readiness (%)']);
    if (r['Placement Status'] !== undefined) gc.placementStatus = str(r['Placement Status']) || 'in_training';
    if (r['Readiness - Technical Skills (%)'] !== undefined) gc.readinessBreakdown = { technicalSkills: num(r['Readiness - Technical Skills (%)']), clientReadiness: num(r['Readiness - Client Readiness (%)']), communication: num(r['Readiness - Communication (%)']), portfolioDepth: num(r['Readiness - Portfolio Depth (%)']) };
    if (r['Experience Role'] || r['Experience Hours'] !== undefined) gc.experience = { role: str(r['Experience Role']), organization: str(r['Experience Organization']), durationLabel: str(r['Experience Duration']), hours: num(r['Experience Hours']), stats: [] };
    if (r['Mentor Recommendation']) { gc.mentorEvaluation = gc.mentorEvaluation || { ratings: [], recommendation: '' }; gc.mentorEvaluation.recommendation = str(r['Mentor Recommendation']); }
    if (r['Mentor Remarks Text'] || r['Mentor Name']) gc.mentorRemarks = { text: str(r['Mentor Remarks Text']), mentorName: str(r['Mentor Name']), mentorTitle: str(r['Mentor Title']) };
    if (r['Interview Readiness Status'] !== undefined) gc.interviewReadiness = { status: str(r['Interview Readiness Status']), resumeQuality: num(r['Interview - Resume Quality (%)']), portfolioQuality: num(r['Interview - Portfolio Quality (%)']), communication: num(r['Interview - Communication (%)']), presentationConfidence: num(r['Interview - Presentation Confidence (%)']) };
    if (r['Verification Doc ID'] || r['Verification Issued Date']) {
      let issuedDate = null;
      const raw = r['Verification Issued Date'];
      if (raw) { const d2 = raw instanceof Date ? raw : new Date(raw); if (!isNaN(d2.getTime())) issuedDate = d2; }
      gc.verification = { docId: str(r['Verification Doc ID']), issuedDate, verifyUrl: str(r['Verification URL']), verificationCode: str(r['Verification Code']) };
    }
  });

  // Entries sheet
  getSheet('Entries').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const title = str(r['Title'] || r['title']);
    if (!title) return;
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.entries = d.entries || [];
    let category = str(r['Category']).toLowerCase();
    if (!VALID_ENTRY_CATEGORIES.includes(category)) category = 'other';
    d.entries.push({ title, category, description: str(r['Description']), marks: r['Marks'] !== '' ? Number(r['Marks']) : undefined, grade: str(r['Grade']) || undefined, remarks: str(r['Remarks']) });
  });

  // Attendance sheet
  getSheet('Attendance').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const rawDate = r['Date'] || r['date'];
    const rawStatus = str(r['Status'] || r['status']).toLowerCase().replace(/\s+/g, '_');
    if (!rawDate || !VALID_ATTENDANCE_STATUSES.includes(rawStatus)) return;
    const day = rawDate instanceof Date ? new Date(rawDate) : new Date(rawDate);
    if (isNaN(day.getTime())) return;
    day.setHours(0, 0, 0, 0);
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.attendance = d.attendance || [];
    d.attendance.push({ date: day, status: rawStatus, remarks: str(r['Remarks']) });
  });

  // Skill Scores sheet
  getSheet('Skill Scores').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const skillName = str(r['Skill Name']);
    if (!skillName) return;
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.gradeCard.skillScores = d.gradeCard.skillScores || [];
    d.gradeCard.skillScores.push({ skillName, score: num(r['Score']), grade: str(r['Grade']) || null });
  });

  // Verified Skills sheet
  getSheet('Verified Skills').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const skillName = str(r['Skill Name']);
    if (!skillName) return;
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.gradeCard.verifiedSkills = d.gradeCard.verifiedSkills || [];
    d.gradeCard.verifiedSkills.push({ skillName, score: num(r['Score']) });
  });

  // Portfolio Highlights sheet
  getSheet('Portfolio Highlights').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const title = str(r['Title']);
    if (!title) return;
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.gradeCard.portfolioHighlights = d.gradeCard.portfolioHighlights || [];
    d.gradeCard.portfolioHighlights.push({ title, role: str(r['Role']), tools: str(r['Tools']).split(',').map(t => t.trim()).filter(Boolean), result: str(r['Result']), link: str(r['Link']) });
  });

  // Achievements sheet
  getSheet('Achievements').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const achievement = str(r['Achievement']);
    if (!achievement) return;
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.gradeCard.achievements = d.gradeCard.achievements || [];
    d.gradeCard.achievements.push(achievement);
  });

  // Mentor Ratings sheet
  getSheet('Mentor Ratings').forEach((r) => {
    const email = str(r['Student Email'] || r['Email']);
    const rollNumber = str(r['Roll Number'] || r['rollNumber']);
    const criteria = str(r['Criteria']);
    if (!criteria) return;
    const d = getOrInit(email, rollNumber);
    if (!d) return;
    d.gradeCard.mentorEvaluation = d.gradeCard.mentorEvaluation || { ratings: [], recommendation: '' };
    d.gradeCard.mentorEvaluation.ratings.push({ criteria, score: Number(r['Score']) || 1 });
  });

  return Array.from(map.values());
}

module.exports = { buildBulkProgressTemplate, parseBulkProgressWorkbook };

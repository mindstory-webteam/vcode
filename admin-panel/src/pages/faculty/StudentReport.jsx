import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import {
  getStudentProgressReport,
  addProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
  updateOverallRemarks,
  updateGradeCard,
  bulkUploadEntries,
  exportEntries,
  importGradeCard,
  exportGradeCard,
  exportFullProgressReport,
  importFullProgressReport,
  fileUrl,
} from '../../api.js';

const CATEGORIES = ['academic', 'attendance', 'behavior', 'project', 'exam', 'other'];
const PLACEMENT_STATUSES = ['not_ready', 'in_training', 'job_ready', 'placed'];

const emptyEntry = { title: '', category: 'academic', description: '', marks: '', grade: '', remarks: '' };

const emptyGradeCard = {
  program: { name: '', code: '', durationLabel: '', batch: '', summary: '' },
  overallGrade: '',
  industryReadiness: '',
  placementStatus: 'in_training',
  skillScores: [],
  readinessBreakdown: { technicalSkills: '', clientReadiness: '', communication: '', portfolioDepth: '' },
  experience: { role: '', organization: '', durationLabel: '', hours: '', stats: [] },
  verifiedSkills: [],
  portfolioHighlights: [],
  achievements: [],
  mentorEvaluation: { ratings: [], recommendation: '' },
  mentorRemarks: { text: '', mentorName: '', mentorTitle: '' },
  interviewReadiness: { status: '', resumeQuality: '', portfolioQuality: '', communication: '', presentationConfidence: '' },
  verification: { docId: '', issuedDate: '', verifyUrl: '', verificationCode: '' },
};

// ---------------------------------------------------------------------------
// Small design-system helpers for the grade card page, matching the
// registrar dashboard look: light-purple icon badges, serif stat numbers,
// small-caps captions, and airy card sections.
// ---------------------------------------------------------------------------
const ACCENT = '#7c3aed';
const ACCENT_BG = '#f3ecff';

const statGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 28,
};

const statCardStyle = {
  background: '#fff',
  border: '1px solid var(--paper-line)',
  borderRadius: 10,
  padding: '20px 22px',
  boxShadow: '0 1px 2px rgba(20, 10, 40, 0.03)',
};

const statIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 8,
  background: ACCENT_BG,
  color: ACCENT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  marginBottom: 14,
};

const statLabelStyle = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted, #8a8398)',
  marginTop: 6,
};

const sectionCardStyle = {
  background: '#fff',
  border: '1px solid var(--paper-line)',
  borderRadius: 10,
  padding: 24,
  marginBottom: 20,
};

const sectionHeadStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
};

const subLabelStyle = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted, #8a8398)',
  fontWeight: 600,
};

function StatCard({ icon, value, label }) {
  return (
    <div style={statCardStyle}>
      <div style={statIconStyle}>{icon}</div>
      <div style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
        {value || '—'}
      </div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

function SectionCard({ label, action, children }) {
  return (
    <div style={sectionCardStyle}>
      <div style={sectionHeadStyle}>
        <div style={subLabelStyle}>{label}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function AddButton({ onClick, children }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClick}>
      {children}
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      className="btn btn-brick btn-sm"
      style={{ alignSelf: 'flex-end', marginBottom: 10 }}
      onClick={onClick}
    >
      Remove
    </button>
  );
}

// Merge whatever came back from the server into the full editable shape,
// so any missing sub-fields don't break controlled inputs.
function hydrateGradeCard(gc) {
  if (!gc) return JSON.parse(JSON.stringify(emptyGradeCard));
  return {
    program: { ...emptyGradeCard.program, ...(gc.program || {}) },
    overallGrade: gc.overallGrade ?? '',
    industryReadiness: gc.industryReadiness ?? '',
    placementStatus: gc.placementStatus || 'in_training',
    skillScores: (gc.skillScores || []).map((s) => ({ skillName: s.skillName || '', score: s.score ?? '', grade: s.grade || '' })),
    readinessBreakdown: { ...emptyGradeCard.readinessBreakdown, ...(gc.readinessBreakdown || {}) },
    experience: {
      ...emptyGradeCard.experience,
      ...(gc.experience || {}),
      stats: (gc.experience?.stats || []).map((s) => ({ label: s.label || '', value: s.value || '' })),
    },
    verifiedSkills: (gc.verifiedSkills || []).map((s) => ({ skillName: s.skillName || '', score: s.score ?? '' })),
    portfolioHighlights: (gc.portfolioHighlights || []).map((p) => ({
      title: p.title || '', role: p.role || '', tools: (p.tools || []).join(', '), result: p.result || '', link: p.link || '',
    })),
    achievements: gc.achievements && gc.achievements.length ? [...gc.achievements] : [],
    mentorEvaluation: {
      ratings: (gc.mentorEvaluation?.ratings || []).map((r) => ({ criteria: r.criteria || '', score: r.score ?? 5 })),
      recommendation: gc.mentorEvaluation?.recommendation || '',
    },
    mentorRemarks: { ...emptyGradeCard.mentorRemarks, ...(gc.mentorRemarks || {}) },
    interviewReadiness: { ...emptyGradeCard.interviewReadiness, ...(gc.interviewReadiness || {}) },
    verification: {
      ...emptyGradeCard.verification,
      ...(gc.verification || {}),
      issuedDate: gc.verification?.issuedDate ? gc.verification.issuedDate.substring(0, 10) : '',
    },
  };
}

// Strip the editable shape back down to what the API expects (numbers as numbers, tools as array)
function serializeGradeCard(gc) {
  const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    program: gc.program,
    overallGrade: gc.overallGrade || null,
    industryReadiness: num(gc.industryReadiness),
    placementStatus: gc.placementStatus,
    skillScores: gc.skillScores
      .filter((s) => s.skillName.trim())
      .map((s) => ({ skillName: s.skillName, score: num(s.score), grade: s.grade || null })),
    readinessBreakdown: {
      technicalSkills: num(gc.readinessBreakdown.technicalSkills),
      clientReadiness: num(gc.readinessBreakdown.clientReadiness),
      communication: num(gc.readinessBreakdown.communication),
      portfolioDepth: num(gc.readinessBreakdown.portfolioDepth),
    },
    experience: {
      role: gc.experience.role,
      organization: gc.experience.organization,
      durationLabel: gc.experience.durationLabel,
      hours: num(gc.experience.hours),
      stats: gc.experience.stats.filter((s) => s.label.trim()),
    },
    verifiedSkills: gc.verifiedSkills
      .filter((s) => s.skillName.trim())
      .map((s) => ({ skillName: s.skillName, score: num(s.score) })),
    portfolioHighlights: gc.portfolioHighlights
      .filter((p) => p.title.trim())
      .map((p) => ({
        title: p.title, role: p.role, result: p.result, link: p.link,
        tools: p.tools ? p.tools.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })),
    achievements: gc.achievements.filter((a) => a.trim()),
    mentorEvaluation: {
      ratings: gc.mentorEvaluation.ratings.filter((r) => r.criteria.trim()).map((r) => ({ criteria: r.criteria, score: Number(r.score) })),
      recommendation: gc.mentorEvaluation.recommendation,
    },
    mentorRemarks: gc.mentorRemarks,
    interviewReadiness: {
      status: gc.interviewReadiness.status,
      resumeQuality: num(gc.interviewReadiness.resumeQuality),
      portfolioQuality: num(gc.interviewReadiness.portfolioQuality),
      communication: num(gc.interviewReadiness.communication),
      presentationConfidence: num(gc.interviewReadiness.presentationConfidence),
    },
    verification: gc.verification,
  };
}

export default function StudentReport() {
  const { studentId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // entry object or null = creating
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const [remarksDraft, setRemarksDraft] = useState('');
  const [remarksSaving, setRemarksSaving] = useState(false);
  const [remarksSaved, setRemarksSaved] = useState(false);

  // showGradeCardModal now toggles a full-page editor view, not a Modal.
  const [showGradeCardModal, setShowGradeCardModal] = useState(false);
  const [gradeCardForm, setGradeCardForm] = useState(emptyGradeCard);
  const [gradeCardError, setGradeCardError] = useState('');
  const [gradeCardBusy, setGradeCardBusy] = useState(false);

  // ---- Bulk upload entries (Excel) ----
  const [entriesBulkBusy, setEntriesBulkBusy] = useState(false);
  const [entriesBulkError, setEntriesBulkError] = useState('');
  const [entriesBulkMessage, setEntriesBulkMessage] = useState('');
  const [entriesExportBusy, setEntriesExportBusy] = useState(false);

  // ---- Grade card Excel import/export ----
  const [gradeCardImportBusy, setGradeCardImportBusy] = useState(false);
  const [gradeCardImportError, setGradeCardImportError] = useState('');
  const [gradeCardImportMessage, setGradeCardImportMessage] = useState('');
  const [gradeCardExportBusy, setGradeCardExportBusy] = useState(false);

  // ---- Full progress report Excel import/export (remarks + entries +
  // attendance + grade card in ONE file) ----
  const [fullReportImportBusy, setFullReportImportBusy] = useState(false);
  const [fullReportImportError, setFullReportImportError] = useState('');
  const [fullReportImportMessage, setFullReportImportMessage] = useState('');
  const [fullReportExportBusy, setFullReportExportBusy] = useState(false);

  const load = () => {
    setLoading(true);
    getStudentProgressReport(studentId)
      .then(({ data }) => {
        setReport(data.report);
        setRemarksDraft(data.report.overallRemarks || '');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load this progress report'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [studentId]);

  const openCreate = () => {
    setEditingEntry(null);
    setEntryForm(emptyEntry);
    setFormError('');
    setShowEntryModal(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setEntryForm({
      title: entry.title || '',
      category: entry.category || 'academic',
      description: entry.description || '',
      marks: entry.marks ?? '',
      grade: entry.grade || '',
      remarks: entry.remarks || '',
    });
    setFormError('');
    setShowEntryModal(true);
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    const payload = {
      ...entryForm,
      marks: entryForm.marks === '' ? undefined : Number(entryForm.marks),
    };
    try {
      if (editingEntry) {
        await updateProgressEntry(studentId, editingEntry._id, payload);
      } else {
        await addProgressEntry(studentId, payload);
      }
      setShowEntryModal(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save this entry');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    if (!confirm(`Remove the entry "${entry.title}"? This can't be undone.`)) return;
    try {
      await deleteProgressEntry(studentId, entry._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove entry');
    }
  };

  const saveRemarks = async () => {
    setRemarksSaving(true);
    setRemarksSaved(false);
    try {
      await updateOverallRemarks(studentId, remarksDraft);
      setRemarksSaved(true);
      setTimeout(() => setRemarksSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save overall remarks');
    } finally {
      setRemarksSaving(false);
    }
  };

  const openGradeCard = () => {
    setGradeCardForm(hydrateGradeCard(report?.gradeCard));
    setGradeCardError('');
    setShowGradeCardModal(true);
  };

  const submitGradeCard = async (e) => {
    e.preventDefault();
    setGradeCardError('');
    setGradeCardBusy(true);
    try {
      await updateGradeCard(studentId, serializeGradeCard(gradeCardForm));
      setShowGradeCardModal(false);
      load();
    } catch (err) {
      setGradeCardError(err.response?.data?.message || 'Could not save the grade card');
    } finally {
      setGradeCardBusy(false);
    }
  };

  // ---- Bulk upload / export entries handlers ----
  const handleBulkUploadEntries = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEntriesBulkError('');
    setEntriesBulkMessage('');
    setEntriesBulkBusy(true);
    try {
      const { data } = await bulkUploadEntries(studentId, file);
      setEntriesBulkMessage(data?.message || `Imported ${data?.count ?? data?.inserted ?? ''} entries successfully`);
      load();
    } catch (err) {
      setEntriesBulkError(err.response?.data?.message || 'Could not bulk upload entries');
    } finally {
      setEntriesBulkBusy(false);
      e.target.value = '';
    }
  };

  const handleExportEntries = async () => {
    setError('');
    setEntriesExportBusy(true);
    try {
      await exportEntries(studentId, report?.student?.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not export entries');
    } finally {
      setEntriesExportBusy(false);
    }
  };

  // ---- Grade card Excel import / export handlers ----
  const handleImportGradeCard = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGradeCardImportError('');
    setGradeCardImportMessage('');
    setGradeCardImportBusy(true);
    try {
      const { data } = await importGradeCard(studentId, file);
      setGradeCardImportMessage(data?.message || 'Grade card imported successfully');
      load();
    } catch (err) {
      setGradeCardImportError(err.response?.data?.message || 'Could not import the grade card');
    } finally {
      setGradeCardImportBusy(false);
      e.target.value = '';
    }
  };

  const handleExportGradeCard = async () => {
    setError('');
    setGradeCardExportBusy(true);
    try {
      await exportGradeCard(studentId, report?.student?.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not export the grade card');
    } finally {
      setGradeCardExportBusy(false);
    }
  };

  // ---- Full progress report Excel import / export handlers ----
  const handleImportFullProgressReport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFullReportImportError('');
    setFullReportImportMessage('');
    setFullReportImportBusy(true);
    try {
      const { data } = await importFullProgressReport(studentId, file);
      setFullReportImportMessage(data?.message || 'Progress report imported successfully');
      load();
    } catch (err) {
      setFullReportImportError(err.response?.data?.message || 'Could not import the progress report');
    } finally {
      setFullReportImportBusy(false);
      e.target.value = '';
    }
  };

  const handleExportFullProgressReport = async () => {
    setError('');
    setFullReportExportBusy(true);
    try {
      await exportFullProgressReport(studentId, report?.student?.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not export the progress report');
    } finally {
      setFullReportExportBusy(false);
    }
  };

  const gc = report?.gradeCard;

  // -------------------------------------------------------------------------
  // FULL-PAGE GRADE CARD EDITOR
  // -------------------------------------------------------------------------
  if (showGradeCardModal) {
    return (
      <Layout>
        <div className="page-header">
          <div>
            <div className="eyebrow">
              <button
                type="button"
                onClick={() => setShowGradeCardModal(false)}
                disabled={gradeCardBusy}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}
              >
                ← Back to {report?.student?.name || 'student'} report
              </button>
            </div>
            <h1>Grade card</h1>
            <p className="sub">Program completion record, skills, experience, and mentor evaluation.</p>
          </div>
          <div className="btn-row">
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              {gradeCardImportBusy ? 'Importing…' : 'Import from Excel'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportGradeCard}
                style={{ display: 'none' }}
                disabled={gradeCardImportBusy}
              />
            </label>
            <button className="btn btn-ghost" type="button" onClick={handleExportGradeCard} disabled={gradeCardExportBusy}>
              {gradeCardExportBusy ? 'Exporting…' : 'Export to Excel'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowGradeCardModal(false)} disabled={gradeCardBusy}>
              Cancel
            </button>
            <button className="btn btn-gold" type="submit" form="grade-card-form" disabled={gradeCardBusy}>
              {gradeCardBusy ? 'Saving…' : 'Save grade card'}
            </button>
          </div>
        </div>

        {gradeCardError && <div className="form-error">{gradeCardError}</div>}
        {gradeCardImportError && <div className="form-error">{gradeCardImportError}</div>}
        {gradeCardImportMessage && <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{gradeCardImportMessage} ✓ (review the fields below before saving)</div>}

        <div style={statGridStyle}>
          <StatCard icon="🏅" value={gradeCardForm.overallGrade} label="Overall grade" />
          <StatCard
            icon="📈"
            value={gradeCardForm.industryReadiness !== '' ? `${gradeCardForm.industryReadiness}%` : ''}
            label="Industry readiness"
          />
          <StatCard
            icon="🎯"
            value={gradeCardForm.placementStatus?.replace('_', ' ')}
            label="Placement status"
          />
          <StatCard icon="🧩" value={gradeCardForm.skillScores.length || ''} label="Skills scored" />
        </div>

        <form id="grade-card-form" onSubmit={submitGradeCard}>
          <SectionCard label="Program">
            <div className="field-row">
              <div className="field">
                <label>Program name</label>
                <input value={gradeCardForm.program.name} onChange={(e) => setGradeCardForm({ ...gradeCardForm, program: { ...gradeCardForm.program, name: e.target.value } })} placeholder="e.g. Digital Marketing Professional Program" />
              </div>
              <div className="field">
                <label>Program code</label>
                <input value={gradeCardForm.program.code} onChange={(e) => setGradeCardForm({ ...gradeCardForm, program: { ...gradeCardForm.program, code: e.target.value } })} placeholder="e.g. VC-240001" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Duration</label>
                <input value={gradeCardForm.program.durationLabel} onChange={(e) => setGradeCardForm({ ...gradeCardForm, program: { ...gradeCardForm.program, durationLabel: e.target.value } })} placeholder="e.g. 3 Months" />
              </div>
              <div className="field">
                <label>Batch</label>
                <input value={gradeCardForm.program.batch} onChange={(e) => setGradeCardForm({ ...gradeCardForm, program: { ...gradeCardForm.program, batch: e.target.value } })} placeholder="e.g. Jul 2026" />
              </div>
            </div>
            <div className="field">
              <label>Program summary</label>
              <textarea rows={2} value={gradeCardForm.program.summary} onChange={(e) => setGradeCardForm({ ...gradeCardForm, program: { ...gradeCardForm.program, summary: e.target.value } })} />
            </div>
          </SectionCard>

          <SectionCard label="Overall">
            <div className="field-row">
              <div className="field">
                <label>Overall grade</label>
                <input value={gradeCardForm.overallGrade} onChange={(e) => setGradeCardForm({ ...gradeCardForm, overallGrade: e.target.value })} placeholder="e.g. A+" />
              </div>
              <div className="field">
                <label>Industry readiness (%)</label>
                <input type="number" min="0" max="100" value={gradeCardForm.industryReadiness} onChange={(e) => setGradeCardForm({ ...gradeCardForm, industryReadiness: e.target.value })} />
              </div>
              <div className="field">
                <label>Placement status</label>
                <select value={gradeCardForm.placementStatus} onChange={(e) => setGradeCardForm({ ...gradeCardForm, placementStatus: e.target.value })}>
                  {PLACEMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            label="Skill scores"
            action={<AddButton onClick={() => setGradeCardForm({ ...gradeCardForm, skillScores: [...gradeCardForm.skillScores, { skillName: '', score: '', grade: '' }] })}>+ Add skill</AddButton>}
          >
            {gradeCardForm.skillScores.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No skills added yet.</p>}
            {gradeCardForm.skillScores.map((s, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <label>Skill</label>
                  <input value={s.skillName} onChange={(e) => {
                    const next = [...gradeCardForm.skillScores]; next[i] = { ...next[i], skillName: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, skillScores: next });
                  }} placeholder="e.g. SEO" />
                </div>
                <div className="field">
                  <label>Score</label>
                  <input type="number" min="0" max="100" value={s.score} onChange={(e) => {
                    const next = [...gradeCardForm.skillScores]; next[i] = { ...next[i], score: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, skillScores: next });
                  }} />
                </div>
                <div className="field">
                  <label>Grade</label>
                  <input value={s.grade} onChange={(e) => {
                    const next = [...gradeCardForm.skillScores]; next[i] = { ...next[i], grade: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, skillScores: next });
                  }} placeholder="e.g. A+" />
                </div>
                <RemoveButton onClick={() => setGradeCardForm({ ...gradeCardForm, skillScores: gradeCardForm.skillScores.filter((_, idx) => idx !== i) })} />
              </div>
            ))}
          </SectionCard>

          <SectionCard label="Industry readiness breakdown">
            <div className="field-row">
              {['technicalSkills', 'clientReadiness', 'communication', 'portfolioDepth'].map((k) => (
                <div className="field" key={k}>
                  <label>{k.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="number" min="0" max="100" value={gradeCardForm.readinessBreakdown[k]}
                    onChange={(e) => setGradeCardForm({ ...gradeCardForm, readinessBreakdown: { ...gradeCardForm.readinessBreakdown, [k]: e.target.value } })} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard label="Professional experience">
            <div className="field-row">
              <div className="field">
                <label>Role</label>
                <input value={gradeCardForm.experience.role} onChange={(e) => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, role: e.target.value } })} placeholder="e.g. Digital Marketing Intern" />
              </div>
              <div className="field">
                <label>Organization</label>
                <input value={gradeCardForm.experience.organization} onChange={(e) => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, organization: e.target.value } })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Duration</label>
                <input value={gradeCardForm.experience.durationLabel} onChange={(e) => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, durationLabel: e.target.value } })} placeholder="e.g. 3 Months" />
              </div>
              <div className="field">
                <label>Hours</label>
                <input type="number" value={gradeCardForm.experience.hours} onChange={(e) => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, hours: e.target.value } })} placeholder="e.g. 320" />
              </div>
            </div>

            <div style={{ ...sectionHeadStyle, marginTop: 18 }}>
              <div style={subLabelStyle}>Experience stats</div>
              <AddButton onClick={() => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, stats: [...gradeCardForm.experience.stats, { label: '', value: '' }] } })}>+ Add stat</AddButton>
            </div>
            {gradeCardForm.experience.stats.map((s, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <label>Label</label>
                  <input value={s.label} onChange={(e) => {
                    const next = [...gradeCardForm.experience.stats]; next[i] = { ...next[i], label: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, stats: next } });
                  }} placeholder="e.g. Live Client Projects" />
                </div>
                <div className="field">
                  <label>Value</label>
                  <input value={s.value} onChange={(e) => {
                    const next = [...gradeCardForm.experience.stats]; next[i] = { ...next[i], value: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, stats: next } });
                  }} placeholder="e.g. 4" />
                </div>
                <RemoveButton onClick={() => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, stats: gradeCardForm.experience.stats.filter((_, idx) => idx !== i) } })} />
              </div>
            ))}
          </SectionCard>

          <SectionCard
            label="Verified skills"
            action={<AddButton onClick={() => setGradeCardForm({ ...gradeCardForm, verifiedSkills: [...gradeCardForm.verifiedSkills, { skillName: '', score: '' }] })}>+ Add skill</AddButton>}
          >
            {gradeCardForm.verifiedSkills.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No verified skills added yet.</p>}
            {gradeCardForm.verifiedSkills.map((s, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <label>Skill</label>
                  <input value={s.skillName} onChange={(e) => {
                    const next = [...gradeCardForm.verifiedSkills]; next[i] = { ...next[i], skillName: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, verifiedSkills: next });
                  }} placeholder="e.g. Meta Ads" />
                </div>
                <div className="field">
                  <label>Score</label>
                  <input type="number" min="0" max="100" value={s.score} onChange={(e) => {
                    const next = [...gradeCardForm.verifiedSkills]; next[i] = { ...next[i], score: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, verifiedSkills: next });
                  }} />
                </div>
                <RemoveButton onClick={() => setGradeCardForm({ ...gradeCardForm, verifiedSkills: gradeCardForm.verifiedSkills.filter((_, idx) => idx !== i) })} />
              </div>
            ))}
          </SectionCard>

          <SectionCard
            label="Portfolio highlights"
            action={<AddButton onClick={() => setGradeCardForm({ ...gradeCardForm, portfolioHighlights: [...gradeCardForm.portfolioHighlights, { title: '', role: '', tools: '', result: '', link: '' }] })}>+ Add project</AddButton>}
          >
            {gradeCardForm.portfolioHighlights.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No portfolio projects added yet.</p>}
            {gradeCardForm.portfolioHighlights.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--paper-line)', borderRadius: 8, padding: 16, marginBottom: 14, background: '#fbfaff' }}>
                <div className="field-row">
                  <div className="field">
                    <label>Title</label>
                    <input value={p.title} onChange={(e) => {
                      const next = [...gradeCardForm.portfolioHighlights]; next[i] = { ...next[i], title: e.target.value };
                      setGradeCardForm({ ...gradeCardForm, portfolioHighlights: next });
                    }} placeholder="e.g. SEO Audit Report" />
                  </div>
                  <div className="field">
                    <label>Role</label>
                    <input value={p.role} onChange={(e) => {
                      const next = [...gradeCardForm.portfolioHighlights]; next[i] = { ...next[i], role: e.target.value };
                      setGradeCardForm({ ...gradeCardForm, portfolioHighlights: next });
                    }} placeholder="e.g. SEO Analyst" />
                  </div>
                </div>
                <div className="field">
                  <label>Tools (comma-separated)</label>
                  <input value={p.tools} onChange={(e) => {
                    const next = [...gradeCardForm.portfolioHighlights]; next[i] = { ...next[i], tools: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, portfolioHighlights: next });
                  }} placeholder="e.g. Ahrefs, GSC, Screaming Frog" />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Result</label>
                    <input value={p.result} onChange={(e) => {
                      const next = [...gradeCardForm.portfolioHighlights]; next[i] = { ...next[i], result: e.target.value };
                      setGradeCardForm({ ...gradeCardForm, portfolioHighlights: next });
                    }} placeholder="e.g. 112 issues resolved, +24% organic" />
                  </div>
                  <div className="field">
                    <label>Link</label>
                    <input value={p.link} onChange={(e) => {
                      const next = [...gradeCardForm.portfolioHighlights]; next[i] = { ...next[i], link: e.target.value };
                      setGradeCardForm({ ...gradeCardForm, portfolioHighlights: next });
                    }} placeholder="https://…" />
                  </div>
                </div>
                <button type="button" className="btn btn-brick btn-sm"
                  onClick={() => setGradeCardForm({ ...gradeCardForm, portfolioHighlights: gradeCardForm.portfolioHighlights.filter((_, idx) => idx !== i) })}>
                  Remove project
                </button>
              </div>
            ))}
          </SectionCard>

          <SectionCard
            label="Achievements"
            action={<AddButton onClick={() => setGradeCardForm({ ...gradeCardForm, achievements: [...gradeCardForm.achievements, ''] })}>+ Add achievement</AddButton>}
          >
            {gradeCardForm.achievements.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No achievements added yet.</p>}
            {gradeCardForm.achievements.map((a, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <input value={a} onChange={(e) => {
                    const next = [...gradeCardForm.achievements]; next[i] = e.target.value;
                    setGradeCardForm({ ...gradeCardForm, achievements: next });
                  }} placeholder="e.g. Top Performer" />
                </div>
                <RemoveButton onClick={() => setGradeCardForm({ ...gradeCardForm, achievements: gradeCardForm.achievements.filter((_, idx) => idx !== i) })} />
              </div>
            ))}
          </SectionCard>

          <SectionCard
            label="Mentor evaluation"
            action={<AddButton onClick={() => setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, ratings: [...gradeCardForm.mentorEvaluation.ratings, { criteria: '', score: 5 }] } })}>+ Add rating</AddButton>}
          >
            {gradeCardForm.mentorEvaluation.ratings.map((r, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <label>Criteria</label>
                  <input value={r.criteria} onChange={(e) => {
                    const next = [...gradeCardForm.mentorEvaluation.ratings]; next[i] = { ...next[i], criteria: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, ratings: next } });
                  }} placeholder="e.g. Professionalism" />
                </div>
                <div className="field">
                  <label>Score (1-5)</label>
                  <input type="number" min="1" max="5" value={r.score} onChange={(e) => {
                    const next = [...gradeCardForm.mentorEvaluation.ratings]; next[i] = { ...next[i], score: e.target.value };
                    setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, ratings: next } });
                  }} />
                </div>
                <RemoveButton onClick={() => setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, ratings: gradeCardForm.mentorEvaluation.ratings.filter((_, idx) => idx !== i) } })} />
              </div>
            ))}
            <div className="field" style={{ marginTop: 6 }}>
              <label>Recommendation</label>
              <input value={gradeCardForm.mentorEvaluation.recommendation} onChange={(e) => setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, recommendation: e.target.value } })} placeholder="e.g. Highly Recommended" />
            </div>
          </SectionCard>

          <SectionCard label="Mentor remarks">
            <div className="field">
              <label>Remarks text</label>
              <textarea rows={3} value={gradeCardForm.mentorRemarks.text} onChange={(e) => setGradeCardForm({ ...gradeCardForm, mentorRemarks: { ...gradeCardForm.mentorRemarks, text: e.target.value } })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Mentor name</label>
                <input value={gradeCardForm.mentorRemarks.mentorName} onChange={(e) => setGradeCardForm({ ...gradeCardForm, mentorRemarks: { ...gradeCardForm.mentorRemarks, mentorName: e.target.value } })} />
              </div>
              <div className="field">
                <label>Mentor title</label>
                <input value={gradeCardForm.mentorRemarks.mentorTitle} onChange={(e) => setGradeCardForm({ ...gradeCardForm, mentorRemarks: { ...gradeCardForm.mentorRemarks, mentorTitle: e.target.value } })} placeholder="e.g. Head of Digital Marketing" />
              </div>
            </div>
          </SectionCard>

          <SectionCard label="Interview readiness">
            <div className="field">
              <label>Status</label>
              <input value={gradeCardForm.interviewReadiness.status} onChange={(e) => setGradeCardForm({ ...gradeCardForm, interviewReadiness: { ...gradeCardForm.interviewReadiness, status: e.target.value } })} placeholder="e.g. READY FOR PLACEMENT" />
            </div>
            <div className="field-row">
              {['resumeQuality', 'portfolioQuality', 'communication', 'presentationConfidence'].map((k) => (
                <div className="field" key={k}>
                  <label>{k.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="number" min="0" max="100" value={gradeCardForm.interviewReadiness[k]}
                    onChange={(e) => setGradeCardForm({ ...gradeCardForm, interviewReadiness: { ...gradeCardForm.interviewReadiness, [k]: e.target.value } })} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard label="Verification">
            <div className="field-row">
              <div className="field">
                <label>Doc ID</label>
                <input value={gradeCardForm.verification.docId} onChange={(e) => setGradeCardForm({ ...gradeCardForm, verification: { ...gradeCardForm.verification, docId: e.target.value } })} placeholder="e.g. VCA/GC/2026/240001" />
              </div>
              <div className="field">
                <label>Issued date</label>
                <input type="date" value={gradeCardForm.verification.issuedDate} onChange={(e) => setGradeCardForm({ ...gradeCardForm, verification: { ...gradeCardForm.verification, issuedDate: e.target.value } })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Verify URL</label>
                <input value={gradeCardForm.verification.verifyUrl} onChange={(e) => setGradeCardForm({ ...gradeCardForm, verification: { ...gradeCardForm.verification, verifyUrl: e.target.value } })} placeholder="https://…" />
              </div>
              <div className="field">
                <label>Verification code</label>
                <input value={gradeCardForm.verification.verificationCode} onChange={(e) => setGradeCardForm({ ...gradeCardForm, verification: { ...gradeCardForm.verification, verificationCode: e.target.value } })} placeholder="e.g. VC-240001" />
              </div>
            </div>
          </SectionCard>

          <div className="btn-row" style={{ marginTop: 8, marginBottom: 40 }}>
            <button className="btn btn-gold" type="submit" disabled={gradeCardBusy}>
              {gradeCardBusy ? 'Saving…' : 'Save grade card'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowGradeCardModal(false)} disabled={gradeCardBusy}>
              Cancel
            </button>
          </div>
        </form>
      </Layout>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN REPORT PAGE
  // -------------------------------------------------------------------------
  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <Link to="/faculty/students" style={{ color: 'inherit' }}>My Students</Link> / Progress Report
          </div>
          <h1>{report?.student?.name || 'Student report'}</h1>
          <p className="sub">
            {report?.student?.email}
            {report?.student?.studentInfo?.rollNumber ? ` · Roll no. ${report.student.studentInfo.rollNumber}` : ''}
          </p>
        </div>
        {report && (
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={openGradeCard}>
              {gc?.overallGrade ? 'Edit grade card' : '+ Create grade card'}
            </button>
            <button className="btn btn-gold" onClick={openCreate}>
              + Add entry
            </button>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && <div className="loading-line">Fetching progress report…</div>}

      {report && (
        <>
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Full progress report (Excel)</div>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 12.5 }}>
              One file with everything — overall remarks, entries, attendance, and the grade card. Import a file to
              apply any sheets it contains (entries are replaced entirely, attendance is upserted by date); remove a
              sheet before re-uploading to leave that section untouched.
            </p>
            {fullReportImportError && <div className="form-error" style={{ fontSize: 12 }}>{fullReportImportError}</div>}
            {fullReportImportMessage && <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{fullReportImportMessage} ✓</div>}
            <div className="btn-row">
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                {fullReportImportBusy ? 'Importing…' : 'Import full report (Excel)'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFullProgressReport}
                  style={{ display: 'none' }}
                  disabled={fullReportImportBusy}
                />
              </label>
              <button className="btn btn-ghost btn-sm" onClick={handleExportFullProgressReport} disabled={fullReportExportBusy}>
                {fullReportExportBusy ? 'Exporting…' : 'Export full report (Excel)'}
              </button>
            </div>
          </div>

          {gc?.overallGrade && (
            <div className="card card-pad" style={{ marginBottom: 24 }}>
              <div className="section-title">Grade card</div>

              <div style={{ ...statGridStyle, marginTop: 14, marginBottom: 14 }}>
                <StatCard icon="🏅" value={gc.overallGrade} label="Overall grade" />
                <StatCard icon="📈" value={gc.industryReadiness != null ? `${gc.industryReadiness}%` : ''} label="Industry readiness" />
                <StatCard icon="🎯" value={gc.placementStatus?.replace('_', ' ')} label="Placement status" />
              </div>

              {gc.program?.name && (
                <p className="muted" style={{ margin: '0 0 10px' }}>
                  {gc.program.name} {gc.program.durationLabel ? `· ${gc.program.durationLabel}` : ''} {gc.program.batch ? `· Batch ${gc.program.batch}` : ''}
                </p>
              )}
              {gc.skillScores?.length > 0 && (
                <>
                  <div className="section-title" style={{ fontSize: 12.5, marginTop: 14 }}>Skill scores</div>
                  <div className="btn-row" style={{ flexWrap: 'wrap', gap: 10 }}>
                    {gc.skillScores.map((s, i) => (
                      <span key={i} className="stamp stamp-active" style={{ fontSize: 11 }}>
                        {s.skillName}: {s.score ?? '—'} {s.grade ? `(${s.grade})` : ''}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {gc.mentorRemarks?.text && (
                <>
                  <div className="section-title" style={{ fontSize: 12.5, marginTop: 14 }}>Mentor remarks</div>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>"{gc.mentorRemarks.text}"</p>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                    — {gc.mentorRemarks.mentorName || 'Mentor'} {gc.mentorRemarks.mentorTitle ? `, ${gc.mentorRemarks.mentorTitle}` : ''}
                  </p>
                </>
              )}
              {gc.lastUpdatedBy && (
                <p className="muted" style={{ margin: '12px 0 0', fontSize: 11.5 }}>
                  Last updated by {gc.lastUpdatedBy.name || 'staff'} {gc.lastUpdatedAt ? `on ${new Date(gc.lastUpdatedAt).toLocaleDateString()}` : ''}
                </p>
              )}

              <div className="section-title" style={{ fontSize: 12.5, marginTop: 16 }}>Grade card Excel</div>
              {gradeCardImportError && <div className="form-error" style={{ fontSize: 12 }}>{gradeCardImportError}</div>}
              {gradeCardImportMessage && <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{gradeCardImportMessage} ✓</div>}
              <div className="btn-row">
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {gradeCardImportBusy ? 'Importing…' : 'Import from Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportGradeCard}
                    style={{ display: 'none' }}
                    disabled={gradeCardImportBusy}
                  />
                </label>
                <button className="btn btn-ghost btn-sm" onClick={handleExportGradeCard} disabled={gradeCardExportBusy}>
                  {gradeCardExportBusy ? 'Exporting…' : 'Export to Excel'}
                </button>
              </div>
            </div>
          )}

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="section-title">Overall remarks</div>
            <textarea
              rows={3}
              value={remarksDraft}
              onChange={(e) => setRemarksDraft(e.target.value)}
              placeholder="A short standing summary for this student…"
              style={{ width: '100%', border: '1px solid var(--paper-line)', borderRadius: 3, padding: 10, fontFamily: 'inherit', fontSize: 13.5 }}
            />
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={saveRemarks} disabled={remarksSaving}>
                {remarksSaving ? 'Saving…' : 'Save remarks'}
              </button>
              {remarksSaved && <span className="muted" style={{ alignSelf: 'center', fontSize: 12.5 }}>Saved ✓</span>}
            </div>
          </div>

          <div className="btn-row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div className="section-title" style={{ margin: 0 }}>Entries ({report.entries.length})</div>
            <div className="btn-row" style={{ gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleExportEntries} disabled={entriesExportBusy}>
                {entriesExportBusy ? 'Exporting…' : 'Export entries'}
              </button>
            </div>
          </div>

          {report.entries.length === 0 && (
            <div className="card card-pad muted" style={{ fontStyle: 'italic', marginTop: 10 }}>
              No entries yet — add the first one to start this student's record.
            </div>
          )}

          {[...report.entries].reverse().map((entry) => (
            <div className="entry-item" key={entry._id}>
              <div className="entry-top">
                <div>
                  <h4>{entry.title}</h4>
                  <span className="stamp stamp-active" style={{ fontSize: 9.5 }}>{entry.category}</span>
                </div>
                <div className="btn-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(entry)}>Edit</button>
                  <button className="btn btn-brick btn-sm" onClick={() => handleDeleteEntry(entry)}>Delete</button>
                </div>
              </div>
              {entry.description && <p style={{ margin: '10px 0 0' }}>{entry.description}</p>}
              <div className="entry-meta">
                {entry.marks != null && `Marks: ${entry.marks}  ·  `}
                {entry.grade && `Grade: ${entry.grade}  ·  `}
                {entry.remarks && `Remarks: ${entry.remarks}  ·  `}
                Updated by {entry.updatedBy?.name || 'faculty'} on {new Date(entry.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}

          <div className="spacer-lg" />
          <div className="section-title">Documents uploaded by student ({report.documents.length})</div>
          <div className="card">
            {report.documents.length === 0 ? (
              <table className="ledger">
                <tbody>
                  <tr className="empty-row"><td>No documents uploaded yet.</td></tr>
                </tbody>
              </table>
            ) : (
              <table className="ledger">
                <thead>
                  <tr><th>File</th><th>Description</th><th>Uploaded</th><th></th></tr>
                </thead>
                <tbody>
                  {report.documents.map((doc) => (
                    <tr key={doc._id}>
                      <td className="cell-mono">{doc.fileName}</td>
                      <td>{doc.description || '—'}</td>
                      <td className="cell-mono">{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td>
                        <a className="btn btn-ghost btn-sm" href={fileUrl(doc.filePath)} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showEntryModal && (
        <Modal title={editingEntry ? 'Edit entry' : 'Add progress entry'} onClose={() => setShowEntryModal(false)}>
          {formError && <div className="form-error">{formError}</div>}
          <form onSubmit={submitEntry}>
            <div className="field">
              <label>Title</label>
              <input required value={entryForm.title} onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })} placeholder="e.g. Mid-semester exam" />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={entryForm.category} onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Marks</label>
                <input type="number" value={entryForm.marks} onChange={(e) => setEntryForm({ ...entryForm, marks: e.target.value })} />
              </div>
              <div className="field">
                <label>Grade</label>
                <input value={entryForm.grade} onChange={(e) => setEntryForm({ ...entryForm, grade: e.target.value })} placeholder="e.g. A-" />
              </div>
            </div>
            <div className="field">
              <label>Remarks</label>
              <input value={entryForm.remarks} onChange={(e) => setEntryForm({ ...entryForm, remarks: e.target.value })} />
            </div>
            <div className="btn-row">
              <button className="btn btn-gold" type="submit" disabled={busy}>
                {busy ? 'Saving…' : editingEntry ? 'Save changes' : 'Add entry'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowEntryModal(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import {
  getStudentProgressReportAdmin,
  addProgressEntryAdmin,
  updateProgressEntryAdmin,
  deleteProgressEntryAdmin,
  updateOverallRemarksAdmin,
  updateGradeCardAdmin,
  uploadStudentProfilePhotoAdmin,
  uploadCertificateToProgressReportAdmin,
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

export default function SuperAdminStudentReport() {
  const { studentId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const [remarksDraft, setRemarksDraft] = useState('');
  const [remarksSaving, setRemarksSaving] = useState(false);
  const [remarksSaved, setRemarksSaved] = useState(false);

  const [showGradeCardModal, setShowGradeCardModal] = useState(false);
  const [gradeCardForm, setGradeCardForm] = useState(emptyGradeCard);
  const [gradeCardError, setGradeCardError] = useState('');
  const [gradeCardBusy, setGradeCardBusy] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState('');
  const [certSuccess, setCertSuccess] = useState('');

  const load = () => {
    setLoading(true);
    getStudentProgressReportAdmin(studentId)
      .then(({ data }) => {
        setReport(data.report);
        setRemarksDraft(data.report.overallRemarks || '');
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load this progress report'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [studentId]);

  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertError('');
    setCertSuccess('');
    setCertUploading(true);
    try {
      await uploadCertificateToProgressReportAdmin(studentId, file);
      setCertSuccess('Certificate uploaded successfully!');
      load();
    } catch (err) {
      setCertError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setCertUploading(false);
      e.target.value = '';
    }
  };

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
        await updateProgressEntryAdmin(studentId, editingEntry._id, payload);
      } else {
        await addProgressEntryAdmin(studentId, payload);
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
      await deleteProgressEntryAdmin(studentId, entry._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove entry');
    }
  };

  const saveRemarks = async () => {
    setRemarksSaving(true);
    setRemarksSaved(false);
    try {
      await updateOverallRemarksAdmin(studentId, remarksDraft);
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
      await updateGradeCardAdmin(studentId, serializeGradeCard(gradeCardForm));
      setShowGradeCardModal(false);
      load();
    } catch (err) {
      setGradeCardError(err.response?.data?.message || 'Could not save the grade card');
    } finally {
      setGradeCardBusy(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setPhotoUploading(true);
    try {
      await uploadStudentProfilePhotoAdmin(studentId, file);
      load();
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Could not upload photo');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const gc = report?.gradeCard;
  const student = report?.student;
  const apiOrigin = import.meta.env.VITE_API_URL?.replace('/api', '');

  return (
    <Layout>
      <div className="page-header">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src={
                student?.profileImage
                  ? `${apiOrigin}${student.profileImage}`
                  : '/avatar-placeholder.png'
              }
              alt={student?.name || 'Student'}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--paper-line)' }}
            />
            <label className="btn btn-ghost btn-sm" style={{ display: 'block', marginTop: 6, cursor: 'pointer' }}>
              {photoUploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={photoUploading} />
            </label>
            {photoError && <div className="form-error" style={{ fontSize: 11, marginTop: 4, maxWidth: 100 }}>{photoError}</div>}
          </div>
          <div>
            <div className="eyebrow">
              <Link to="/superadmin/students" style={{ color: 'inherit' }}>Students</Link> / Progress Report
            </div>
            <h1>{student?.name || 'Student report'}</h1>
            <p className="sub">
              {student?.email}
              {student?.studentInfo?.rollNumber ? ` · Roll no. ${student.studentInfo.rollNumber}` : ''}
              {report?.faculty?.name ? ` · Faculty: ${report.faculty.name}` : ' · Unassigned'}
            </p>
          </div>
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
            <div className="section-title" style={{ marginTop: 0 }}>Student details</div>
            <div className="btn-row" style={{ flexWrap: 'wrap', gap: 24 }}>
              <div><strong>Full name:</strong> {student?.name || '—'}</div>
              <div><strong>Email:</strong> {student?.email || '—'}</div>
              <div><strong>Phone:</strong> {student?.phone || '—'}</div>
              <div><strong>Roll number:</strong> {student?.studentInfo?.rollNumber || '—'}</div>
              <div><strong>Department:</strong> {student?.studentInfo?.department || '—'}</div>
              <div><strong>Course:</strong> {student?.studentInfo?.course || '—'}</div>
              <div><strong>Semester:</strong> {student?.studentInfo?.semester || '—'}</div>
              <div><strong>Assigned faculty:</strong> {report?.faculty?.name || 'Unassigned'}</div>
              <div>
                <strong>Account status:</strong>{' '}
                <span className={`stamp ${student?.isActive ? 'stamp-active' : 'stamp-inactive'}`} style={{ fontSize: 10.5 }}>
                  {student?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div><strong>Application status:</strong> {student?.status || '—'}</div>
              <div><strong>Joined:</strong> {student?.createdAt ? new Date(student.createdAt).toLocaleDateString() : '—'}</div>
            </div>
          </div>

          {/* Certificate PDF Card */}
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Student Certificate</span>
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', margin: 0, backgroundColor: '#005bb5', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 4, fontSize: 12.5 }}>
                {certUploading ? 'Uploading PDF…' : report?.certificatePdf ? 'Replace Certificate PDF' : 'Upload Certificate PDF'}
                <input type="file" accept="application/pdf" onChange={handleCertUpload} style={{ display: 'none' }} disabled={certUploading} />
              </label>
            </div>
            {certError && <div className="form-error" style={{ fontSize: 12, marginTop: 8 }}>{certError}</div>}
            {certSuccess && <div style={{ fontSize: 12, marginTop: 8, padding: '8px 12px', background: '#e6f4ea', color: '#137333', borderRadius: 4 }}>{certSuccess}</div>}
            {report?.certificatePdf ? (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <a href={report.certificatePdf} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">View Certificate</a>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>No certificate uploaded yet. Upload a PDF to make it available on the student's progress card.</p>
            )}
          </div>

          {gc?.overallGrade && (
            <div className="card card-pad" style={{ marginBottom: 24 }}>
              <div className="section-title">Grade card</div>
              <div className="btn-row" style={{ flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                <div><strong>Overall grade:</strong> {gc.overallGrade || '—'}</div>
                <div><strong>Industry readiness:</strong> {gc.industryReadiness != null ? `${gc.industryReadiness}%` : '—'}</div>
                <div><strong>Status:</strong> {gc.placementStatus?.replace('_', ' ') || '—'}</div>
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

          <div className="section-title">Entries ({report.entries.length})</div>

          {report.entries.length === 0 && (
            <div className="card card-pad muted" style={{ fontStyle: 'italic' }}>
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
                Updated by {entry.updatedBy?.name || 'staff'} on {new Date(entry.updatedAt).toLocaleDateString()}
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
                        <a className="btn btn-ghost btn-sm" href={`${apiOrigin}${doc.filePath}`} target="_blank" rel="noreferrer">
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

      {showGradeCardModal && (
        <Modal title="Grade card" onClose={() => setShowGradeCardModal(false)} wide>
          {gradeCardError && <div className="form-error">{gradeCardError}</div>}
          <form onSubmit={submitGradeCard}>
            <div className="section-title" style={{ marginTop: 0 }}>Program</div>
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

            <div className="section-title">Overall</div>
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

            <div className="section-title">
              Skill scores
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => setGradeCardForm({ ...gradeCardForm, skillScores: [...gradeCardForm.skillScores, { skillName: '', score: '', grade: '' }] })}>
                + Add skill
              </button>
            </div>
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
                <button type="button" className="btn btn-brick btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 10 }}
                  onClick={() => setGradeCardForm({ ...gradeCardForm, skillScores: gradeCardForm.skillScores.filter((_, idx) => idx !== i) })}>
                  Remove
                </button>
              </div>
            ))}

            <div className="section-title">Industry readiness breakdown</div>
            <div className="field-row">
              {['technicalSkills', 'clientReadiness', 'communication', 'portfolioDepth'].map((k) => (
                <div className="field" key={k}>
                  <label>{k.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="number" min="0" max="100" value={gradeCardForm.readinessBreakdown[k]}
                    onChange={(e) => setGradeCardForm({ ...gradeCardForm, readinessBreakdown: { ...gradeCardForm.readinessBreakdown, [k]: e.target.value } })} />
                </div>
              ))}
            </div>

            <div className="section-title">Professional experience</div>
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
            <div className="section-title" style={{ fontSize: 12.5 }}>
              Experience stats
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, stats: [...gradeCardForm.experience.stats, { label: '', value: '' }] } })}>
                + Add stat
              </button>
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
                <button type="button" className="btn btn-brick btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 10 }}
                  onClick={() => setGradeCardForm({ ...gradeCardForm, experience: { ...gradeCardForm.experience, stats: gradeCardForm.experience.stats.filter((_, idx) => idx !== i) } })}>
                  Remove
                </button>
              </div>
            ))}

            <div className="section-title">
              Verified skills
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => setGradeCardForm({ ...gradeCardForm, verifiedSkills: [...gradeCardForm.verifiedSkills, { skillName: '', score: '' }] })}>
                + Add skill
              </button>
            </div>
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
                <button type="button" className="btn btn-brick btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 10 }}
                  onClick={() => setGradeCardForm({ ...gradeCardForm, verifiedSkills: gradeCardForm.verifiedSkills.filter((_, idx) => idx !== i) })}>
                  Remove
                </button>
              </div>
            ))}

            <div className="section-title">
              Portfolio highlights
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => setGradeCardForm({ ...gradeCardForm, portfolioHighlights: [...gradeCardForm.portfolioHighlights, { title: '', role: '', tools: '', result: '', link: '' }] })}>
                + Add project
              </button>
            </div>
            {gradeCardForm.portfolioHighlights.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--paper-line)', borderRadius: 4, padding: 10, marginBottom: 10 }}>
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

            <div className="section-title">
              Achievements
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => setGradeCardForm({ ...gradeCardForm, achievements: [...gradeCardForm.achievements, ''] })}>
                + Add achievement
              </button>
            </div>
            {gradeCardForm.achievements.map((a, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <input value={a} onChange={(e) => {
                    const next = [...gradeCardForm.achievements]; next[i] = e.target.value;
                    setGradeCardForm({ ...gradeCardForm, achievements: next });
                  }} placeholder="e.g. Top Performer" />
                </div>
                <button type="button" className="btn btn-brick btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 10 }}
                  onClick={() => setGradeCardForm({ ...gradeCardForm, achievements: gradeCardForm.achievements.filter((_, idx) => idx !== i) })}>
                  Remove
                </button>
              </div>
            ))}

            <div className="section-title">
              Mentor evaluation
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, ratings: [...gradeCardForm.mentorEvaluation.ratings, { criteria: '', score: 5 }] } })}>
                + Add rating
              </button>
            </div>
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
                <button type="button" className="btn btn-brick btn-sm" style={{ alignSelf: 'flex-end', marginBottom: 10 }}
                  onClick={() => setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, ratings: gradeCardForm.mentorEvaluation.ratings.filter((_, idx) => idx !== i) } })}>
                  Remove
                </button>
              </div>
            ))}
            <div className="field">
              <label>Recommendation</label>
              <input value={gradeCardForm.mentorEvaluation.recommendation} onChange={(e) => setGradeCardForm({ ...gradeCardForm, mentorEvaluation: { ...gradeCardForm.mentorEvaluation, recommendation: e.target.value } })} placeholder="e.g. Highly Recommended" />
            </div>

            <div className="section-title">Mentor remarks</div>
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

            <div className="section-title">Interview readiness</div>
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

            <div className="section-title">Verification</div>
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

            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn btn-gold" type="submit" disabled={gradeCardBusy}>
                {gradeCardBusy ? 'Saving…' : 'Save grade card'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowGradeCardModal(false)} disabled={gradeCardBusy}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
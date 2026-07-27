import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import { toast } from 'react-toastify';
import {
  getStudentProgressReport,
  markAttendance,
  deleteAttendance,
  bulkUploadAttendance,
  exportAttendance,
} from '../../api.js';

const STATUSES = ['present', 'absent', 'half_day'];

const STATUS_LABEL = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half day',
};

const STATUS_STAMP_CLASS = {
  present: 'stamp-active',
  absent: 'stamp-inactive',
  half_day: 'stamp-active',
};

const todayStr = () => new Date().toISOString().substring(0, 10);

const emptyForm = { date: todayStr(), status: 'present', remarks: '' };

const statCardStyle = {
  background: '#fff',
  border: '1px solid var(--paper-line)',
  borderRadius: 10,
  padding: '18px 20px',
};

const statLabelStyle = {
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted, #8a8398)',
  marginTop: 6,
};

function StatCard({ value, label }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontFamily: 'var(--serif, Georgia, serif)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

export default function FacultyAttendance() {
  const { studentId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // attendance record id, or null = new
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // ---- Bulk upload (Excel) ----
  const fileInputRef = useRef(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSummary, setBulkSummary] = useState(null);

  // ---- Export (Excel) ----
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');

  const load = () => {
    setLoading(true);
    getStudentProgressReport(studentId)
      .then(({ data }) => setReport(data.report))
      .catch((err) => setError(err.response?.data?.message || 'Could not load attendance'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [studentId]);

  const records = [...(report?.attendance || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const counts = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, half_day: 0 }
  );
  const countedTotal = counts.present + counts.absent + counts.half_day;
  const attendancePct = countedTotal > 0
    ? Math.round(((counts.present + counts.half_day * 0.5) / countedTotal) * 100)
    : null;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (record) => {
    setForm({
      date: new Date(record.date).toISOString().substring(0, 10),
      status: record.status,
      remarks: record.remarks || '',
    });
    setEditingId(record._id);
    setFormError('');
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await markAttendance(studentId, form);
      toast.success(editingId ? 'Attendance record updated!' : 'Attendance record created!');
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save attendance');
      setFormError(err.response?.data?.message || 'Could not save attendance');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (record) => {
    if (!confirm(`Remove the attendance record for ${new Date(record.date).toLocaleDateString()}?`)) return;
    try {
      await deleteAttendance(studentId, record._id);
      toast.success('Attendance record deleted!');
      if (editingId === record._id) resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove this record');
      setError(err.response?.data?.message || 'Could not remove this record');
    }
  };

  // ---- Bulk upload handlers ----
  const openBulkUpload = () => {
    setBulkError('');
    setBulkSummary(null);
    fileInputRef.current?.click();
  };

  const handleBulkFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError('');
    setBulkSummary(null);
    setBulkBusy(true);
    try {
      const { data } = await bulkUploadAttendance(studentId, file);
      toast.success('Bulk attendance upload complete!');
      setBulkSummary({ added: data.added, updated: data.updated, failed: data.failed || [] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not process this Excel file');
      setBulkError(err.response?.data?.message || 'Could not process this Excel file');
    } finally {
      setBulkBusy(false);
      e.target.value = '';
    }
  };

  // ---- Export handler ----
  const handleExport = async () => {
    setExportError('');
    setExportBusy(true);
    try {
      await exportAttendance(studentId, report?.student?.name || 'student');
      toast.success('Attendance exported successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not export attendance');
      setExportError(err.response?.data?.message || 'Could not export attendance');
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <Link to="/faculty/students" style={{ color: 'inherit' }}>My Students</Link> /{' '}
            <Link to={`/faculty/students/${studentId}`} style={{ color: 'inherit' }}>
              {report?.student?.name || 'Report'}
            </Link>{' '}
            / Attendance
          </div>
          <h1>{report?.student?.name || 'Attendance'}</h1>
          <p className="sub">Daily attendance record — one entry per date.</p>
        </div>
        {report && (
          <div className="btn-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleBulkFileChange}
            />
            <button className="btn btn-ghost" type="button" onClick={openBulkUpload} disabled={bulkBusy}>
              {bulkBusy ? 'Uploading…' : 'Bulk upload (Excel)'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleExport} disabled={exportBusy}>
              {exportBusy ? 'Exporting…' : 'Export to Excel'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
      {exportError && <div className="form-error">{exportError}</div>}
      {bulkError && <div className="form-error">{bulkError}</div>}
      {bulkSummary && (
        <div className="card card-pad" style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Bulk upload result</div>
          <p style={{ margin: 0 }}>
            {bulkSummary.added} added, {bulkSummary.updated} updated
            {bulkSummary.failed.length ? `, ${bulkSummary.failed.length} failed` : ''}.
          </p>
          {bulkSummary.failed.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {bulkSummary.failed.map((f, i) => (
                <li key={i}>Row {f.row}: {f.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {loading && <div className="loading-line">Fetching attendance…</div>}

      {report && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard value={attendancePct != null ? `${attendancePct}%` : '—'} label="Attendance rate" />
            <StatCard value={counts.present} label="Present" />
            <StatCard value={counts.absent} label="Absent" />
            <StatCard value={counts.half_day} label="Half Days" />
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              {editingId ? 'Edit attendance record' : 'Mark attendance'}
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <form onSubmit={submitForm}>
              <div className="field-row">
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Remarks</label>
                <input
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Optional note, e.g. reason for absence"
                />
              </div>
              <div className="btn-row">
                <button className="btn btn-gold" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Mark attendance'}
                </button>
                {editingId && (
                  <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={busy}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="section-title">Records ({records.length})</div>

          {records.length === 0 ? (
            <div className="card card-pad muted" style={{ fontStyle: 'italic' }}>
              No attendance marked yet — use the form above to add the first record.
            </div>
          ) : (
            <div className="card">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Marked by</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id}>
                      <td className="cell-mono">{new Date(r.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`stamp ${STATUS_STAMP_CLASS[r.status]}`} style={{ fontSize: 10.5 }}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td>{r.remarks || '—'}</td>
                      <td>{r.markedBy?.name || '—'}</td>
                      <td>
                        <div className="btn-row">
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(r)}>Edit</button>
                          <button className="btn btn-brick btn-sm" onClick={() => handleDelete(r)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
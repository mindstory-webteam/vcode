import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import StampBadge from '../../components/StampBadge.jsx';
import { toast } from 'react-toastify';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import {
  getAllStudents,
  getAllFaculty,
  createStudent,
  assignFacultyToStudent,
  toggleUserActive,
  deleteUser,
  fileUrl,
  bulkImportStudentsAndProgressReports,
  downloadBulkImportTemplate,
} from '../../api.js';

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  rollNumber: '', department: '', course: '', semester: '', assignedFacultyId: '',
};

export default function Students() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(students.map(s => s._id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!await confirm(`Are you sure you want to permanently delete ${selectedIds.length} students?`)) return;
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => deleteUser(id)));
      toast.success('Successfully deleted selected students!');
      setSelectedIds([]);
      load();
    } catch (err) {
      toast.error('Failed to delete some students. They may already be deleted.');
      setError('Failed to delete some students. They may already be deleted.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignChoice, setAssignChoice] = useState('');

  // Bulk import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkError, setBulkError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getAllStudents(), getAllFaculty()])
      .then(([sRes, fRes]) => {
        setStudents(sRes.data.students);
        setFaculty(fRes.data.faculty);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load students'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await createStudent({ ...form, assignedFacultyId: form.assignedFacultyId || undefined });
      toast.success('Student created successfully!');
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create student');
      setFormError(err.response?.data?.message || 'Could not create student');
    } finally {
      setBusy(false);
    }
  };

  const openAssign = (student) => {
    setAssignTarget(student);
    setAssignChoice(student.studentInfo?.assignedFaculty?._id || '');
  };

  const submitAssign = async () => {
    if (!assignChoice) return;
    setBusy(true);
    try {
      await assignFacultyToStudent(assignTarget._id, assignChoice);
      toast.success('Faculty assigned successfully!');
      setAssignTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not assign faculty');
      setError(err.response?.data?.message || 'Could not assign faculty');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (student) => {
    try {
      await toggleUserActive(student._id);
      toast.success(`Student status updated to ${student.isActive ? 'Inactive' : 'Active'}!`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update student status');
      setError(err.response?.data?.message || 'Could not update student status');
    }
  };

  const handleDelete = async (student) => {
    if (!await confirm(`Permanently delete ${student.name}'s account and progress report?`)) return;
    try {
      await deleteUser(student._id);
      toast.success('Student deleted successfully!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete student');
      setError(err.response?.data?.message || 'Could not delete student');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;
    setBulkError('');
    setBulkMsg('');
    setBulkBusy(true);
    try {
      const res = await bulkImportStudentsAndProgressReports(bulkFile);
      toast.success(res.data.message || 'Bulk import successful!');
      setBulkMsg(res.data.message || 'Bulk import successful');
      setBulkFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed. Please check the Excel format.');
      setBulkError(err.response?.data?.message || 'Bulk import failed. Please check the Excel format.');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">Student roster</div>
          <h1>Students</h1>
          <p className="sub">Everyone with an active account, who they're assigned to, and their standing.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setShowBulkModal(true)}>
            Bulk Import Excel
          </button>
          <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
            + Add student directly
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 16, background: '#fcf3f3', border: '1px solid #f2dede', borderRadius: 6, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#a94442' }}>{selectedIds.length} students selected</span>
          <button className="btn btn-brick btn-sm" onClick={handleBulkDelete} disabled={deletingBulk}>
            {deletingBulk ? 'Deleting…' : 'Delete Selected'}
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-line">Fetching students…</div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th style={{ width: 44, paddingRight: 0, textAlign: 'center' }}><input type="checkbox" checked={students.length > 0 && selectedIds.length === students.length} onChange={handleSelectAll} style={{ cursor: 'pointer' }} /></th>
                <th>Student</th>
                <th>Roll no.</th>
                <th>Assigned faculty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>No students on file yet.</td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s._id}>
                  <td style={{ width: 44, paddingRight: 0, textAlign: 'center' }}><input type="checkbox" checked={selectedIds.includes(s._id)} onChange={() => toggleSelect(s._id)} style={{ cursor: 'pointer' }} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.profileImage ? (
                        <img
                          src={fileUrl(s.profileImage)}
                          alt={s.name}
                          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--paper-line)' }}
                        />
                      ) : (
                        <div className="avatar-initial">{s.name?.[0]?.toUpperCase()}</div>
                      )}
                      <div>
                        <div className="cell-name">{s.name}</div>
                        <div className="cell-sub">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-mono">{s.studentInfo?.rollNumber || '—'}</td>
                  <td>
                    {s.studentInfo?.assignedFaculty ? (
                      s.studentInfo.assignedFaculty.name
                    ) : (
                      <span className="muted">Unassigned</span>
                    )}
                  </td>
                  <td><StampBadge status={s.isActive ? 'active' : 'inactive'} /></td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/superadmin/students/${s._id}`)}>
                        Open report
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openAssign(s)}>
                        Assign faculty
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(s)}>
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-brick btn-sm" onClick={() => handleDelete(s)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* BULK IMPORT EXCEL MODAL */}
      {showBulkModal && (
        <Modal title="Bulk Import Students & Progress Reports" onClose={() => { setShowBulkModal(false); setBulkMsg(''); setBulkError(''); setBulkFile(null); }}>
          <div style={{ marginBottom: 16, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            Upload an Excel file (<code>.xlsx</code>) containing student account details and full progress reports (remarks, entries, attendance, and grade card).
          </div>

          {bulkError && <div className="form-error" style={{ marginBottom: 12 }}>{bulkError}</div>}
          {bulkMsg && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#e6f4ea', color: '#137333', borderRadius: 4, fontSize: 13 }}>
              {bulkMsg}
            </div>
          )}

          <form onSubmit={handleBulkSubmit}>
            <div className="field">
              <label>Select Excel file (.xlsx / .xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                required
                onChange={(e) => setBulkFile(e.target.files[0])}
              />
            </div>

            <div style={{ margin: '14px 0' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={downloadBulkImportTemplate}
              >
                Download Sample Template
              </button>
            </div>

            <div className="btn-row">
              <button className="btn btn-gold" type="submit" disabled={bulkBusy || !bulkFile}>
                {bulkBusy ? 'Importing…' : 'Upload & Import'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setShowBulkModal(false); setBulkMsg(''); setBulkError(''); setBulkFile(null); }} disabled={bulkBusy}>
                Close
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showCreate && (
        <Modal title="Add a student directly" onClose={() => setShowCreate(false)}>
          {formError && <div className="form-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Full name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Roll number</label>
                <input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="field">
                <label>Semester</label>
                <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Course</label>
              <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            </div>
            <div className="field">
              <label>Assign faculty (optional)</label>
              <select value={form.assignedFacultyId} onChange={(e) => setForm({ ...form, assignedFacultyId: e.target.value })}>
                <option value="">No faculty yet</option>
                {faculty.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="btn-row">
              <button className="btn btn-gold" type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create student'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowCreate(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {assignTarget && (
        <Modal title={`Assign faculty to ${assignTarget.name}`} onClose={() => setAssignTarget(null)}>
          <div className="field">
            <label>Faculty</label>
            <select value={assignChoice} onChange={(e) => setAssignChoice(e.target.value)}>
              <option value="">Select faculty</option>
              {faculty.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} {f.facultyInfo?.department ? `· ${f.facultyInfo.department}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn btn-teal" onClick={submitAssign} disabled={busy || !assignChoice}>
              {busy ? 'Assigning…' : 'Confirm assignment'}
            </button>
            <button className="btn btn-ghost" onClick={() => setAssignTarget(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
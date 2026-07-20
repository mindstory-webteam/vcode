import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import StampBadge from '../../components/StampBadge.jsx';
import {
  getAllStudents,
  getAllFaculty,
  createStudent,
  assignFacultyToStudent,
  toggleUserActive,
  deleteUser,
} from '../../api.js';

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  rollNumber: '', department: '', course: '', semester: '', assignedFacultyId: '',
};

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignChoice, setAssignChoice] = useState('');

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
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
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
      setAssignTarget(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign faculty');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (student) => {
    try {
      await toggleUserActive(student._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update student status');
    }
  };

  const handleDelete = async (student) => {
    if (!confirm(`Permanently delete ${student.name}'s account and progress report?`)) return;
    try {
      await deleteUser(student._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete student');
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
        <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
          + Add student directly
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-line">Fetching students…</div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
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
                  <td colSpan={5}>No students on file yet.</td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.profileImage ? (
                        <img
                          src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${s.profileImage}`}
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
                <option value="">— No faculty yet —</option>
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
              <option value="">— Select faculty —</option>
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
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import StampBadge from '../../components/StampBadge.jsx';
import { toast } from 'react-toastify';
import { getAllFaculty, createFaculty, toggleUserActive, deleteUser } from '../../api.js';

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  department: '', designation: '', employeeId: '',
};

export default function Faculty() {
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
    if (e.target.checked) setSelectedIds(faculty.map(f => f._id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} faculty? Their students will become unassigned.`)) return;
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => deleteUser(id)));
      toast.success('Successfully deleted selected faculty!');
      setSelectedIds([]);
      load();
    } catch (err) {
      toast.error('Failed to delete some faculty. They may already be deleted.');
      setError('Failed to delete some faculty. They may already be deleted.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const load = () => {
    setLoading(true);
    getAllFaculty()
      .then(({ data }) => setFaculty(data.faculty))
      .catch((err) => setError(err.response?.data?.message || 'Could not load faculty'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      await createFaculty(form);
      toast.success('Faculty created successfully!');
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create faculty account');
      setFormError(err.response?.data?.message || 'Could not create faculty account');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (f) => {
    try {
      await toggleUserActive(f._id);
      toast.success(`Faculty status updated to ${f.isActive ? 'Inactive' : 'Active'}!`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update faculty status');
      setError(err.response?.data?.message || 'Could not update faculty status');
    }
  };

  const handleDelete = async (f) => {
    if (!confirm(`Permanently delete ${f.name}'s faculty account? Their students will become unassigned.`)) return;
    try {
      await deleteUser(f._id);
      toast.success('Faculty deleted successfully!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete faculty');
      setError(err.response?.data?.message || 'Could not delete faculty');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">Staff roster</div>
          <h1>Faculty</h1>
          <p className="sub">Faculty accounts are created here directly — they never self-register.</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
          + Add faculty
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 16, background: '#fcf3f3', border: '1px solid #f2dede', borderRadius: 6, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#a94442' }}>{selectedIds.length} faculty selected</span>
          <button className="btn btn-brick btn-sm" onClick={handleBulkDelete} disabled={deletingBulk}>
            {deletingBulk ? 'Deleting…' : 'Delete Selected'}
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-line">Fetching faculty…</div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th style={{ width: 44, paddingRight: 0, textAlign: 'center' }}><input type="checkbox" checked={faculty.length > 0 && selectedIds.length === faculty.length} onChange={handleSelectAll} style={{ cursor: 'pointer' }} /></th>
                <th>Faculty</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {faculty.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>No faculty on file yet.</td>
                </tr>
              )}
              {faculty.map((f) => (
                <tr key={f._id}>
                  <td style={{ width: 44, paddingRight: 0, textAlign: 'center' }}><input type="checkbox" checked={selectedIds.includes(f._id)} onChange={() => toggleSelect(f._id)} style={{ cursor: 'pointer' }} /></td>
                  <td>
                    <div className="cell-name">{f.name}</div>
                    <div className="cell-sub">{f.email}</div>
                  </td>
                  <td>{f.facultyInfo?.department || '—'}</td>
                  <td>{f.facultyInfo?.designation || '—'}</td>
                  <td><StampBadge status={f.isActive ? 'active' : 'inactive'} /></td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(f)}>
                        {f.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-brick btn-sm" onClick={() => handleDelete(f)}>
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
        <Modal title="Add a faculty account" onClose={() => setShowCreate(false)}>
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
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="field">
                <label>Designation</label>
                <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Assistant Professor" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Employee ID</label>
                <input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="btn-row">
              <button className="btn btn-gold" type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create faculty'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setShowCreate(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}

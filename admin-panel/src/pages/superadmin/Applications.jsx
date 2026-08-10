import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import Modal from '../../components/Modal.jsx';
import StampBadge from '../../components/StampBadge.jsx';
import { toast } from 'react-toastify';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { Trash2 } from 'lucide-react';
import {
  getApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
  getAllFaculty,
} from '../../api.js';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function Applications() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [facultyChoice, setFacultyChoice] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    Promise.all([getApplications(tab), getAllFaculty()])
      .then(([appsRes, facRes]) => {
        setApplications(appsRes.data.applications);
        setFaculty(facRes.data.faculty);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load applications'))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [tab]);

  const openApprove = (app) => {
    setApproveTarget(app);
    setFacultyChoice('');
  };

  const submitApprove = async () => {
    setBusy(true);
    try {
      await approveApplication(approveTarget._id, facultyChoice || undefined);
      toast.success('Application approved successfully!');
      setApproveTarget(null);
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not approve application');
      setError(err.response?.data?.message || 'Could not approve application');
    } finally {
      setBusy(false);
    }
  };

  const submitReject = async () => {
    setBusy(true);
    try {
      await rejectApplication(rejectTarget._id, rejectReason || 'Not specified');
      toast.success('Application rejected successfully!');
      setRejectTarget(null);
      setRejectReason('');
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reject application');
      setError(err.response?.data?.message || 'Could not reject application');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (app) => {
    if (!await confirm(`Permanently delete ${app.name}'s application?`)) return;
    try {
      await deleteApplication(app._id);
      toast.success('Application deleted successfully!');
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete application');
      setError(err.response?.data?.message || 'Could not delete application');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Applications</h1>
          <p className="sub">Student self-registrations wait here until you approve or reject them.</p>
        </div>
      </div>

      <div className="tab-row">
        {TABS.map((t) => (
          <div
            key={t.key}
            className={`tab-item${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-line">Fetching applications…</div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Roll no.</th>
                <th>Department</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>No {tab} applications right now.</td>
                </tr>
              )}
              {applications.map((app) => (
                <tr key={app._id}>
                  <td>
                    <div className="cell-name">{app.name}</div>
                    <div className="cell-sub">{app.email}</div>
                  </td>
                  <td className="cell-mono">{app.rollNumber || 'N/A'}</td>
                  <td>{app.department || 'N/A'}</td>
                  <td className="cell-mono">{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td><StampBadge status={app.status} /></td>
                  <td>
                    <div className="btn-row">
                      {tab === 'pending' && (
                        <>
                          <button className="btn btn-teal btn-sm" onClick={() => openApprove(app)}>
                            Approve
                          </button>
                          <button className="btn btn-brick btn-sm" onClick={() => setRejectTarget(app)}>
                            Reject
                          </button>
                        </>
                      )}
                      {(tab === 'approved' || tab === 'rejected') && (
                        <button
                          className="btn btn-brick btn-sm"
                          onClick={() => handleDelete(app)}
                          title="Delete Application"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {approveTarget && (
        <Modal title={`Approve ${approveTarget.name}`} onClose={() => setApproveTarget(null)}>
          <p className="muted" style={{ marginTop: 0 }}>
            This creates the student's account right away. Optionally assign a faculty now — you can
            always change it later from Students.
          </p>
          <div className="field">
            <label htmlFor="faculty-pick">Assign faculty (optional)</label>
            <select id="faculty-pick" value={facultyChoice} onChange={(e) => setFacultyChoice(e.target.value)}>
              <option value="">No faculty yet</option>
              {faculty.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} {f.facultyInfo?.department ? `· ${f.facultyInfo.department}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn btn-teal" onClick={submitApprove} disabled={busy}>
              {busy ? 'Approving…' : 'Confirm approval'}
            </button>
            <button className="btn btn-ghost" onClick={() => setApproveTarget(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {rejectTarget && (
        <Modal title={`Reject ${rejectTarget.name}`} onClose={() => setRejectTarget(null)}>
          <div className="field">
            <label htmlFor="reject-reason">Reason (shown to the applicant)</label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Duplicate application, incomplete details…"
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-brick" onClick={submitReject} disabled={busy}>
              {busy ? 'Rejecting…' : 'Confirm rejection'}
            </button>
            <button className="btn btn-ghost" onClick={() => setRejectTarget(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

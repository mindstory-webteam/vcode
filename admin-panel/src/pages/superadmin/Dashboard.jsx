import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import { getDashboardStats } from '../../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setStats(data.stats))
      .catch((err) => setError(err.response?.data?.message || 'Could not load dashboard stats'));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">Registrar overview</div>
          <h1>Dashboard</h1>
          <p className="sub">A running tally of everyone recorded in the ledger, and what still needs your signature.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!stats && !error && <div className="loading-line">Reading the ledger…</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-num">{stats.totalFaculty}</div>
            <div className="stat-label">Faculty on file</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num">{stats.totalStudents}</div>
            <div className="stat-label">Students on file</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num">{stats.pendingApplications}</div>
            <div className="stat-label">Applications pending</div>
          </div>
          <div className="stat-tile">
            <div className="stat-num">{stats.unassignedStudents}</div>
            <div className="stat-label">Students unassigned</div>
          </div>
        </div>
      )}

      <div className="card card-pad">
        <div className="section-title">Quick notes</div>
        <p className="muted" style={{ margin: 0 }}>
          New registrations land in <strong>Applications</strong> until you approve or reject them. Approving
          creates the student's account immediately and — if you pick a faculty at the same time — assigns
          them in one step. You can always reassign later from <strong>Students</strong>.
        </p>
      </div>
    </Layout>
  );
}

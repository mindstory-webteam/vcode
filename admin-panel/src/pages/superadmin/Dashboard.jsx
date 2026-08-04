import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import { getDashboardStats } from '../../api.js';

/* ---------- inline icon set, matches sidebar icon language ---------- */

const IconFaculty = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <path d="M8.5 7.5V6a2.5 2.5 0 0 1 2.5-2.5h2A2.5 2.5 0 0 1 15 6v1.5" />
    <path d="M3.5 12.5h17" />
  </svg>
);

const IconStudents = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4 2 9l10 5 10-5-10-5Z" />
    <path d="M6 11.5V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5" />
  </svg>
);

const IconPending = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

const IconUnassigned = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="3.2" />
    <path d="M5.5 19.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" strokeDasharray="2.5 2.5" />
  </svg>
);

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
          <h1>Dashboard</h1>
          <p className="sub">A running tally of everyone recorded in the ledger, and what still needs your signature.</p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!stats && !error && <div className="loading-line">Reading the ledger…</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-icon"><IconFaculty /></div>
            <div className="stat-num">{stats.totalFaculty}</div>
            <div className="stat-label">Faculty on file</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon"><IconStudents /></div>
            <div className="stat-num">{stats.totalStudents}</div>
            <div className="stat-label">Students on file</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon"><IconPending /></div>
            <div className="stat-num">{stats.pendingApplications}</div>
            <div className="stat-label">Applications pending</div>
          </div>
          <div className="stat-tile">
            <div className="stat-icon"><IconUnassigned /></div>
            <div className="stat-num">{stats.unassignedStudents}</div>
            <div className="stat-label">Students unassigned</div>
          </div>
        </div>
      )}

      <div className="card card-pad">
        <div className="section-title">Quick notes</div>
        <p className="muted" style={{ margin: 0 }}>
          New registrations land in <strong>Applications</strong> until you approve or reject them. Approving
          creates the student's account immediately and if you pick a faculty at the same time assigns
          them in one step. You can always reassign later from <strong>Students</strong>.
        </p>
      </div>
    </Layout>
  );
}
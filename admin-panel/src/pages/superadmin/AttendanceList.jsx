import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import { getAllStudents, fileUrl } from '../../api.js';

export default function SuperAdminAttendanceList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getAllStudents()
      .then(({ data }) => setStudents(data.students))
      .catch((err) => setError(err.response?.data?.message || 'Could not load students'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">Attendance</div>
          <h1>Attendance</h1>
          <p className="sub">Pick a student to view or mark their attendance.</p>
        </div>
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
                <th>Department</th>
                <th>Faculty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={5}>No students found.</td>
                </tr>
              )}
              {students.map((s) => (
                <tr
                  key={s._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/superadmin/students/${s._id}/attendance`)}
                >
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
                  <td className="cell-mono">{s.studentInfo?.rollNumber || 'N/A'}</td>
                  <td>{s.studentInfo?.department || 'N/A'}</td>
                  <td>{s.studentInfo?.assignedFaculty?.name || 'Unassigned'}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/superadmin/students/${s._id}/attendance`); }}
                    >
                      View attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
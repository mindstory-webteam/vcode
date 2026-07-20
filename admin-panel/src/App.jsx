import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/superadmin/Dashboard.jsx';
import Applications from './pages/superadmin/Applications.jsx';
import Students from './pages/superadmin/Students.jsx';
import Faculty from './pages/superadmin/Faculty.jsx';
import SuperAdminStudentReport from './pages/superadmin/StudentReport.jsx';
import MyStudents from './pages/faculty/MyStudents.jsx';
import StudentReport from './pages/faculty/StudentReport.jsx';

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-line">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-line">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty/students" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/superadmin/dashboard"
        element={<ProtectedRoute roles={['superadmin']}><Dashboard /></ProtectedRoute>}
      />
      <Route
        path="/superadmin/applications"
        element={<ProtectedRoute roles={['superadmin']}><Applications /></ProtectedRoute>}
      />
      <Route
        path="/superadmin/students"
        element={<ProtectedRoute roles={['superadmin']}><Students /></ProtectedRoute>}
      />
      <Route
        path="/superadmin/students/:studentId"
        element={<ProtectedRoute roles={['superadmin']}><SuperAdminStudentReport /></ProtectedRoute>}
      />
      <Route
        path="/superadmin/faculty"
        element={<ProtectedRoute roles={['superadmin']}><Faculty /></ProtectedRoute>}
      />

      <Route
        path="/faculty/students"
        element={<ProtectedRoute roles={['faculty']}><MyStudents /></ProtectedRoute>}
      />
      <Route
        path="/faculty/students/:studentId"
        element={<ProtectedRoute roles={['faculty']}><StudentReport /></ProtectedRoute>}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
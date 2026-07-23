import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import vcaLogo from '../../public/Logo-VCA (1).png';

/* ---------- inline icon set (no external icon library needed) ---------- */

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
  </svg>
);

const IconApplications = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5V6.8a1.3 1.3 0 0 1 1.3-1.3h13.4A1.3 1.3 0 0 1 20 6.8v10.4a1.3 1.3 0 0 1-1.3 1.3H8" />
    <path d="M4 12.5h4.2l1.3 2.2h4.2l1.3-2.2H20" />
  </svg>
);

const IconStudents = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4 2 9l10 5 10-5-10-5Z" />
    <path d="M6 11.5V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5" />
  </svg>
);

const IconFaculty = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <path d="M8.5 7.5V6a2.5 2.5 0 0 1 2.5-2.5h2A2.5 2.5 0 0 1 15 6v1.5" />
    <path d="M3.5 12.5h17" />
  </svg>
);

const SUPERADMIN_NAV = [
  { num: '01', to: '/superadmin/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { num: '02', to: '/superadmin/applications', label: 'Applications', Icon: IconApplications },
  { num: '03', to: '/superadmin/students', label: 'Students', Icon: IconStudents },
  { num: '04', to: '/superadmin/faculty', label: 'Faculty', Icon: IconFaculty },
];

const FACULTY_NAV = [
  { num: '01', to: '/faculty/students', label: 'My Students', Icon: IconStudents },
];

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === 'superadmin' ? SUPERADMIN_NAV : FACULTY_NAV;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={vcaLogo} alt="VCA" className="brand-logo" />
          <div className="sidebar-brand-text">
            <div className="role-tag">{user?.role === 'superadmin' ? 'SuperAdmin Console' : 'Faculty Console'}</div>
          </div>
        </div>

        <ul className="nav-list">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
              >
                {/* <span className="num">{item.num}</span> */}
                <span className="nav-icon">
                  <item.Icon />
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="signed-in-as">
            Signed in as
            <strong>{user?.name}</strong>
            {user?.email}
          </div>
          <button className="btn-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-column">{children}</main>
    </div>
  );
}
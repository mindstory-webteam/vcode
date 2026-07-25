import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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

const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/* ---------- nav config ----------
   Items can be either a plain link ({ to, label, Icon }) or a dropdown
   group ({ label, Icon, children: [{ to, label }, ...] }). */

const SUPERADMIN_NAV = [
  { num: '01', to: '/superadmin/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { num: '02', to: '/superadmin/applications', label: 'Applications', Icon: IconApplications },
  {
    num: '03',
    label: 'Students',
    Icon: IconStudents,
    children: [
      { to: '/superadmin/students', label: 'All Students' },
      { to: '/superadmin/attendance', label: 'Attendance' },
    ],
  },
  { num: '04', to: '/superadmin/faculty', label: 'Faculty', Icon: IconFaculty },
];

const FACULTY_NAV = [
  {
    num: '01',
    label: 'Students',
    Icon: IconStudents,
    children: [
      { to: '/faculty/students', label: 'My Students' },
      { to: '/faculty/attendance', label: 'Attendance' },
    ],
  },
];

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === 'superadmin' ? SUPERADMIN_NAV : FACULTY_NAV;

  // Track which dropdown groups are open. A group auto-opens if the current
  // route matches one of its children, so refreshing on a sub-page doesn't
  // hide the active link.
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    nav.forEach((item) => {
      if (item.children) {
        initial[item.label] = item.children.some((c) => location.pathname.startsWith(c.to));
      }
    });
    return initial;
  });

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={vcaLogo} alt="VCA" className="brand-logo" />
        </div>

        <ul className="nav-list">
          {nav.map((item) => {
            if (item.children) {
              const isOpen = !!openGroups[item.label];
              const isGroupActive = item.children.some((c) => location.pathname.startsWith(c.to));
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`nav-tab nav-group-toggle${isGroupActive ? ' active' : ''}`}
                    onClick={() => toggleGroup(item.label)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                      color: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span className="nav-icon">
                      <item.Icon />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        transition: 'transform 0.15s ease',
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      <IconChevron />
                    </span>
                  </button>

                  {isOpen && (
                    <ul className="nav-submenu" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <NavLink
                            to={child.to}
                            className={({ isActive }) => `nav-tab nav-sublink${isActive ? ' active' : ''}`}
                            style={{ paddingLeft: 44 }}
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
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
            );
          })}
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
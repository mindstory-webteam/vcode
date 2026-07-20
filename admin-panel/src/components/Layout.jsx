import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const SUPERADMIN_NAV = [
  { num: '01', to: '/superadmin/dashboard', label: 'Dashboard' },
  { num: '02', to: '/superadmin/applications', label: 'Applications' },
  { num: '03', to: '/superadmin/students', label: 'Students' },
  { num: '04', to: '/superadmin/faculty', label: 'Faculty' },
];

const FACULTY_NAV = [
  { num: '01', to: '/faculty/students', label: 'My Students' },
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
          <div className="mark">
            Registrar <span>LEDGER</span>
          </div>
          <div className="role-tag">{user?.role === 'superadmin' ? 'SuperAdmin Console' : 'Faculty Console'}</div>
        </div>

        <ul className="nav-list">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
              >
                <span className="num">{item.num}</span>
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

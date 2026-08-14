import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import { updateProfile, updatePassword, fileUrl } from '../api';
import Modal from './Modal.jsx';
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

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const IconTasks = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
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
  { num: '05', to: '/superadmin/notifications', label: 'Broadcasts', Icon: IconBell },
  { num: '06', to: '/superadmin/todos', label: 'To-Do Board', Icon: IconTasks },
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
  { num: '02', to: '/faculty/todos', label: 'To-Do Board', Icon: IconTasks },
];

export default function Layout({ children }) {
  const { user, signOut, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === 'superadmin' ? SUPERADMIN_NAV : FACULTY_NAV;
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);

  const handlePhotoClick = () => {
    document.getElementById('profile-photo-input').click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    try {
      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('email', profileEmail);
      if (profilePhotoFile) {
        formData.append('profileImage', profilePhotoFile);
      }

      const res = await updateProfile(formData);
      if (res.data && res.data.success) {
        updateProfileState(res.data.user);
        toast.success('Profile updated successfully!');
        setShowEditProfileModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileBusy(false);
    }
  };

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

        <div className="sidebar-footer" style={{ position: 'relative', padding: '16px 12px', borderTop: '1px solid var(--paper-line)' }}>
          {/* Dropdown Popover */}
          {profileDropdownOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '12px',
              right: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 100
            }}>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setProfileName(user?.name || '');
                  setProfileEmail(user?.email || '');
                  setProfilePhotoFile(null);
                  setProfilePhotoPreview(user?.profileImage ? fileUrl(user.profileImage) : '');
                  setShowEditProfileModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#1e293b',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: '#64748b' }}>
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>

              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#ef4444',
                  fontSize: '13.5px',
                  fontWeight: '500',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: '#ef4444' }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          )}

          {/* Profile Footer Button Card */}
          <div 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background 0.2s ease, border-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            {/* Avatar Circle */}
            {user?.profileImage ? (
              <img
                src={fileUrl(user.profileImage)}
                alt={user.name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#14b8a6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '13.5px',
                flexShrink: 0
              }}>
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
              </div>
            )}

            {/* Info Text */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontWeight: '600',
                fontSize: '13.5px',
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2'
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: '11.5px',
                color: '#64748b',
                textTransform: 'capitalize',
                lineHeight: '1.2',
                marginTop: '2px'
              }}>
                {user?.role}
              </div>
            </div>
            
            {/* Small Chevron Up/Down */}
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ 
                width: 14, 
                height: 14, 
                color: '#64748b', 
                flexShrink: 0,
                transform: profileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
        </div>
      </aside>

      <main className="main-column">{children}</main>




      {showEditProfileModal && (
        <Modal title="Edit profile" onClose={() => setShowEditProfileModal(false)}>
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
            
            {/* Avatar Circle Container with Camera Icon */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handlePhotoClick}>
              {profilePhotoPreview ? (
                <img
                  src={profilePhotoPreview}
                  alt="Profile Preview"
                  style={{ width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                />
              ) : (
                <div style={{
                  width: '130px',
                  height: '130px',
                  borderRadius: '50%',
                  background: '#12b886',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '38px',
                  userSelect: 'none'
                }}>
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                </div>
              )}
              {/* Overlay camera circle */}
              <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>

            <input
              type="file"
              id="profile-photo-input"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />

            {/* Input Fields Card Style */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Display name</label>
                <input
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#1e293b'
                  }}
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>



            {/* Bottom Action Buttons */}
            <div className="btn-row" style={{ width: '100%', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowEditProfileModal(false)}
                disabled={profileBusy}
                style={{
                  padding: '9px 20px',
                  borderRadius: '999px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  background: 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileBusy}
                style={{
                  padding: '9px 24px',
                  borderRadius: '999px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  background: '#8a4490',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {profileBusy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
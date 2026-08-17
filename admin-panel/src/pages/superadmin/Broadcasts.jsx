import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import { toast } from 'react-toastify';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { Trash2, Send, Clock, Calendar } from 'lucide-react';
import StampBadge from '../../components/StampBadge.jsx';
import { getNotificationsAdmin, sendBroadcastNotification, deleteNotificationAdmin, searchStudentsAdmin, getDistinctDepartmentsAdmin, fileUrl } from '../../api.js';

export default function Broadcasts() {
  const confirm = useConfirm();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  const [targetType, setTargetType] = useState('all'); // 'all', 'department', 'student'
  const [targetDepartment, setTargetDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const triggerStudentSearch = async (val) => {
    if (!val.trim()) {
      setStudentResults([]);
      return;
    }
    try {
      setSearchingStudents(true);
      const res = await searchStudentsAdmin(val);
      if (res.data && res.data.success) {
        setStudentResults(res.data.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingStudents(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await getNotificationsAdmin();
      if (res.data && res.data.success) {
        setHistory(res.data.notifications || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load broadcast history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const res = await getDistinctDepartmentsAdmin();
      if (res.data && res.data.success) {
        setDepartmentsList(res.data.departments || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load departments list');
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchDepartments();
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.warn('Please fill in both title and message');
      return;
    }

    if (targetType === 'department' && !targetDepartment) {
      toast.warn('Please select a target department');
      return;
    }

    if (targetType === 'student' && !selectedStudent) {
      toast.warn('Please select a target student');
      return;
    }

    let scheduledTime = null;
    if (isScheduled) {
      if (!scheduleDate) {
        toast.warn('Please pick a schedule date & time');
        return;
      }
      scheduledTime = new Date(scheduleDate).toISOString();
      if (new Date(scheduleDate).getTime() <= Date.now()) {
        toast.warn('Schedule date must be in the future');
        return;
      }
    }

    try {
      setSending(true);
      setError('');
      const res = await sendBroadcastNotification(
        title,
        message,
        scheduledTime,
        targetType,
        targetDepartment,
        selectedStudent ? selectedStudent._id : null
      );
      if (res.data && res.data.success) {
        toast.success(isScheduled ? 'Broadcast scheduled successfully!' : 'Broadcast sent successfully!');
        setTitle('');
        setMessage('');
        setIsScheduled(false);
        setScheduleDate('');
        setTargetType('all');
        setTargetDepartment('');
        setSelectedStudent(null);
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to dispatch broadcast');
      toast.error('Failed to dispatch broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id, broadcastTitle) => {
    if (!await confirm(`Are you sure you want to permanently delete the broadcast "${broadcastTitle}"? This will cancel any pending schedule or remove it from all users' notification lists.`)) return;

    try {
      const res = await deleteNotificationAdmin(id);
      if (res.data && res.data.success) {
        toast.success('Broadcast deleted globally!');
        setHistory(prev => prev.filter(h => h._id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete broadcast');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(history.map(h => h._id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!await confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected broadcasts? This will cancel any pending schedules and remove them from all users' notification lists.`)) return;
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => deleteNotificationAdmin(id)));
      toast.success('Successfully deleted selected broadcasts!');
      setHistory(prev => prev.filter(h => !selectedIds.includes(h._id)));
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete some broadcasts.');
    } finally {
      setDeletingBulk(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Broadcast Notifications</h1>
          <p className="sub">Send real-time alerts and notices to all users </p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="tab-row">
        <div
          className={`tab-item${activeTab === 'new' ? ' active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          New Broadcast
        </div>
        <div
          className={`tab-item${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Broadcast History
          {history.length > 0 && (
            <span style={{
              fontSize: '0.75rem',
              background: activeTab === 'history' ? '#f3f0ff' : '#f1f5f9',
              color: activeTab === 'history' ? 'var(--purple-deep)' : 'var(--muted)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              {history.length}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Send Broadcast Form */}
        {activeTab === 'new' && (
          <div className="card card-pad" style={{ padding: '2rem', maxWidth: '100%', width: '100%' }}>
            <div className="section-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>New Broadcast</div>
            <p className="muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Draft a notice to distribute immediately or schedule for a specific date and time.
            </p>

            {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handleSend} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'stretch' }}>
              {/* Left Column: Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="field">
                  <label style={{ fontWeight: '500', color: '#444' }}>Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                  />
                </div>
                
                <div className="field" style={{ marginTop: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                  <label style={{ fontWeight: '500', color: '#444' }}>Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your announcement details here..."
                    style={{
                      flex: 1,
                      resize: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Schedule & Dispatch */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
                <div>
                  {/* Audience Selection Card */}
                  <div style={{ 
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.75rem' }}>Audience Target</div>
                    
                    {/* Segmented control tabs */}
                    <div style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      padding: '3px',
                      marginBottom: '1rem'
                    }}>
                      {['all', 'department', 'student'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTargetType(t);
                            setTargetDepartment('');
                            setSelectedStudent(null);
                            setSearchQuery('');
                            setStudentResults([]);
                          }}
                          style={{
                            flex: 1,
                            background: targetType === t ? '#ffffff' : 'transparent',
                            color: targetType === t ? '#1e293b' : '#64748b',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: targetType === t ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {t === 'all' ? 'All Users' : t === 'department' ? 'Department' : 'Single Student'}
                        </button>
                      ))}
                    </div>

                    {/* Department Select */}
                    {targetType === 'department' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.2s ease' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Select Department</label>
                        <select
                          required
                          value={targetDepartment}
                          onChange={(e) => setTargetDepartment(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '8px 10px',
                            fontSize: '0.875rem',
                            outline: 'none'
                          }}
                        >
                          <option value=""> Choose Department </option>
                          {loadingDepartments ? (
                            <option disabled>Loading departments...</option>
                          ) : departmentsList.length > 0 ? (
                            departmentsList.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))
                          ) : (
                            <option disabled>No departments found in DB</option>
                          )}
                        </select>
                      </div>
                    )}

                    {/* Student Select Autocomplete */}
                    {targetType === 'student' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.2s ease', position: 'relative' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Search Student</label>
                        {selectedStudent ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              {selectedStudent.profileImage ? (
                                <img
                                  src={fileUrl(selectedStudent.profileImage)}
                                  alt={selectedStudent.name}
                                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: '#bfdbfe',
                                  color: '#1e3a8a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '0.85rem'
                                }}>
                                  {selectedStudent.name?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ color: '#1e3a8a', display: 'block', fontSize: '0.85rem' }}>{selectedStudent.name}</strong>
                                <div style={{ fontSize: '0.75rem', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {selectedStudent.email}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(null)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              placeholder="Search by name"
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                triggerStudentSearch(e.target.value);
                              }}
                              style={{
                                width: '100%',
                                background: '#fff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                fontSize: '0.875rem',
                                outline: 'none'
                              }}
                            />
                            {searchingStudents && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Searching...</div>}
                            
                            {studentResults.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                maxHeight: '180px',
                                overflowY: 'auto',
                                marginTop: '4px'
                              }}>
                                {studentResults.map((s) => (
                                  <div
                                    key={s._id}
                                    onClick={() => {
                                      setSelectedStudent(s);
                                      setStudentResults([]);
                                      setSearchQuery('');
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      borderBottom: '1px solid #f1f5f9',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                  >
                                    {s.profileImage ? (
                                      <img
                                        src={fileUrl(s.profileImage)}
                                        alt={s.name}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: '#e2e8f0',
                                        color: '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem'
                                      }}>
                                        {s.name?.[0]?.toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1e293b' }}>{s.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {s.email}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Schedule Card */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e293b' }}>Schedule for Later</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>Release this notification at a future date & time</div>
                      </div>
                    </div>

                    {/* Custom toggle switch */}
                    <div
                      onClick={() => {
                        if (isScheduled) {
                          setScheduleDate('');
                        }
                        setIsScheduled(!isScheduled);
                      }}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '9999px',
                        background: isScheduled ? '#3b82f6' : '#cbd5e1',
                        padding: '2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.2s ease',
                        position: 'relative',
                        flexShrink: 0
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        transform: isScheduled ? 'translateX(20px)' : 'translateX(0)',
                        transition: 'transform 0.2s ease',
                      }} />
                    </div>
                  </div>

                  {isScheduled && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={13} />
                        Target Publication Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required={isScheduled}
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={15} />
                  {sending ? 'Processing...' : isScheduled ? 'Schedule Broadcast' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Broadcast History */}
        {activeTab === 'history' && (
          <>
            {selectedIds.length > 0 && (
              <div style={{ marginBottom: 16, background: '#fcf3f3', border: '1px solid #f2dede', borderRadius: 6, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#a94442' }}>{selectedIds.length} broadcasts selected</span>
                <button
                  className="btn btn-brick btn-sm"
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  title="Delete Selected"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            <div className="card">
              {loadingHistory ? (
                <div className="loading-line">Reading archives…</div>
              ) : history.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
                  No broadcast history found.
                </div>
              ) : (
                <table className="ledger">
                  <thead>
                    <tr>
                      <th style={{ width: 44, paddingRight: 0, textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={history.length > 0 && selectedIds.length === history.length} 
                          onChange={handleSelectAll} 
                          style={{ cursor: 'pointer' }} 
                        />
                      </th>
                      <th>Announcement Details</th>
                      <th>Target Audience</th>
                      <th>Release/Scheduled Time</th>
                      <th>Created On</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const isFuture = h.scheduledFor && new Date(h.scheduledFor).getTime() > Date.now();
                      return (
                        <tr key={h._id}>
                          <td style={{ width: 44, paddingRight: 0, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(h._id)} 
                              onChange={() => toggleSelect(h._id)} 
                              style={{ cursor: 'pointer' }} 
                            />
                          </td>
                          <td style={{ maxWidth: '450px' }}>
                            <div className="cell-name" style={{ fontWeight: '600', color: '#1e293b' }}>{h.title}</div>
                          <div className="cell-sub" style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: '1.45',
                            marginTop: '0.25rem',
                            color: '#64748b',
                            fontSize: '0.85rem'
                          }}>
                            {h.message}
                          </div>
                        </td>
                        <td>
                          {h.targetType === 'all' && (
                            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>All Users</span>
                          )}
                          {h.targetType === 'department' && (
                            <span style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: '600' }}>
                              Dept: {h.targetDepartment}
                            </span>
                          )}
                          {h.targetType === 'student' && (
                            <div style={{ fontSize: '0.85rem' }}>
                              <span style={{ color: '#7c3aed', fontWeight: '600' }}>Single Student:</span>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                                {h.targetUser ? h.targetUser.name : 'Unknown User'}
                              </div>
                              {h.targetUser && (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                  {h.targetUser.email}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="cell-mono" style={{ fontSize: '0.825rem' }}>
                          {h.scheduledFor ? new Date(h.scheduledFor).toLocaleString() : 'Immediate'}
                        </td>
                        <td className="cell-mono" style={{ fontSize: '0.825rem' }}>
                          {new Date(h.createdAt).toLocaleString()}
                        </td>
                        <td>
                          {isFuture ? (
                            <span style={{ color: '#b45309', fontWeight: '600', fontSize: '13px' }}>
                              Pending
                            </span>
                          ) : (
                            <span style={{ color: '#137333', fontWeight: '600', fontSize: '13px' }}>
                              Sent
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="btn-row">
                            <button
                              type="button"
                              className="btn btn-brick btn-sm"
                              onClick={() => handleDelete(h._id, h.title)}
                              title={isFuture ? "Cancel & Delete Schedule" : "Delete Broadcast"}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

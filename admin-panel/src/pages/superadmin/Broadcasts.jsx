import { useEffect, useState } from 'react';
import Layout from '../../components/Layout.jsx';
import { toast } from 'react-toastify';
import { getNotificationsAdmin, sendBroadcastNotification } from '../../api.js';

export default function Broadcasts() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.warn('Please fill in both title and message');
      return;
    }

    try {
      setSending(true);
      setError('');
      const res = await sendBroadcastNotification(title, message);
      if (res.data && res.data.success) {
        toast.success('Broadcast sent successfully!');
        setTitle('');
        setMessage('');
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send broadcast');
      toast.error('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="eyebrow">Announcements</div>
          <h1>Broadcast Notifications</h1>
          <p className="sub">Send real-time alerts and notices to all users via WebSockets.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Send Broadcast Form */}
        <div className="card card-pad">
          <div className="section-title">New Broadcast</div>
          <p className="muted" style={{ marginBottom: '1.5rem' }}>
            This message will be dispatched in real-time to all connected users and saved in their notification folders.
          </p>

          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSend}>
            <div className="field">
              <label>Title</label>
              <input 
                type="text" 
                required 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. System Maintenance" 
              />
            </div>
            
            <div className="field">
              <label>Message</label>
              <textarea 
                required 
                rows={4}
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Write your announcement details here..."
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  border: '1px solid #ddd', 
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={sending}
              style={{ marginTop: '1rem' }}
            >
              {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="card card-pad">
          <div className="section-title">Broadcast History</div>
          <p className="muted" style={{ marginBottom: '1.5rem' }}>
            Previously sent notifications and announcements.
          </p>

          {loadingHistory ? (
            <div className="loading-line">Reading archives…</div>
          ) : history.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              No broadcast history found.
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map((h) => (
                <div 
                  key={h._id} 
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #eee', 
                    background: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#333' }}>{h.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>
                      {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: 0, lineHeight: '1.4' }}>{h.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

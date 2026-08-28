'use client';

import { useState, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import './SchoolTherapistsSection.css';

type SchoolTherapist = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  professional_title?: string;
  approval_status: string;
  created_at: string;
};

export default function SchoolTherapistsSection() {
  const [therapists, setTherapists] = useState<SchoolTherapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/schools/therapists`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTherapists(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch school therapists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMessage('');
    setInviteUrl('');

    if (!inviteEmail) return;

    setInviteSubmitting(true);
    try {
      const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
      const res = await fetch(`${API_BASE_URL}/schools/therapists/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail, name: therapistName || undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to send invitation.');
      }

      const data = await res.json();
      setInviteMessage('✓ Invitation sent successfully!');
      if (data.invite_url) {
        setInviteUrl(data.invite_url);
      }
      setInviteEmail('');
      setTherapistName('');
      fetchTherapists();
    } catch (err: any) {
      setInviteMessage(err?.message || 'Failed to send invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      alert('Invitation link copied to clipboard!');
    }
  };

  return (
    <div className="school-therapists-container">
      <div className="invite-card">
        <h3>Invite a Therapist / Counselor</h3>
        <p>Send an official invitation link to a therapist to affiliate with your school.</p>

        <form onSubmit={handleInvite} className="invite-form">
          <div>
            <label>Therapist Name (Optional)</label>
            <input
              type="text"
              placeholder="Dr. Jane Smith"
              value={therapistName}
              onChange={(e) => setTherapistName(e.target.value)}
            />
          </div>
          <div>
            <label>Therapist Email Address *</label>
            <input
              type="email"
              required
              placeholder="therapist@domain.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-send-invite" disabled={inviteSubmitting}>
            <SendIcon fontSize="small" style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>

        {inviteMessage && (
          <p style={{ marginTop: 12, fontWeight: 600, color: inviteMessage.includes('✓') ? '#198754' : '#d93025' }}>
            {inviteMessage}
          </p>
        )}

        {inviteUrl && (
          <div style={{ marginTop: 12, background: '#f8f9fa', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e9ecef' }}>
            <span style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#495057' }}>{inviteUrl}</span>
            <button onClick={handleCopyLink} style={{ background: '#0d6efd', color: '#fff', border: 0, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ContentCopyIcon fontSize="small" /> Copy
            </button>
          </div>
        )}
      </div>

      <div className="table-card">
        <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem' }}>Affiliated Therapists</h3>

        {loading ? (
          <p style={{ padding: 20, textAlign: 'center' }}>Loading therapists...</p>
        ) : therapists.length === 0 ? (
          <p style={{ padding: 20, textAlign: 'center', color: '#6c757d' }}>No therapists associated with your school yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Professional Title</th>
                <th>Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {therapists.map((t) => (
                <tr key={t.id}>
                  <td><strong>{`${t.first_name} ${t.last_name}`}</strong></td>
                  <td>{t.email}</td>
                  <td>{t.professional_title || 'Counselor / Therapist'}</td>
                  <td>
                    <span className={`status-chip ${t.approval_status}`}>
                      {t.approval_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

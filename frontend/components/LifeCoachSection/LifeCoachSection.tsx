'use client';

import React, { useState, useEffect } from 'react';
import { Delete, Visibility, Close } from '@mui/icons-material';
import './LifeCoachSection.css';

type LifeCoach = {
  id: number;
  role_id: number;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  school_id: number;
  school_name?: string;
  school_email?: string;
  school_phone?: string;
  is_live: boolean;
  is_active: boolean;
  is_locked?: boolean;
};

export default function LifeCoachSection() {
  const [coaches, setCoaches] = useState<LifeCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<LifeCoach | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type: string, message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 4000);
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
      if (!token) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCoaches(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch life coaches', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
      if (!token) throw new Error('Authentication token missing');

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          gender: gender || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to add Life Coach');
      }

      const newCoach = await response.json();
      setCoaches((prev) => [...prev, newCoach]);
      setName('');
      setEmail('');
      setPhone('');
      setGender('');
      setShowForm(false);
      showToast('success', `✓ Life Coach "${newCoach.name}" added! Login credentials sent to ${newCoach.email}.`);
    } catch (error: any) {
      showToast('error', error.message || 'Error adding Life Coach');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoach = async (coachId: number, coachName: string) => {
    if (!window.confirm(`Are you sure you want to remove Life Coach "${coachName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
      if (!token) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches/${coachId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setCoaches((prev) => prev.filter((c) => c.id !== coachId));
        showToast('success', `✓ Life Coach "${coachName}" deleted successfully`);
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast('error', errData.detail || 'Failed to delete Life Coach');
      }
    } catch (error) {
      showToast('error', 'Failed to delete Life Coach');
    }
  };

  return (
    <div className="lifecoach-section">
      <div className="lifecoach-header">
        <div className="lifecoach-title">
          <h2>Life Coaches</h2>
          <p>Register and manage certified Life Coaches assigned to your school</p>
        </div>
        <button
          className="btn-add-coach"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Add Life Coach'}
        </button>
      </div>

      {toast.show && (
        <div className={`alert-banner ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Add Life Coach Form */}
      {showForm && (
        <div className="card-box">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem' }}>Add New Life Coach</h3>
          <form onSubmit={handleAddCoach}>
            <div className="form-grid-coach">
              <div className="form-field-coach">
                <label htmlFor="coach-name">Full Name *</label>
                <input
                  id="coach-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  required
                />
              </div>

              <div className="form-field-coach">
                <label htmlFor="coach-email">Email Address *</label>
                <input
                  id="coach-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@example.com"
                  required
                />
              </div>

              <div className="form-field-coach">
                <label htmlFor="coach-phone">Phone Number</label>
                <input
                  id="coach-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 890"
                />
              </div>

              <div className="form-field-coach">
                <label htmlFor="coach-gender">Gender</label>
                <select
                  id="coach-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-actions-coach">
              <button
                type="submit"
                className="btn-add-coach"
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Register Life Coach'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Life Coaches Table */}
      <div className="card-box" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>Loading life coaches...</div>
        ) : coaches.length === 0 ? (
          <div className="empty-coaches">
            <h4>No Life Coaches Added Yet</h4>
            <p>Click "+ Add Life Coach" above to register a life coach for your school.</p>
          </div>
        ) : (
          <table className="coach-table">
            <thead>
              <tr>
                <th>Life Coach</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="coach-user-cell">
                      <div className="coach-avatar-circle">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.phone || 'N/A'}</td>
                  <td>{c.gender || 'N/A'}</td>
                  <td>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: c.is_active ? '#ecfdf5' : '#fef2f2',
                      color: c.is_active ? '#047857' : '#b91c1c'
                    }}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="btn-action-group">
                      <button
                        className="btn-view-icon"
                        title="View Life Coach Details"
                        onClick={() => setSelectedCoach(c)}
                      >
                        <Visibility fontSize="small" />
                      </button>
                      <button
                        className="btn-delete-icon"
                        title="Delete Life Coach"
                        onClick={() => handleDeleteCoach(c.id, c.name)}
                      >
                        <Delete fontSize="small" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Popup Modal */}
      {selectedCoach && (
        <div className="modal-overlay" onClick={() => setSelectedCoach(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div className="modal-header-info">
                <div className="coach-avatar-circle" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                  {selectedCoach.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#101828' }}>{selectedCoach.name}</h3>
                  <span style={{ fontSize: '0.82rem', color: '#667085' }}>Role ID: {selectedCoach.role_id || 3} (Life Coach)</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCoach(null)}>
                <Close />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <h4 className="modal-section-title">Life Coach Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Full Name</span>
                    <span className="value">{selectedCoach.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Email Address</span>
                    <span className="value">{selectedCoach.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Phone Number</span>
                    <span className="value">{selectedCoach.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Gender</span>
                    <span className="value">{selectedCoach.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Account Status</span>
                    <span className="value" style={{ color: selectedCoach.is_active ? '#047857' : '#b91c1c' }}>
                      {selectedCoach.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Live Status</span>
                    <span className="value" style={{ color: selectedCoach.is_live ? '#047857' : '#b91c1c' }}>
                      {selectedCoach.is_live ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="modal-section-title">Affiliated School Details</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">School ID</span>
                    <span className="value">{selectedCoach.school_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">School Name</span>
                    <span className="value">{selectedCoach.school_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">School Email</span>
                    <span className="value">{selectedCoach.school_email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">School Phone</span>
                    <span className="value">{selectedCoach.school_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer-row">
              <button
                className="btn-add-coach"
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                onClick={() => setSelectedCoach(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

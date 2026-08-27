'use client';

import React, { useState, useEffect } from 'react';
import { Visibility, VisibilityOff, Lock, CheckCircle, ErrorOutline, Person, School } from '@mui/icons-material';
import './LifeCoachAccountSection.css';

type CoachAccount = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  school_id: number;
  school_name?: string;
  school_email?: string;
  school_phone?: string;
  school_type?: string;
  school_established?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  is_live: boolean;
};

export default function LifeCoachAccountSection() {
  const [account, setAccount] = useState<CoachAccount | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type: string, message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 4000);
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      const token = localStorage.getItem('lifecoach_token') || sessionStorage.getItem('lifecoach_token');
      if (!token) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccount(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setGender(data.gender || '');
      }
    } catch (error) {
      console.error('Failed to load life coach account data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const token = localStorage.getItem('lifecoach_token') || sessionStorage.getItem('lifecoach_token');
      if (!token) throw new Error('Authentication token missing');

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches/me/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone,
          gender,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update profile');
      }

      const updatedData = await response.json();
      setAccount(updatedData);
      showToast('success', 'Profile details updated successfully!');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return score;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: '', class: '' };
    if (score <= 2) return { label: 'Weak', class: 'weak' };
    if (score <= 4) return { label: 'Good', class: 'good' };
    return { label: 'Strong', class: 'strong' };
  };

  const strengthScore = calculatePasswordStrength(newPassword);
  const strengthData = getStrengthLabel(strengthScore);

  const handleCancelPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('error', 'New passwords do not match');
      return;
    }

    if (strengthScore < 5) {
      showToast('error', 'Password must meet all complexity requirements');
      return;
    }

    setPasswordSaving(true);
    try {
      const token = localStorage.getItem('lifecoach_token') || sessionStorage.getItem('lifecoach_token');
      if (!token) throw new Error('Authentication token missing');

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches/me/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Password update failed');
      }

      showToast('success', 'Password updated successfully!');
      handleCancelPassword();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading account settings...</div>;
  }

  return (
    <div className="coach-account-wrapper">
      {toast.show && (
        <div className={`toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle /> : <ErrorOutline />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Profile Details Form */}
      <section className="account-card">
        <div className="card-header-block">
          <div className="header-icon-box">
            <Person />
          </div>
          <div className="header-text">
            <h3>Life Coach Profile Details</h3>
            <p>Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit}>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="coach-name">Full Name</label>
              <input
                id="coach-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="coach-email">Email Address</label>
              <input
                id="coach-email"
                type="email"
                value={account?.email || ''}
                disabled
                readOnly
                className="readonly-input"
              />
            </div>

            <div className="field-group">
              <label htmlFor="coach-phone">Phone Number</label>
              <input
                id="coach-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="field-group">
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

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Affiliated School Details (Read-only) */}
      <section className="account-card">
        <div className="card-header-block">
          <div className="header-icon-box">
            <School />
          </div>
          <div className="header-text">
            <h3>Affiliated School & Principal Details</h3>
            <p>Complete information for the school organization and administration</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label>School Name</label>
            <input type="text" value={account?.school_name || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>School Contact Email</label>
            <input type="text" value={account?.school_email || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>School Contact Phone</label>
            <input type="text" value={account?.school_phone || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>School Type</label>
            <input type="text" value={account?.school_type || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>Established Date / Year</label>
            <input type="text" value={account?.school_established || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>Principal Name</label>
            <input type="text" value={account?.principal_name || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>Principal Email</label>
            <input type="text" value={account?.principal_email || 'N/A'} disabled readOnly className="readonly-input" />
          </div>

          <div className="field-group">
            <label>Principal Phone</label>
            <input type="text" value={account?.principal_phone || 'N/A'} disabled readOnly className="readonly-input" />
          </div>
        </div>
      </section>

      {/* Password Change Form */}
      <section className="account-card">
        <div className="card-header-block">
          <div className="header-icon-box">
            <Lock />
          </div>
          <div className="header-text">
            <h3>Change Password</h3>
            <p>Ensure your account is using a long, random password to stay secure.</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-grid">
            <div className="field-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="current-password">Current Password</label>
              <div className="password-input-wrapper">
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="new-password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>
          </div>

          {newPassword && (
            <div className="password-strength-container" style={{ marginBottom: '16px' }}>
              <div className="strength-bars">
                <div className={`strength-bar ${strengthScore >= 1 ? strengthData.class : ''}`}></div>
                <div className={`strength-bar ${strengthScore >= 3 ? strengthData.class : ''}`}></div>
                <div className={`strength-bar ${strengthScore >= 5 ? strengthData.class : ''}`}></div>
              </div>
              <span className={`strength-label text-${strengthData.class}`}>
                {strengthData.label}
              </span>
            </div>
          )}

          <ul className="password-requirements" style={{ marginBottom: '24px' }}>
            <li className={newPassword.length >= 8 ? 'met' : ''}>At least 8 characters</li>
            <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>One uppercase letter</li>
            <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>One lowercase letter</li>
            <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>One number</li>
            <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'met' : ''}>One special character</li>
          </ul>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelPassword}
              disabled={passwordSaving || (!currentPassword && !newPassword && !confirmPassword)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={passwordSaving || strengthScore < 5 || newPassword !== confirmPassword}
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

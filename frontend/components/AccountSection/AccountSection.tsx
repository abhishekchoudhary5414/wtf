'use client';

import React, { useState, useEffect } from 'react';
import { authApi, getToken, AdminAccount } from '@/lib/api';
import { Visibility, VisibilityOff, Lock, CheckCircle, ErrorOutline } from '@mui/icons-material';
import AvatarEditor from '../AvatarEditor/AvatarEditor';
import { defaultMaleConfig, AvatarConfigType } from '../AvatarEditor/avatarConfig';
import './AccountSection.css';

export default function AccountSection() {
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Avatar State
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfigType>(defaultMaleConfig);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);



  const showToast = (type: string, message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 4000); // Hide after 4 seconds
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await authApi.getAdminAccount(token);
      setAccount(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setMobileNumber(data.mobile_number || '');
      
      if (data.profile_url) {
        try {
          const config = JSON.parse(data.profile_url);
          setAvatarConfig(config);
        } catch (e) {
          console.error('Failed to parse avatar config', e);
        }
      }
    } catch (error) {
      console.error('Failed to load account data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      
      const payload = {
        first_name: firstName,
        last_name: lastName,
        mobile_number: mobileNumber,
      };
      
      const updatedAccount = await authApi.updateAdminAccountProfile(token, payload);
      setAccount(updatedAccount);
      showToast('success', 'Profile updated successfully!');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarSave = async (config: AvatarConfigType) => {
    setAvatarSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      
      const payload = {
        profile_url: JSON.stringify(config),
      };
      
      const updatedAccount = await authApi.updateAdminAccountProfile(token, payload);
      setAccount(updatedAccount);
      setAvatarConfig(config);
      showToast('success', 'Avatar updated successfully!');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update avatar');
    } finally {
      setAvatarSaving(false);
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
    return score; // Max 5
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: '', class: '' };
    if (score <= 2) return { label: 'Weak', class: 'weak' };
    if (score <= 4) return { label: 'Good', class: 'good' };
    return { label: 'Strong', class: 'strong' };
  };

  const strengthScore = calculatePasswordStrength(newPassword);
  const strengthData = getStrengthLabel(strengthScore);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (strengthScore < 5) {
      showToast('error', 'Password does not meet all requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirm password do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No token');
      
      await authApi.updateAdminPassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      
      showToast('success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCancelPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (loading) return <div className="account-loading">Loading account details...</div>;

  return (
    <div className="account-section-container">
      {/* Toast Notification Popup */}
      <div className={`toast-popup ${toast.show ? 'show' : ''} ${toast.type}`}>
        <div className="toast-content">
          <span className="toast-icon">
            {toast.type === 'success' ? <CheckCircle fontSize="small" /> : <ErrorOutline fontSize="small" />}
          </span>
          <p>{toast.message}</p>
        </div>
        <button onClick={() => setToast({ ...toast, show: false })} className="toast-close">×</button>
      </div>

      <div className="account-settings-layout">
        
        {/* Profile Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Personal Information</h2>
            <p>Update your admin profile details.</p>
          </div>
          
          <div className="settings-card-body">
            
            <form onSubmit={handleProfileSubmit} className="settings-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emailId">Email Address (Read-only)</label>
                  <div className="input-with-icon">
                    <span className="lock-icon"><Lock fontSize="small" style={{ color: '#9ca3af' }} /></span>
                    <input
                      id="emailId"
                      type="email"
                      value={account?.email_id || ''}
                      disabled
                      className="disabled-input blocked-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="mobileNumber">Mobile Number</label>
                  <input
                    id="mobileNumber"
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Password Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Change Password</h2>
            <p>Ensure your account is using a long, random password to stay secure.</p>
          </div>
          
          <div className="settings-card-body">

            <form onSubmit={handlePasswordSubmit} className="settings-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </button>
                </div>
              </div>
                
                {newPassword && (
                  <div className="password-strength-container">
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
                
                <ul className="password-requirements">
                  <li className={newPassword.length >= 8 ? 'met' : ''}>At least 8 characters</li>
                  <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>One uppercase letter</li>
                  <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>One lowercase letter</li>
                  <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>One number</li>
                  <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'met' : ''}>One special character</li>
                </ul>

              <div className="form-actions form-actions-grouped">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleCancelPassword}
                  disabled={passwordSaving || (!currentPassword && !newPassword)}
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
          </div>
        </section>
        
      </div>
    </div>
  );
}

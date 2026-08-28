'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Close, Logout, Person, Lock, School } from '@mui/icons-material';
import './dashboard.css';

type TherapistProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  gender?: string;
  date_of_birth?: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  country?: string;

  professional_title?: string;
  therapist_type?: string;
  years_of_experience?: number;
  primary_specialization?: string;
  additional_specializations?: string;
  languages_spoken?: string;
  bio?: string;

  is_associated_with_school?: boolean;
  school_name?: string;
  school_email?: string;
  school_phone?: string;

  license_type?: string;
  license_number?: string;
  licensing_state?: string;
  license_expiration_date?: string;

  has_npi?: boolean;
  npi_number?: string;
  provider_taxonomy?: string;

  highest_qualification?: string;
  university_name?: string;
  graduation_year?: string;

  approval_status: string;
  is_live: boolean;
};

type ActiveTab = 'overview' | 'profile' | 'password';

export default function TherapistDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }

    const token =
      localStorage.getItem('therapist_token') ||
      sessionStorage.getItem('therapist_token') ||
      document.cookie.split('; ').find(r => r.startsWith('therapist_token='))?.split('=')[1];

    if (!token) {
      router.replace('/therapist/login');
      return;
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    fetch(`${API_BASE_URL}/therapists/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error('Failed to load therapist profile:', err);
        router.replace('/therapist/login?error=unauthorized');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = () => {
    try {
      localStorage.removeItem('therapist_token');
      sessionStorage.removeItem('therapist_token');
      document.cookie = 'therapist_token=; Path=/; Max-Age=0;';
    } catch (e) {
      // ignore
    }
    window.location.href = '/therapist/login';
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg('New password must be at least 6 characters long.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const token =
        localStorage.getItem('therapist_token') ||
        sessionStorage.getItem('therapist_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE_URL}/therapists/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Password change failed.');
      }

      setPasswordMsg('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg(err?.message || 'Password update failed.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading Therapist Portal...</p>
      </div>
    );
  }

  const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Therapist';
  const initial = profile ? profile.first_name.charAt(0).toUpperCase() : 'T';

  return (
    <main className="dashboard-shell">
      <div className="dashboard-layout">
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-brand-row">
            <div className="sidebar-brand">
              <span className="sidebar-brand-mark">{initial}</span>
              <span>{name}</span>
            </div>
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
              <Close />
            </button>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Person fontSize="small" /> Overview
            </button>

            <button
              className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <School fontSize="small" /> Professional Credentials
            </button>

            <button
              className={`sidebar-link ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <Lock fontSize="small" /> Account Security
            </button>

            <button className="sidebar-logout-btn" onClick={handleSignOut}>
              <Logout fontSize="small" />
              <span>Sign out</span>
            </button>
          </nav>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button aria-label="Toggle sidebar" className="sidebar-toggle" onClick={() => setSidebarOpen((s) => !s)}>
                <Menu />
              </button>
              <div>
                <p className="eyebrow">Therapist Portal Workspace</p>
                <h1>{activeTab === 'overview' ? 'Welcome Back' : activeTab === 'profile' ? 'Credentials & Licensing' : 'Account Security'}</h1>
              </div>
            </div>
            <button type="button" className="logout-button" onClick={handleSignOut}>
              <Logout fontSize="small" />
              <span>Sign out</span>
            </button>
          </header>

          {activeTab === 'overview' && (
            <>
              <div className="welcome-card">
                <h2>Welcome, Dr./Practitioner {profile?.first_name}!</h2>
                <p>Manage your professional practice, school affiliations, and client profile securely.</p>
                <div className="status-badge-approved">
                  Status: {profile?.approval_status ? profile.approval_status.toUpperCase() : 'APPROVED'}
                </div>
              </div>

              <div className="content-card">
                <h3>Personal & Contact Profile</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span>Full Name</span>
                    <strong>{name}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Email Address</span>
                    <strong>{profile?.email}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Mobile Phone</span>
                    <strong>{profile?.mobile_number || 'Not provided'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Gender</span>
                    <strong>{profile?.gender || 'Not specified'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Location</span>
                    <strong>
                      {[profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || 'Not specified'}
                    </strong>
                  </div>
                </div>
              </div>

              {profile?.is_associated_with_school && (
                <div className="content-card">
                  <h3>School / Institutional Affiliation</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span>School Name</span>
                      <strong>{profile.school_name || 'N/A'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>School Contact Email</span>
                      <strong>{profile.school_email || 'N/A'}</strong>
                    </div>
                    <div className="detail-item">
                      <span>School Phone</span>
                      <strong>{profile.school_phone || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'profile' && (
            <div className="content-card">
              <h3>Licensing & Clinical Qualifications</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span>Professional Title</span>
                  <strong>{profile?.professional_title || 'N/A'}</strong>
                </div>
                <div className="detail-item">
                  <span>Therapist Practice Type</span>
                  <strong>{profile?.therapist_type || 'N/A'}</strong>
                </div>
                <div className="detail-item">
                  <span>Years of Experience</span>
                  <strong>{profile?.years_of_experience ?? 0} Years</strong>
                </div>
                <div className="detail-item">
                  <span>Languages Spoken</span>
                  <strong>{profile?.languages_spoken || 'English'}</strong>
                </div>
                <div className="detail-item">
                  <span>License Type & State</span>
                  <strong>
                    {profile?.license_type || 'N/A'} ({profile?.licensing_state || 'State'})
                  </strong>
                </div>
                <div className="detail-item">
                  <span>License Number</span>
                  <strong>{profile?.license_number || 'N/A'}</strong>
                </div>
                <div className="detail-item">
                  <span>NPI Number</span>
                  <strong>{profile?.npi_number || 'Not registered'}</strong>
                </div>
                <div className="detail-item">
                  <span>Highest Qualification</span>
                  <strong>{profile?.highest_qualification || 'Master\'s Degree'}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="content-card" style={{ maxWidth: 520 }}>
              <h3>Change Account Password</h3>
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>
                <div className="form-group-custom">
                  <label>Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="form-group-custom">
                  <label>New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="form-group-custom">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="btn-update-pwd"
                >
                  {passwordSubmitting ? 'Updating Password...' : 'Update Password'}
                </button>

                {passwordMsg && (
                  <p style={{ textAlign: 'center', fontWeight: 600, color: passwordMsg.includes('success') ? '#198754' : '#d93025' }}>
                    {passwordMsg}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

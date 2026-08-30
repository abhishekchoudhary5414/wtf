'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, getToken, type AdminAccount } from '@/lib/api';
import { Menu, Close, Logout } from '@mui/icons-material';
import SchoolsSection from '@/components/SchoolsSection/SchoolsSection';
import AccountSection from '@/components/AccountSection/AccountSection';
import AdminAvatarSection from '@/components/AdminAvatarSection/AdminAvatarSection';
import AdminTherapistsSection from '@/components/TherapistsSection/AdminTherapistsSection';
import AvatarViewer from '@/components/AvatarViewer/AvatarViewer';
import { AvatarConfigType } from '@/components/AvatarEditor/avatarConfig';
import './dashboard.css';

type NavigationSection = 'overview' | 'account' | 'avatar' | 'schools' | 'users' | 'therapists' | 'config';



export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');

  const handleNavClick = (section: NavigationSection) => {
    setActiveSection(section);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('wtf_token', tokenFromUrl);
      void router.replace('/admin/dashboard');
    }

    const token = getToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    const fetchData = async () => {
      try {
        const data = await authApi.getAdminData(token);
        setAdminAccounts([data]);

      } catch (error) {
        console.error(error);
        router.replace('/admin/login?error=unauthorized');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [router]);

  const handleSignOut = () => {
    try {
      localStorage.removeItem('wtf_token');
      sessionStorage.removeItem('wtf_token');
      document.cookie = 'wtf_token=; Path=/; Max-Age=0;';
    } catch (e) {
      // ignore
    }

    // Attempt server signout in background if it exists, but don't wait for it
    fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    
    // Hard redirect to clear all React state
    window.location.href = '/admin/login';
  };

  const adminAccount = adminAccounts[0];
  const adminFirstName = adminAccount?.first_name || 'Admin';
  const initialLetter = adminFirstName.charAt(0).toUpperCase();

  const handleAvatarUpdated = (config: AvatarConfigType) => {
    setAdminAccounts((currentAccounts) => {
      if (!currentAccounts.length) {
        return currentAccounts;
      }

      return [{
        ...currentAccounts[0],
        profile_url: JSON.stringify(config),
      }];
    });
  };

  let avatarConfig: AvatarConfigType | null = null;
  if (adminAccount?.profile_url) {
    try {
      avatarConfig = JSON.parse(adminAccount.profile_url);
    } catch (e) {
      // ignore
    }
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-layout">
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-brand-row">
            <div className="sidebar-brand">
              {avatarConfig ? (
                <div style={{ flexShrink: 0 }}>
                  <AvatarViewer config={avatarConfig} size={38} />
                </div>
              ) : (
                <span className="sidebar-brand-mark">{initialLetter}</span>
              )}
              <span>{adminFirstName}</span>
            </div>
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <Close />
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            <button
              className={`sidebar-link ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => handleNavClick('overview')}
            >
              Overview
            </button>

            <button
              className={`sidebar-link ${activeSection === 'schools' ? 'active' : ''}`}
              onClick={() => handleNavClick('schools')}
            >
              Schools
            </button>
            <button
              className={`sidebar-link ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => handleNavClick('users')}
            >
              Users
            </button>
            <button
              className={`sidebar-link ${activeSection === 'therapists' ? 'active' : ''}`}
              onClick={() => handleNavClick('therapists')}
            >
              Therapists
            </button>
            <button
              className={`sidebar-link ${activeSection === 'config' ? 'active' : ''}`}
              onClick={() => handleNavClick('config')}
            >
              Config
            </button>
            <div className="sidebar-divider" style={{ margin: '1rem 0', borderTop: '1px solid #e5e7eb' }}></div>
            <button
              className={`sidebar-link ${activeSection === 'avatar' ? 'active' : ''}`}
              onClick={() => handleNavClick('avatar')}
            >
              Avatar
            </button>
            <button
              className={`sidebar-link ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => handleNavClick('account')}
            >
              Account Settings
            </button>
            <button
              className="sidebar-logout-btn"
              onClick={handleSignOut}
            >
              <Logout fontSize="small" />
              <span>Sign out</span>
            </button>
          </nav>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                aria-label="Toggle sidebar"
                className="sidebar-toggle"
                onClick={() => setSidebarOpen((s) => !s)}
              >
                <Menu />
              </button>
              <div>
                <p className="eyebrow">Protected dashboard</p>
                <h1>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
              </div>
            </div>
            <button type="button" className="logout-button" onClick={handleSignOut}>
              <Logout fontSize="small" /> 
              <span>Sign out</span>
            </button>
          </header>

          {activeSection === 'overview' && (
            <>
              <section className="dashboard-summary">
                <article className="summary-card">
                  <span>Total admins</span>
                  <strong>{adminAccounts.length || 0}</strong>
                </article>
                <article className="summary-card">
                  <span>Active sessions</span>
                  <strong>42</strong>
                </article>
                <article className="summary-card">
                  <span>Pending tasks</span>
                  <strong>11</strong>
                </article>
              </section>

              <section className="dashboard-content">
                <h2>Admin accounts</h2>
                {loading ? (
                  <p>Loading admin data...</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAccounts.map((account) => (
                          <tr key={account.id}>
                            <td>{`${account.first_name} ${account.last_name}`.trim() || 'Admin'}</td>
                            <td>{account.email_id}</td>
                            <td><span className="badge">{account.role_name || 'admin'}</span></td>
                            <td>{account.is_active ? 'Active' : 'Inactive'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}


          {activeSection === 'schools' && (
            <SchoolsSection />
          )}

          {activeSection === 'users' && (
            <section className="dashboard-content">
              <div className="empty-content-message">
                <h3>Users</h3>
                <p>Users management section coming soon...</p>
              </div>
            </section>
          )}

          {activeSection === 'therapists' && (
            <AdminTherapistsSection />
          )}

          {activeSection === 'config' && (
            <section className="dashboard-content">
              <div className="empty-content-message">
                <h3>Config</h3>
                <p>Config management section coming soon...</p>
              </div>
            </section>
          )}

          {activeSection === 'avatar' && (
            <AdminAvatarSection onAvatarUpdated={handleAvatarUpdated} />
          )}

          {activeSection === 'account' && (
            <AccountSection />
          )}
        </div>
      </div>
    </main>
  );
}

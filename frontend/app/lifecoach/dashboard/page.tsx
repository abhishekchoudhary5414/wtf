'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Close, Logout, Home, School, ManageAccounts, Groups } from '@mui/icons-material';
import LifeCoachAccountSection from '@/components/LifeCoachAccountSection/LifeCoachAccountSection';
import './dashboard.css';

type LifeCoachData = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  school_id: number;
  school_name?: string;
  school_email?: string;
  is_live: boolean;
};

export default function LifeCoachDashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'home' | 'students' | 'account'>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [coachData, setCoachData] = useState<LifeCoachData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoachProfile = async () => {
      const hasCookie = document.cookie.split('; ').some((row) => row.startsWith('lifecoach_token='));
      const token = localStorage.getItem('lifecoach_token') || sessionStorage.getItem('lifecoach_token');
      if (!token && !hasCookie) {
        router.replace('/lifecoach/login?error=unauthorized');
        return;
      }

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_BASE_URL}/life-coaches/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCoachData(data);
        } else {
          localStorage.removeItem('lifecoach_token');
          sessionStorage.removeItem('lifecoach_token');
          document.cookie = 'lifecoach_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          router.replace('/lifecoach/login?error=unauthorized');
        }
      } catch (error) {
        console.error('Failed to verify life coach auth:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachProfile();
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('lifecoach_token');
    sessionStorage.removeItem('lifecoach_token');
    document.cookie = 'lifecoach_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    router.replace('/lifecoach/login');
  };

  const handleNavClick = (section: 'home' | 'students' | 'account') => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading Life Coach workspace...</p>
      </div>
    );
  }

  return (
    <main className="dashboard-root">
      <div style={{ display: 'flex', width: '100%' }}>
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand-row">
            <div className="sidebar-brand">
              <div className="brand-icon">C</div>
              <div className="brand-text">
                <h2>Life Coach</h2>
                <p>{coachData?.school_name || 'School Workspace'}</p>
              </div>
            </div>
            <button
              aria-label="Close sidebar"
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              <Close />
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            <button
              className={`sidebar-link ${activeSection === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              <Home fontSize="small" />
              <span>Overview</span>
            </button>

            <button
              className={`sidebar-link ${activeSection === 'students' ? 'active' : ''}`}
              onClick={() => handleNavClick('students')}
            >
              <Groups fontSize="small" />
              <span>Assigned Students</span>
            </button>

            <div className="sidebar-divider" style={{ margin: '1rem 0', borderTop: '1px solid #e5e7eb' }}></div>

            <button
              className={`sidebar-link ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => handleNavClick('account')}
            >
              <ManageAccounts fontSize="small" />
              <span>Account Settings</span>
            </button>

            <button
              className="sidebar-logout-btn"
              onClick={handleSignOut}
              style={{ marginTop: '1.5rem' }}
            >
              <Logout fontSize="small" />
              <span>Sign Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
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
                <p className="eyebrow">Life Coach Portal</p>
                <h1>
                  {activeSection === 'home' && 'Workspace Overview'}
                  {activeSection === 'students' && 'Assigned Students'}
                  {activeSection === 'account' && 'Account Settings'}
                </h1>
              </div>
            </div>
            <button type="button" className="logout-button" onClick={handleSignOut}>
              <Logout fontSize="small" />
              <span>Sign out</span>
            </button>
          </header>

          <div className="dashboard-page-container">
            {activeSection === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <section className="section-card">
                  <h2>Welcome back, {coachData?.name}!</h2>
                  <p style={{ color: '#64748b', marginTop: 4 }}>
                    You are connected to <strong>{coachData?.school_name}</strong>. Manage your student sessions and wellness coaching progress.
                  </p>
                </section>
              </div>
            )}

            {activeSection === 'students' && (
              <section className="section-card">
                <h2>Assigned Students</h2>
                <p style={{ color: '#6b7280' }}>Students assigned for life coaching sessions will be displayed here.</p>
              </section>
            )}

            {activeSection === 'account' && (
              <LifeCoachAccountSection />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

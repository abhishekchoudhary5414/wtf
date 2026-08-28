'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Close, Logout, Home, School, MedicalServices, Psychology, ManageAccounts } from '@mui/icons-material';
import SchoolAccountSection from '@/components/SchoolAccountSection/SchoolAccountSection';
import LifeCoachSection from '@/components/LifeCoachSection/LifeCoachSection';
import SchoolTherapistsSection from '@/components/TherapistsSection/SchoolTherapistsSection';
import './dashboard.css';

type SchoolData = {
  id: number;
  name: string;
  email: string;
  type?: string;
  phone?: string;
  established?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  is_live: boolean;
  is_active: boolean;
  is_locked: boolean;
};

type NavigationSection = 'home' | 'student' | 'life_coach' | 'therapist' | 'account';

export default function SchoolDashboardPage() {
  const router = useRouter();
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<NavigationSection>('home');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }

    const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
    
    if (!token) {
      router.replace('/schools/login');
      return;
    }

    const fetchSchoolData = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_BASE_URL}/schools/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSchoolData(data);
        } else {
          localStorage.removeItem('school_token');
          sessionStorage.removeItem('school_token');
          document.cookie = 'school_token=; Path=/; Max-Age=0;';
          router.replace('/schools/login');
        }
      } catch (error) {
        console.error('Failed to fetch school data:', error);
        localStorage.removeItem('school_token');
        sessionStorage.removeItem('school_token');
        document.cookie = 'school_token=; Path=/; Max-Age=0;';
        router.replace('/schools/login');
      } finally {
        setLoading(false);
      }
    };

    void fetchSchoolData();
  }, [router]);

  const handleNavClick = (section: NavigationSection) => {
    setActiveSection(section);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('school_token');
      sessionStorage.removeItem('school_token');
      document.cookie = 'school_token=; Path=/; Max-Age=0;';
      
      await fetch('/api/auth/signout', { 
        method: 'POST', 
        credentials: 'same-origin' 
      }).catch(() => {});
      
      window.location.href = '/schools/login';
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/schools/login';
    }
  };

  if (loading) {
    return (
      <main className="dashboard-shell">
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading school portal...</div>
      </main>
    );
  }

  const schoolName = schoolData?.name || 'School';
  const initialLetter = schoolName.charAt(0).toUpperCase();

  return (
    <main className="dashboard-shell">
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-brand-row">
            <div className="sidebar-brand">
              <span className="sidebar-brand-mark">{initialLetter}</span>
              <span>{schoolName}</span>
            </div>
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <Close />
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="School navigation">
            <button
              className={`sidebar-link ${activeSection === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              <Home fontSize="small" />
              <span>Home</span>
            </button>

            <button
              className={`sidebar-link ${activeSection === 'student' ? 'active' : ''}`}
              onClick={() => handleNavClick('student')}
            >
              <School fontSize="small" />
              <span>Students</span>
            </button>

            <button
              className={`sidebar-link ${activeSection === 'life_coach' ? 'active' : ''}`}
              onClick={() => handleNavClick('life_coach')}
            >
              <Psychology fontSize="small" />
              <span>Life Coach</span>
            </button>

            <button
              className={`sidebar-link ${activeSection === 'therapist' ? 'active' : ''}`}
              onClick={() => handleNavClick('therapist')}
            >
              <MedicalServices fontSize="small" />
              <span>Therapists</span>
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
                <p className="eyebrow">School Portal</p>
                <h1>
                  {activeSection === 'home' && 'Overview'}
                  {activeSection === 'student' && 'Students Management'}
                  {activeSection === 'life_coach' && 'Life Coaches'}
                  {activeSection === 'therapist' && 'Therapists'}
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
              <>
                <section className="summary-cards-grid">
                  <article className="stat-card">
                    <span>Total Students</span>
                    <strong>120</strong>
                  </article>
                  <article className="stat-card">
                    <span>Active Life Coaches</span>
                    <strong>8</strong>
                  </article>
                  <article className="stat-card">
                    <span>Assigned Therapists</span>
                    <strong>5</strong>
                  </article>
                  <article className="stat-card">
                    <span>Portal Status</span>
                    <span className="status-tag active">✓ Active</span>
                  </article>
                </section>

                <section className="section-card">
                  <h2>School Overview</h2>
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>School Name</th>
                          <th>Email</th>
                          <th>Type</th>
                          <th>Principal</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{schoolData?.name}</td>
                          <td>{schoolData?.email}</td>
                          <td>{schoolData?.type || 'Standard'}</td>
                          <td>{schoolData?.principal_name || 'N/A'}</td>
                          <td>
                            <span className={`status-tag ${schoolData?.is_active ? 'active' : 'inactive'}`}>
                              {schoolData?.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeSection === 'student' && (
              <section className="section-card">
                <h2>Students Section</h2>
                <p style={{ color: '#6b7280' }}>Student profiles, enrollments, and academic health records will appear here.</p>
              </section>
            )}

            {activeSection === 'life_coach' && (
              <LifeCoachSection />
            )}

            {activeSection === 'therapist' && (
              <SchoolTherapistsSection />
            )}

            {activeSection === 'account' && (
              <SchoolAccountSection />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

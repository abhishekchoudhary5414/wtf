import './Hero.css';

const highlights = [
  'Clarify the blocker',
  'Build the next action',
  'Reframe the challenge',
];

export default function Hero() {
  return (
    <main className="home-page container">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="hero-label">Work Through Frustration</p>
          <h1 className="hero-title">Turn friction into <span className="highlight-text">focus.</span></h1>
          <p className="hero-description">
            WTF helps teams move through tough moments with clarity, structure, and momentum.
            Build better habits, solve hard problems, and keep moving forward.
          </p>
          <div className="hero-actions">
            <a href="/admin/login" className="hero-button primary-btn">
              Admin Login
              <span className="btn-icon">→</span>
            </a>
            <a href="#" className="hero-button secondary-btn">
              Explore Features
            </a>
          </div>
        </div>

        <div className="hero-card-container">
          <div className="hero-card" aria-label="WTF highlights panel">
            <div className="hero-card-glow"></div>
            <div className="metric-box">
              <div>
                <div className="metric-label">Momentum score</div>
                <div className="metric-value">
                  <strong>92%</strong>
                  <span className="trend-up">↑ +5%</span>
                </div>
              </div>
              <div className="metric-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2400/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
                </svg>
              </div>
            </div>

            <div className="highlight-list">
              {highlights.map((item, index) => (
                <div key={item} className="highlight-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <span className="dot" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2400/svg">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Decorative floating elements */}
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
        </div>
      </section>
    </main>
  );
}

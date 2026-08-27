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
          <h1>Turn friction into focus.</h1>
          <p className="hero-description">
            WTF helps teams move through tough moments with clarity, structure, and momentum.
            Build better habits, solve hard problems, and keep moving forward.
          </p>
          <a href="/admin/login" className="hero-button">
            Admin Login
          </a>
        </div>

        <div className="hero-card" aria-label="WTF highlights panel">
          <div className="metric-box">
            <div>
              <div className="metric-label">Momentum score</div>
              <strong>92%</strong>
            </div>
            <div className="metric-badge">+8</div>
          </div>

          <div className="highlight-list">
            {highlights.map((item, index) => (
              <div key={item} className={`highlight-item ${index % 2 === 0 ? 'soft' : ''}`}>
                <span className="dot" aria-hidden="true"></span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

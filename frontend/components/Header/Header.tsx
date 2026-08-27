import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand" aria-label="WTF home">
          <span className="brand-mark">W</span>
          <span className="brand-name">WTF</span>
        </div>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#mission">Mission</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}

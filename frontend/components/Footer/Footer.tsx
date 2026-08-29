import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer-section">
      <div className="container footer-content">
        <div className="footer-brand">
          <h2 className="footer-logo">WTF.</h2>
          <p className="footer-tagline">Work Through Frustration.</p>
        </div>
        <div className="footer-links">
          <div className="footer-column">
            <h3>Platform</h3>
            <a href="#">Features</a>
            <a href="#">Solutions</a>
            <a href="#">Pricing</a>
          </div>
          <div className="footer-column">
            <h3>Resources</h3>
            <a href="#">Blog</a>
            <a href="#">Guides</a>
            <a href="#">Support</a>
          </div>
          <div className="footer-column">
            <h3>Company</h3>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>&copy; {new Date().getFullYear()} WTF Platform. All rights reserved.</p>
        <div className="footer-social">
          <a href="#" aria-label="Twitter">Twitter</a>
          <a href="#" aria-label="LinkedIn">LinkedIn</a>
          <a href="#" aria-label="GitHub">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

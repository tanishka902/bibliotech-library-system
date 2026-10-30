import { Brand } from './Shell';
import { COVER_PALETTE } from '../lib/format';

// A shelf of book spines - the same colours the catalogue covers use.
const SPINES = [
  [62, 0, 22], [84, 3, 18], [70, 1, 26], [92, 5, 20], [58, 2, 16], [80, 4, 24], [66, 6, 18],
  [88, 0, 22], [74, 7, 20], [96, 1, 18], [60, 3, 26], [82, 5, 20], [68, 2, 22], [90, 6, 16],
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth-hero" aria-hidden="true">
        <Brand />
        <div className="auth-hero-copy">
          <h1>Every book, every due date, in one place.</h1>
          <p>Browse the catalogue, borrow in a click and keep fines under control.</p>
        </div>
        <div className="shelf">
          {SPINES.map(([h, c, w], i) => (
            <span key={i} style={{ height: `${h}%`, width: `${w}px`, background: `linear-gradient(90deg, ${COVER_PALETTE[c][0]}, ${COVER_PALETTE[c][1]})` }} />
          ))}
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand-mobile"><Brand /></div>
          <h2>{title}</h2>
          <p className="auth-sub">{subtitle}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </div>
  );
}

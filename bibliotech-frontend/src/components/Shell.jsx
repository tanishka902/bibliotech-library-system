import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Icon from './Icon';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/books', label: 'Catalogue', icon: 'book' },
  { to: '/rentals', label: 'My rentals', icon: 'repeat' },
  { to: '/fines', label: 'Fines', icon: 'card' },
  { to: '/diagnostics', label: 'API check', icon: 'pulse' },
];

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand-name">Bibliotech</span>
    </div>
  );
}

export default function Shell() {
  const { user, signout } = useAuth();
  const [open, setOpen] = useState(false);

  // Signed-out visitors can still open the API check page, without the sidebar.
  if (!user) {
    return (
      <div className="plain">
        <header className="plain-head">
          <Link to="/login"><Brand /></Link>
          <Link className="btn btn-ghost btn-sm" to="/login">Sign in</Link>
        </header>
        <main className="main"><Outlet /></main>
      </div>
    );
  }

  const initials = (user.username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="app">
      <button className="menu-btn icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <Brand />
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <span className="avatar">{initials}</span>
          <div className="side-user-text">
            <strong>{user.username}</strong>
            <span>{user.roles.length ? user.roles.join(', ').toLowerCase() : 'member'}</span>
          </div>
          <button className="icon-btn" onClick={() => signout()} aria-label="Sign out" title="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}

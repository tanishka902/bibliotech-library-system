import { useState } from 'react';
import { API_BASE_URL, DEFAULT_ROUTES, clearRouteOverrides, getRoute, setRouteOverride } from '../config';
import { getToken } from '../auth/session';
import { Badge } from '../components/Badge';
import { Spinner } from '../components/Spinner';
import Icon from '../components/Icon';

// Each service is probed with a harmless request. Any answer other than "not found" /
// "gateway cannot reach service" / "no connection" proves the route exists.
const SERVICES = [
  { key: 'auth', label: 'Auth Service', method: 'POST', suffix: '/signin', body: {}, confirmed: true, alt: [] },
  { key: 'books', label: 'Book Service', method: 'GET', suffix: '', alt: ['/book-service/books', '/books'] },
  { key: 'rentals', label: 'Rental Service', method: 'GET', suffix: '', alt: ['/rental-service/rentals', '/rentals'] },
  { key: 'fines', label: 'Fine Service', method: 'GET', suffix: '', alt: ['/fine-service/fines', '/fines'] },
];

function classify(status) {
  if (status === 0) return { tone: 'bad', text: 'No connection (gateway down, or blocked by CORS)', ok: false };
  if (status === 404) return { tone: 'bad', text: 'Not found: no gateway route for this path', ok: false };
  if (status === 502 || status === 503 || status === 504) return { tone: 'warn', text: `Route exists, but the service is not reachable (${status})`, ok: true };
  if (status >= 200 && status < 300) return { tone: 'good', text: `Working (${status})`, ok: true };
  if (status === 401 || status === 403) return { tone: 'good', text: `Route reachable, login required (${status})`, ok: true };
  if (status >= 500) return { tone: 'warn', text: `Route reachable, but the service errored (${status})`, ok: true };
  return { tone: 'good', text: `Route reachable (${status})`, ok: true };
}

async function probe(path, method, body) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const started = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, ms: Math.round(performance.now() - started) };
  } catch {
    return { status: 0, ms: Math.round(performance.now() - started) };
  }
}

export default function Diagnostics() {
  const [results, setResults] = useState({}); // key -> [{ path, status, ms }]
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState({});
  const [, force] = useState(0);

  const candidatesFor = (s) => {
    const base = getRoute(s.key);
    const set = new Set([base, ...s.alt]);
    if (custom[s.key]?.trim()) set.add(custom[s.key].trim().startsWith('/') ? custom[s.key].trim() : `/${custom[s.key].trim()}`);
    return [...set];
  };

  const runOne = async (s) => {
    const rows = await Promise.all(
      candidatesFor(s).map(async (path) => ({ path, ...(await probe(path + s.suffix, s.method, s.body)) }))
    );
    setResults((r) => ({ ...r, [s.key]: rows }));
  };

  const runAll = async () => {
    setRunning(true);
    await Promise.all(SERVICES.map(runOne));
    setRunning(false);
  };

  const use = (s, path) => {
    setRouteOverride(s.key, path);
    force((n) => n + 1);
  };

  const reset = () => {
    clearRouteOverrides();
    setResults({});
    force((n) => n + 1);
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>API check</h1>
          <p>Tests which gateway routes respond, using {API_BASE_URL === '/gateway' ? 'the dev proxy → http://localhost:8080' : API_BASE_URL}.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={reset}>Reset overrides</button>
          <button className="btn btn-primary" onClick={runAll} disabled={running}>
            {running ? <Spinner small /> : <Icon name="pulse" size={16} />} Run checks
          </button>
        </div>
      </header>

      <div className="banner banner-info">
        <Icon name="alert" />
        <div className="banner-text">
          Only the auth route was confirmed. The book, rental and fine paths below follow the same <code>/&lt;service-id&gt;/…</code> pattern but are unverified.
          Where a candidate responds, choose <b>Use this path</b> and the app switches to it. To make the choice permanent, put it in <code>.env</code>.
        </div>
      </div>

      {SERVICES.map((s) => {
        const current = getRoute(s.key);
        const rows = results[s.key];
        return (
          <section className="panel diag" key={s.key}>
            <div className="panel-head">
              <h2>{s.label}</h2>
              <span className="muted small">{s.confirmed ? 'route confirmed by you' : 'route unverified'} · using <code>{current}</code>{current !== DEFAULT_ROUTES[s.key] ? ' (override)' : ''}</span>
            </div>
            {!rows ? (
              <p className="muted">Not tested yet.</p>
            ) : (
              <ul className="list">
                {rows.map((row) => {
                  const c = classify(row.status);
                  return (
                    <li key={row.path}>
                      <div>
                        <code>{row.path}{s.suffix}</code>
                        <span className="muted small block">{s.method} · {row.ms} ms</span>
                      </div>
                      <div className="diag-result">
                        <Badge tone={c.tone}>{c.text}</Badge>
                        {c.ok && row.path !== current && <button className="btn btn-outline btn-sm" onClick={() => use(s, row.path)}>Use this path</button>}
                        {row.path === current && c.ok && <Badge tone="info">in use</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!s.confirmed && (
              <div className="diag-custom">
                <input placeholder="Try another path, e.g. /api/books" value={custom[s.key] || ''} onChange={(e) => setCustom((c) => ({ ...c, [s.key]: e.target.value }))} aria-label={`Custom path for ${s.label}`} />
                <button className="btn btn-ghost btn-sm" onClick={() => runOne(s)}>Test</button>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

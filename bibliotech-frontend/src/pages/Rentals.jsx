import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import { booksApi, rentalsApi } from '../api/services';
import { formatDate, parseDate, rentalState } from '../lib/dates';
import { scopeRentals } from '../lib/scope';
import { Badge } from '../components/Badge';
import ErrorBanner, { InfoBanner } from '../components/ErrorBanner';
import { PageLoader, Spinner } from '../components/Spinner';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';

const TABS = [
  { key: 'active', label: 'On loan' },
  { key: 'returned', label: 'Returned' },
  { key: 'all', label: 'All' },
];

export default function Rentals() {
  const { user } = useAuth();
  const toast = useToast();
  const rentals = useResource(() => rentalsApi.list());
  const books = useResource(() => booksApi.list());
  const [tab, setTab] = useState('active');
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const titleOf = useMemo(() => new Map((books.data || []).map((b) => [String(b.id), b.title])), [books.data]);
  const all = rentals.data || [];
  const scope = useMemo(() => scopeRentals(all, user), [all, user]);
  const base = showAll ? all : scope.items;
  const hiddenCount = all.length - scope.items.length;

  const rows = useMemo(() => {
    const withState = base.map((r) => ({ ...r, state: rentalState(r) }));
    const filtered = withState.filter((r) => (tab === 'all' ? true : tab === 'returned' ? r.returned : !r.returned));
    const time = (v) => parseDate(v)?.getTime() ?? 0;
    return filtered.sort((a, b) => (tab === 'active' ? time(a.dueDate) - time(b.dueDate) : time(b.borrowDate) - time(a.borrowDate)));
  }, [base, tab]);

  const counts = useMemo(
    () => ({ active: base.filter((r) => !r.returned).length, returned: base.filter((r) => r.returned).length, all: base.length }),
    [base]
  );

  const giveBack = async (r) => {
    setBusyId(r.id);
    try {
      await rentalsApi.returnBook(r.id);
      toast(r.state.overdue ? 'Returned. It was overdue, so check the Fines page.' : 'Book returned. Thank you!', r.state.overdue ? 'warn' : 'good');
      rentals.reload();
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>My rentals</h1>
          <p>Borrow dates, due dates and return status.</p>
        </div>
        <button className="btn btn-ghost" onClick={rentals.reload}><Icon name="refresh" size={16} /> Refresh</button>
      </header>

      <ErrorBanner error={rentals.error} onRetry={rentals.reload} title="Could not load rentals" />
      {books.error && !rentals.error && <InfoBanner tone="warn">Book titles could not be loaded, so books appear by id.</InfoBanner>}
      {!rentals.error && rentals.data && scope.unknownOwner && all.length > 0 && (
        <InfoBanner>The Rental Service does not say who borrowed each book, so every rental is listed.</InfoBanner>
      )}
      {!rentals.error && !scope.unknownOwner && hiddenCount > 0 && (
        <label className="check">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Also show the other {hiddenCount} {hiddenCount === 1 ? 'rental' : 'rentals'} from all users
        </label>
      )}

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'tab active' : 'tab'} onClick={() => setTab(t.key)}>
            {t.label} <span>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {rentals.loading && !rentals.data ? (
        <PageLoader label="Loading rentals…" />
      ) : !rentals.error && rows.length === 0 ? (
        <div className="empty">
          <Icon name="repeat" size={28} />
          <h3>{tab === 'returned' ? 'Nothing returned yet' : tab === 'active' ? 'No books on loan' : 'No rentals yet'}</h3>
          <p>Borrow a book from the catalogue and it will appear here.</p>
        </div>
      ) : (
        !rentals.error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Book</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Book"><strong>{r.bookTitle || titleOf.get(String(r.bookId)) || `Book #${r.bookId ?? '?'}`}</strong>{showAll && r.userId != null && <span className="muted small block">User {String(r.userId)}</span>}</td>
                    <td data-label="Borrowed">{formatDate(r.borrowDate)}</td>
                    <td data-label="Due">{formatDate(r.dueDate)}</td>
                    <td data-label="Returned">{r.returned ? formatDate(r.returnDate) : '—'}</td>
                    <td data-label="Status"><Badge tone={r.state.tone}>{r.state.label}</Badge></td>
                    <td className="actions-cell">
                      {!r.returned && (
                        <button className="btn btn-outline btn-sm" disabled={busyId === r.id} onClick={() => giveBack(r)}>
                          {busyId === r.id ? <Spinner small /> : <Icon name="undo" size={15} />} Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import { booksApi, finesApi, rentalsApi } from '../api/services';
import { scopeFines, scopeRentals } from '../lib/scope';
import { formatDate, parseDate, rentalState } from '../lib/dates';
import { money } from '../lib/format';
import { DEMAND_LEVELS } from '../config';
import StatCard from '../components/StatCard';
import { Badge } from '../components/Badge';
import Icon from '../components/Icon';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Dashboard() {
  const { user } = useAuth();
  const books = useResource(() => booksApi.list());
  const rentals = useResource(() => rentalsApi.list());
  const fines = useResource(() => finesApi.list());

  const bookList = books.data || [];
  const titleOf = useMemo(() => new Map(bookList.map((b) => [String(b.id), b.title])), [bookList]);

  const mine = useMemo(() => scopeRentals(rentals.data || [], user), [rentals.data, user]);
  const active = useMemo(
    () => mine.items.filter((r) => !r.returned).map((r) => ({ ...r, state: rentalState(r) })),
    [mine]
  );
  const myFines = useMemo(
    () => scopeFines(fines.data || [], mine.items, user, Boolean(rentals.data) && !mine.unknownOwner),
    [fines.data, mine, user, rentals.data]
  );
  const unpaid = myFines.items.filter((f) => !f.paid);
  const unpaidTotal = unpaid.reduce((s, f) => s + f.amount, 0);

  const availableTitles = bookList.filter((b) => b.available > 0).length;
  const copies = bookList.reduce((s, b) => s + b.available, 0);
  const overdue = active.filter((r) => r.state.overdue).length;

  const dueSoon = [...active]
    .sort((a, b) => (parseDate(a.dueDate)?.getTime() ?? Infinity) - (parseDate(b.dueDate)?.getTime() ?? Infinity))
    .slice(0, 5);

  const demandCounts = DEMAND_LEVELS.map((lvl) => ({ lvl, n: bookList.filter((b) => b.demand === lvl).length }));
  const maxDemand = Math.max(1, ...demandCounts.map((d) => d.n));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{greeting()}, {user.username}</h1>
          <p>Here is where the library stands today.</p>
        </div>
        <Link className="btn btn-primary" to="/books"><Icon name="book" size={16} /> Browse catalogue</Link>
      </header>

      <section className="stats">
        <StatCard label="Books in catalogue" value={bookList.length} hint="titles on record" tone="sea" loading={books.loading} error={books.error} />
        <StatCard label="Available to borrow" value={availableTitles} hint={`${copies} copies on the shelves`} tone="moss" loading={books.loading} error={books.error} />
        <StatCard label="Your active rentals" value={active.length} hint={overdue ? `${overdue} overdue` : 'none overdue'} tone="gold" loading={rentals.loading} error={rentals.error} />
        <StatCard
          label="Unpaid fines"
          value={money(unpaidTotal)}
          hint={`${unpaid.length} outstanding`}
          tone="berry"
          loading={fines.loading || rentals.loading}
          error={fines.error}
        />
      </section>

      <section className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h2>Due soon</h2>
            <Link to="/rentals">All rentals</Link>
          </div>
          {rentals.error ? (
            <p className="muted">Rentals could not be loaded ({rentals.error.message})</p>
          ) : dueSoon.length === 0 ? (
            <p className="muted">{rentals.loading ? 'Loading…' : 'Nothing on loan. Pick something from the catalogue.'}</p>
          ) : (
            <ul className="list">
              {dueSoon.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.bookTitle || titleOf.get(String(r.bookId)) || `Book #${r.bookId}`}</strong>
                    <span className="muted">Due {formatDate(r.dueDate)}</span>
                  </div>
                  <Badge tone={r.state.tone}>{r.state.label}</Badge>
                </li>
              ))}
            </ul>
          )}
          {mine.unknownOwner && !rentals.error && rentals.data?.length > 0 && (
            <p className="muted small">Rental records carry no user field, so every rental is shown.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Demand on the shelves</h2></div>
          {books.error ? (
            <p className="muted">Books could not be loaded ({books.error.message})</p>
          ) : (
            <div className="bars">
              {demandCounts.map(({ lvl, n }) => (
                <div className="bar-row" key={lvl}>
                  <span>{lvl.charAt(0) + lvl.slice(1).toLowerCase()}</span>
                  <div className="bar-track"><div className={`bar bar-${lvl.toLowerCase()}`} style={{ width: `${(n / maxDemand) * 100}%` }} /></div>
                  <b>{n}</b>
                </div>
              ))}
              <p className="muted small">Late fees depend on how overdue a book is and on its demand level.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import { booksApi, finesApi, rentalsApi } from '../api/services';
import { contracts } from '../contracts';
import { scopeFines, scopeRentals } from '../lib/scope';
import { formatDate, rentalState } from '../lib/dates';
import { money } from '../lib/format';
import { Badge, DemandBadge } from '../components/Badge';
import ErrorBanner, { InfoBanner } from '../components/ErrorBanner';
import { PageLoader, Spinner } from '../components/Spinner';
import Modal from '../components/Modal';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';

function CalculateModal({ eligible, titleOf, demandOf, onClose, onDone }) {
  const toast = useToast();
  const [sel, setSel] = useState(eligible[0] ? String(eligible[0].id) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const rental = eligible.find((r) => String(r.id) === sel);

  const run = async () => {
    if (!rental) return;
    setBusy(true);
    setError(null);
    try {
      await finesApi.calculate(contracts.calculateFine({ rental, demand: demandOf(rental), daysLate: rental.state.daysLate }));
      toast('Fine calculated and saved.');
      onDone();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Calculate a fine"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={run} disabled={busy || !rental}>{busy ? <Spinner small /> : null} Calculate fine</button>
        </>
      }
    >
      <ErrorBanner error={error} title="Could not calculate the fine" />
      {eligible.length === 0 ? (
        <p>No late rentals are waiting for a fine.</p>
      ) : (
        <>
          <Field id="f-rental" label="Late rental">
            <select id="f-rental" value={sel} onChange={(e) => setSel(e.target.value)}>
              {eligible.map((r) => (
                <option key={r.id} value={r.id}>{r.bookTitle || titleOf.get(String(r.bookId)) || `Book #${r.bookId}`} · {r.state.daysLate}d late</option>
              ))}
            </select>
          </Field>
          {rental && (
            <p className="muted">
              Due {formatDate(rental.dueDate)}, {rental.state.daysLate} {rental.state.daysLate === 1 ? 'day' : 'days'} late
              {demandOf(rental) ? `, ${demandOf(rental).toLowerCase()} demand` : ''}. The Fine Service works out the amount.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

export default function Fines() {
  const { user } = useAuth();
  const toast = useToast();
  const fines = useResource(() => finesApi.list());
  const rentals = useResource(() => rentalsApi.list());
  const books = useResource(() => booksApi.list());
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [calc, setCalc] = useState(false);

  const allFines = fines.data || [];
  const allRentals = rentals.data || [];
  const rentalScope = useMemo(() => scopeRentals(allRentals, user), [allRentals, user]);
  const rentalsKnown = Boolean(rentals.data) && !rentalScope.unknownOwner;
  const fineScope = useMemo(() => scopeFines(allFines, rentalScope.items, user, rentalsKnown), [allFines, rentalScope, user, rentalsKnown]);
  const shown = showAll ? allFines : fineScope.items;
  const hiddenCount = allFines.length - fineScope.items.length;

  const rentalById = useMemo(() => new Map(allRentals.map((r) => [String(r.id), r])), [allRentals]);
  const bookById = useMemo(() => new Map((books.data || []).map((b) => [String(b.id), b])), [books.data]);
  const titleOf = useMemo(() => new Map([...bookById].map(([k, b]) => [k, b.title])), [bookById]);

  const bookIdFor = (f) => f.bookId ?? rentalById.get(String(f.rentalId))?.bookId;
  const titleFor = (f) => {
    const id = bookIdFor(f);
    return (id != null && titleOf.get(String(id))) || (f.rentalId != null ? `Rental #${f.rentalId}` : `Fine #${f.id}`);
  };
  const demandFor = (f) => f.demand || bookById.get(String(bookIdFor(f)))?.demand || null;
  const demandOfRental = (r) => bookById.get(String(r.bookId))?.demand || null;

  const unpaid = shown.filter((f) => !f.paid);
  const paid = shown.filter((f) => f.paid);
  const unpaidTotal = unpaid.reduce((s, f) => s + f.amount, 0);
  const paidTotal = paid.reduce((s, f) => s + f.amount, 0);

  // Late rentals (still out, or returned after the due date) that have no fine yet.
  const eligible = useMemo(() => {
    const fined = new Set(allFines.map((f) => String(f.rentalId)));
    const pool = showAll ? allRentals : rentalScope.items;
    return pool
      .map((r) => ({ ...r, state: rentalState(r) }))
      .filter((r) => r.state.daysLate > 0 && !fined.has(String(r.id)));
  }, [allFines, allRentals, rentalScope, showAll]);

  const pay = async (f) => {
    setBusyId(f.id);
    try {
      await finesApi.pay(f.id);
      toast('Fine paid.');
      fines.reload();
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusyId(null);
    }
  };

  const reloadAll = () => {
    fines.reload();
    rentals.reload();
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Fines</h1>
          <p>Late fees depend on days overdue and the book’s demand level.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={reloadAll}><Icon name="refresh" size={16} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setCalc(true)} disabled={!rentals.data}><Icon name="card" size={16} /> Calculate fine</button>
        </div>
      </header>

      <ErrorBanner error={fines.error} onRetry={fines.reload} title="Could not load fines" />
      {rentals.error && !fines.error && (
        <InfoBanner tone="warn">Rentals could not be loaded ({rentals.error.message}), so fines cannot be matched to you or to books.</InfoBanner>
      )}
      {!fines.error && fines.data && fineScope.unknownOwner && allFines.length > 0 && (
        <InfoBanner>Fine records do not say who owes them, so every fine is listed.</InfoBanner>
      )}
      {!fines.error && !fineScope.unknownOwner && hiddenCount > 0 && (
        <label className="check">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Also show the other {hiddenCount} {hiddenCount === 1 ? 'fine' : 'fines'} from all users
        </label>
      )}

      {fines.data && (
        <section className="stats stats-3">
          <div className="stat stat-berry"><span className="stat-label">Outstanding</span><span className="stat-value">{money(unpaidTotal)}</span><span className="stat-hint">{unpaid.length} unpaid</span></div>
          <div className="stat stat-moss"><span className="stat-label">Paid</span><span className="stat-value">{money(paidTotal)}</span><span className="stat-hint">{paid.length} settled</span></div>
          <div className="stat stat-gold"><span className="stat-label">Waiting for a fine</span><span className="stat-value">{eligible.length}</span><span className="stat-hint">late rentals without one</span></div>
        </section>
      )}

      {fines.loading && !fines.data ? (
        <PageLoader label="Loading fines…" />
      ) : !fines.error && shown.length === 0 ? (
        <div className="empty">
          <Icon name="check" size={28} />
          <h3>No fines</h3>
          <p>Return books on time and this page stays empty.</p>
        </div>
      ) : (
        !fines.error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Book</th><th>Days late</th><th>Demand</th><th>Amount</th><th>Payment</th><th /></tr>
              </thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id}>
                    <td data-label="Book"><strong>{titleFor(f)}</strong><span className="muted small block">Fine #{f.id}</span></td>
                    <td data-label="Days late">{f.daysLate ?? '—'}</td>
                    <td data-label="Demand"><DemandBadge level={demandFor(f)} /></td>
                    <td data-label="Amount"><b>{money(f.amount)}</b></td>
                    <td data-label="Payment"><Badge tone={f.paid ? 'good' : 'bad'}>{f.paid ? 'Paid' : 'Unpaid'}</Badge></td>
                    <td className="actions-cell">
                      {!f.paid && (
                        <button className="btn btn-primary btn-sm" disabled={busyId === f.id} onClick={() => pay(f)}>
                          {busyId === f.id ? <Spinner small /> : <Icon name="check" size={15} />} Pay fine
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

      {calc && (
        <CalculateModal
          eligible={eligible}
          titleOf={titleOf}
          demandOf={demandOfRental}
          onClose={() => setCalc(false)}
          onDone={() => { setCalc(false); reloadAll(); }}
        />
      )}
    </>
  );
}

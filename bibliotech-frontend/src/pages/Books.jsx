import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import useResource from '../hooks/useResource';
import { booksApi, rentalsApi } from '../api/services';
import { contracts } from '../contracts';
import { DEMAND_LEVELS } from '../config';
import { coverFor, titleCase } from '../lib/format';
import { rentalState } from '../lib/dates';
import { scopeRentals } from '../lib/scope';
import { DemandBadge } from '../components/Badge';
import ErrorBanner, { InfoBanner } from '../components/ErrorBanner';
import { PageLoader, Spinner } from '../components/Spinner';
import Modal from '../components/Modal';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { useToast } from '../components/Toast';

function BookForm({ book, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: book?.title ?? '',
    author: book && book.author !== 'Unknown author' ? book.author : '',
    isbn: book && book.isbn !== '—' ? String(book.isbn) : '',
    availableCopies: book ? String(book.available) : '1',
    demandLevel: book?.demand || 'MEDIUM',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required.';
    if (!form.author.trim()) next.author = 'Author is required.';
    if (!/^[0-9A-Za-z-]{5,20}$/.test(form.isbn.trim())) next.isbn = 'Use 5–20 letters, digits or hyphens.';
    const n = Number(form.availableCopies);
    if (form.availableCopies === '' || !Number.isInteger(n) || n < 0 || n > 9999) next.availableCopies = 'Enter a whole number from 0 to 9999.';
    setErrors(next);
    setApiError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const body = contracts.book({ ...form, availableCopies: n }, book || null);
      if (book) await booksApi.update(book.id, body);
      else await booksApi.create(body);
      toast(book ? 'Book updated.' : 'Book added to the catalogue.');
      onSaved();
    } catch (err) {
      setApiError(err);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={book ? 'Edit book' : 'Add a book'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="book-form" disabled={busy}>{busy ? <Spinner small /> : null} {book ? 'Save changes' : 'Add book'}</button>
        </>
      }
    >
      <ErrorBanner error={apiError} title="Could not save the book" />
      <form id="book-form" onSubmit={submit} noValidate>
        <Field id="b-title" label="Title" error={errors.title}><input id="b-title" value={form.title} onChange={set('title')} autoFocus /></Field>
        <Field id="b-author" label="Author" error={errors.author}><input id="b-author" value={form.author} onChange={set('author')} /></Field>
        <Field id="b-isbn" label="ISBN" error={errors.isbn}><input id="b-isbn" value={form.isbn} onChange={set('isbn')} /></Field>
        <div className="field-row">
          <Field id="b-copies" label="Copies available" error={errors.availableCopies}>
            <input id="b-copies" type="number" min="0" step="1" value={form.availableCopies} onChange={set('availableCopies')} />
          </Field>
          <Field id="b-demand" label="Demand level">
            <select id="b-demand" value={form.demandLevel} onChange={set('demandLevel')}>
              {DEMAND_LEVELS.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDelete({ book, onClose, onDeleted }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    try {
      await booksApi.remove(book.id);
      toast('Book deleted.');
      onDeleted();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Delete this book?"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Keep it</button>
          <button className="btn btn-danger" onClick={run} disabled={busy}>{busy ? <Spinner small /> : null} Delete book</button>
        </>
      }
    >
      <ErrorBanner error={error} title="Could not delete" />
      <p><strong>{book.title}</strong> will be removed from the catalogue. This cannot be undone.</p>
    </Modal>
  );
}

export default function Books() {
  const { user, canManage } = useAuth();
  const toast = useToast();
  const books = useResource(() => booksApi.list());
  const rentals = useResource(() => rentalsApi.list());

  const [q, setQ] = useState('');
  const [avail, setAvail] = useState('all');
  const [demand, setDemand] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // { book } | { book: null } for add
  const [deleting, setDeleting] = useState(null);

  const scope = useMemo(() => scopeRentals(rentals.data || [], user), [rentals.data, user]);
  // book id -> the user's open rental for it (only when rentals can be matched to a user)
  const loanByBook = useMemo(() => {
    const m = new Map();
    if (!rentals.data || scope.unknownOwner) return m;
    scope.items.filter((r) => !r.returned).forEach((r) => m.set(String(r.bookId), r));
    return m;
  }, [rentals.data, scope]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (books.data || []).filter((b) => {
      if (term && ![b.title, b.author, b.isbn].some((v) => String(v).toLowerCase().includes(term))) return false;
      if (avail === 'available' && b.available <= 0) return false;
      if (avail === 'unavailable' && b.available > 0) return false;
      if (demand !== 'all' && b.demand !== demand) return false;
      return true;
    });
  }, [books.data, q, avail, demand]);

  const refresh = () => {
    books.reload();
    rentals.reload();
  };

  const borrow = async (book) => {
    setBusyId(book.id);
    try {
      await rentalsApi.borrow(contracts.borrow({ user, book }));
      toast(`Borrowed “${book.title}”. See My rentals for the due date.`);
      refresh();
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      setBusyId(null);
    }
  };

  const giveBack = async (book, rental) => {
    setBusyId(book.id);
    try {
      await rentalsApi.returnBook(rental.id);
      const late = rentalState(rental).overdue;
      toast(late ? `Returned “${book.title}”. It was overdue, so check the Fines page.` : `Returned “${book.title}”. Thank you!`, late ? 'warn' : 'good');
      refresh();
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
          <h1>Catalogue</h1>
          <p>Search by title, author or ISBN.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setEditing({ book: null })}>
            <Icon name="plus" size={16} /> Add book
          </button>
        )}
      </header>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input type="search" placeholder="Search books…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search books" />
        </div>
        <select value={avail} onChange={(e) => setAvail(e.target.value)} aria-label="Filter by availability">
          <option value="all">Any availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select value={demand} onChange={(e) => setDemand(e.target.value)} aria-label="Filter by demand">
          <option value="all">Any demand</option>
          {DEMAND_LEVELS.map((d) => <option key={d} value={d}>{titleCase(d)} demand</option>)}
        </select>
        <button className="icon-btn" onClick={refresh} aria-label="Refresh" title="Refresh"><Icon name="refresh" /></button>
      </div>

      <ErrorBanner error={books.error} onRetry={books.reload} title="Could not load books" />
      {rentals.error && !books.error && (
        <InfoBanner tone="warn">
          Rentals could not be loaded ({rentals.error.message}), so Borrow and Return may not work until that route is fixed.
        </InfoBanner>
      )}
      {!rentals.error && rentals.data && scope.unknownOwner && rentals.data.length > 0 && (
        <InfoBanner>Rental records do not say who borrowed them, so the Return button is only on the My rentals page.</InfoBanner>
      )}

      {books.loading && !books.data ? (
        <PageLoader label="Loading catalogue…" />
      ) : !books.error && filtered.length === 0 ? (
        <div className="empty">
          <Icon name="book" size={28} />
          <h3>{(books.data || []).length === 0 ? 'The catalogue is empty' : 'No books match those filters'}</h3>
          <p>{(books.data || []).length === 0 ? (canManage ? 'Add the first book to get started.' : 'Ask a librarian to add books.') : 'Try a different search or clear a filter.'}</p>
        </div>
      ) : (
        <>
          {books.data && <p className="muted small">{filtered.length} of {books.data.length} titles</p>}
          <div className="grid">
            {filtered.map((b) => {
              const loan = loanByBook.get(String(b.id));
              const busy = busyId === b.id;
              return (
                <article className="book" key={b.id}>
                  <div className="cover" style={coverFor(b.title)}>
                    <h3>{b.title}</h3>
                    <span>{b.author}</span>
                  </div>
                  <div className="book-meta">
                    <div className="book-row"><span>ISBN</span><b>{b.isbn}</b></div>
                    <div className="book-row">
                      <span>Availability</span>
                      <b className={b.available > 0 ? 'ok' : 'no'}>
                        {b.isBooleanAvailability ? (b.available > 0 ? 'In stock' : 'Out of stock') : b.available > 0 ? `${b.available} ${b.available === 1 ? 'copy' : 'copies'}` : 'None left'}
                      </b>
                    </div>
                    <div className="book-row"><span>Demand</span><DemandBadge level={b.demand} /></div>
                    <div className="book-actions">
                      {loan ? (
                        <button className="btn btn-outline btn-sm grow" disabled={busy} onClick={() => giveBack(b, loan)}>
                          {busy ? <Spinner small /> : <Icon name="undo" size={15} />} Return
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm grow" disabled={busy || b.available <= 0} onClick={() => borrow(b)}>
                          {busy ? <Spinner small /> : <Icon name="book" size={15} />} {b.available > 0 ? 'Borrow' : 'Unavailable'}
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button className="icon-btn" onClick={() => setEditing({ book: b })} aria-label={`Edit ${b.title}`} title="Edit"><Icon name="edit" size={16} /></button>
                          <button className="icon-btn danger" onClick={() => setDeleting(b)} aria-label={`Delete ${b.title}`} title="Delete"><Icon name="trash" size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {editing && <BookForm book={editing.book} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); books.reload(); }} />}
      {deleting && <ConfirmDelete book={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); books.reload(); }} />}
    </>
  );
}

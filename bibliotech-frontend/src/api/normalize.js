// Turns whatever the backend returns into the shape the UI uses.
// Field names are matched against several likely spellings. If your DTOs use something
// else, add the name to the matching list below.

const firstKey = (o, keys) => (o ? keys.find((k) => o[k] !== undefined && o[k] !== null) : undefined);
const pick = (o, keys, fallback) => {
  const k = firstKey(o, keys);
  return k === undefined ? fallback : o[k];
};
const idOf = (v) => (v && typeof v === 'object' ? v.id ?? v.userId ?? v.username ?? v.email : v);

/** Accepts [..], {content:[..]} (Spring Page), {data:[..]} or a single object. */
export function toList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export function normalizeBook(b = {}) {
  const availKey = firstKey(b, [
    'availableCopies', 'available_copies', 'copiesAvailable', 'availableQuantity', 'available', 'quantity', 'stock',
  ]);
  const rawAvail = availKey ? b[availKey] : undefined;
  const isBool = typeof rawAvail === 'boolean';
  const demandKey = firstKey(b, ['demandLevel', 'demand_level', 'demand']);
  const total = pick(b, ['totalCopies', 'total_copies', 'total', 'copies'], null);
  return {
    id: pick(b, ['id', 'bookId', 'book_id']),
    title: pick(b, ['title', 'name', 'bookTitle'], 'Untitled'),
    author: pick(b, ['author', 'authorName', 'writer'], 'Unknown author'),
    isbn: pick(b, ['isbn', 'ISBN', 'isbnNumber'], '—'),
    available: isBool ? (rawAvail ? 1 : 0) : Number(rawAvail ?? 0) || 0,
    isBooleanAvailability: isBool,
    availableKey: availKey || 'availableCopies',
    total: total === null ? null : Number(total),
    demand: demandKey ? String(b[demandKey]).toUpperCase() : null,
    demandKey: demandKey || 'demandLevel',
    raw: b,
  };
}

export function normalizeRental(r = {}) {
  const returnDate = pick(r, ['returnDate', 'returnedAt', 'returnedOn', 'returned_date', 'return_date'], null);
  const status = String(pick(r, ['status', 'rentalStatus', 'returnStatus'], '')).toUpperCase();
  const bookRef = pick(r, ['bookId', 'book_id', 'book'], null);
  return {
    id: pick(r, ['id', 'rentalId', 'rental_id']),
    userId: idOf(pick(r, ['userId', 'user_id', 'memberId', 'username', 'user'], null)) ?? null,
    bookId: idOf(bookRef) ?? null,
    bookTitle: bookRef && typeof bookRef === 'object' ? bookRef.title ?? null : pick(r, ['bookTitle'], null),
    borrowDate: pick(r, ['borrowDate', 'rentalDate', 'borrowedAt', 'issueDate', 'issuedOn', 'createdAt', 'borrow_date'], null),
    dueDate: pick(r, ['dueDate', 'due_date', 'dueOn', 'returnDueDate'], null),
    returnDate,
    status,
    returned: Boolean(returnDate) || /RETURN/.test(status),
    raw: r,
  };
}

export function normalizeFine(f = {}) {
  const paidRaw = pick(f, ['paid', 'isPaid', 'is_paid'], undefined);
  const statusRaw = String(pick(f, ['paymentStatus', 'payment_status', 'status', 'fineStatus'], '')).toUpperCase();
  const paid =
    typeof paidRaw === 'boolean'
      ? paidRaw
      : /PAID/.test(statusRaw) && !/UNPAID|NOT[_ ]?PAID|PENDING|DUE/.test(statusRaw);
  return {
    id: pick(f, ['id', 'fineId', 'fine_id']),
    rentalId: idOf(pick(f, ['rentalId', 'rental_id', 'rental'], null)) ?? null,
    userId: idOf(pick(f, ['userId', 'user_id', 'memberId', 'username'], null)) ?? null,
    bookId: idOf(pick(f, ['bookId', 'book_id'], null)) ?? null,
    amount: Number(pick(f, ['amount', 'fineAmount', 'fine_amount', 'totalFine', 'totalAmount'], 0)) || 0,
    daysLate: pick(f, ['daysLate', 'overdueDays', 'daysOverdue', 'lateDays', 'days_late'], null),
    demand: (() => {
      const d = pick(f, ['demandLevel', 'demand_level', 'demand'], null);
      return d ? String(d).toUpperCase() : null;
    })(),
    paid,
    statusText: statusRaw,
    raw: f,
  };
}

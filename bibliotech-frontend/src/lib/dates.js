const DAY = 86400000;

export function parseDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Array.isArray(v)) {
    const [y, m = 1, d = 1, h = 0, mi = 0] = v;
    return new Date(y, m - 1, d, h, mi);
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d); // local midnight, avoids off-by-one timezone shifts
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** whole days from today until `date` (negative = in the past) */
export const daysFromToday = (date) => Math.round((startOfDay(date) - startOfDay(new Date())) / DAY);

/** whole days from a to b */
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

export function formatDate(v) {
  const d = parseDate(v);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/** Describes where a rental stands, for badges and fine eligibility. */
export function rentalState(r) {
  const due = parseDate(r.dueDate);
  if (r.returned) {
    const ret = parseDate(r.returnDate);
    const late = due && ret ? Math.max(0, daysBetween(due, ret)) : 0;
    return {
      key: 'returned',
      label: late > 0 ? `Returned ${late}d late` : 'Returned',
      tone: late > 0 ? 'warn' : 'good',
      daysLate: late,
      overdue: false,
    };
  }
  if (!due) return { key: 'active', label: 'On loan', tone: 'info', daysLate: 0, overdue: false };
  const left = daysFromToday(due);
  if (left < 0) return { key: 'overdue', label: `${-left}d overdue`, tone: 'bad', daysLate: -left, overdue: true };
  if (left === 0) return { key: 'active', label: 'Due today', tone: 'warn', daysLate: 0, overdue: false };
  return { key: 'active', label: `${left}d left`, tone: left <= 3 ? 'warn' : 'info', daysLate: 0, overdue: false };
}

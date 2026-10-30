import { CURRENCY_SYMBOL } from '../config';

export const money = (n) =>
  `${CURRENCY_SYMBOL}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');

// Cover colour pairs, picked deterministically from the title.
const COVERS = [
  ['#1f7a8c', '#0f2a35'],
  ['#b4375a', '#5a1730'],
  ['#d98a1f', '#8a4a0c'],
  ['#2e8b6a', '#134536'],
  ['#4b4fa3', '#1f2260'],
  ['#c2553a', '#6b2414'],
  ['#3b6f9e', '#16324d'],
  ['#7a4a8c', '#3a1f47'],
];
export const COVER_PALETTE = COVERS;

export function coverFor(title = '') {
  let h = 0;
  for (let i = 0; i < title.length; i += 1) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  const [c1, c2] = COVERS[h % COVERS.length];
  return { '--c1': c1, '--c2': c2 };
}

// Central configuration. Everything that depends on your backend lives in this file,
// in contracts.js, or in api/normalize.js.
const env = import.meta.env;

// Where the browser sends API calls. "/gateway" = Vite dev proxy -> http://localhost:8080
export const API_BASE_URL = (env.VITE_API_BASE_URL ?? '/gateway').replace(/\/+$/, '');

// Gateway paths (relative to the gateway root).
//   auth    : CONFIRMED by you  -> /auth-service/auth/signin, /auth-service/auth/signup
//   books   : UNVERIFIED        -> follows the same "/<service-id>/..." pattern
//   rentals : UNVERIFIED
//   fines   : UNVERIFIED
// Use the "API check" page in the app to test them, or override via .env.
export const DEFAULT_ROUTES = {
  auth: env.VITE_AUTH_PATH || '/auth-service/auth',
  books: env.VITE_BOOKS_PATH || '/book-service/books',
  rentals: env.VITE_RENTALS_PATH || '/rental-service/rentals',
  fines: env.VITE_FINES_PATH || '/fine-service/fines',
};

const OVERRIDE_KEY = 'bibliotech.routeOverrides';

function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function getRoute(name) {
  return readOverrides()[name] || DEFAULT_ROUTES[name];
}

export function setRouteOverride(name, path) {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ ...readOverrides(), [name]: path }));
  } catch {
    /* storage unavailable - ignore */
  }
}

export function clearRouteOverrides() {
  try {
    localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* ignore */
  }
}

const list = (v) =>
  String(v ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

export const MANAGE_ROLES = env.VITE_MANAGE_ROLES === undefined ? ['ADMIN', 'LIBRARIAN'] : list(env.VITE_MANAGE_ROLES);
export const SIGNUP_ROLES = list(env.VITE_SIGNUP_ROLES);
export const CURRENCY_SYMBOL = env.VITE_CURRENCY_SYMBOL ?? '';
export const DEMAND_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

// The JWT is kept in sessionStorage: it survives a page refresh but is wiped when the
// tab/browser closes, and it is never written to localStorage or a cookie.
// (React escapes all rendered output, so the usual XSS routes to the token are closed;
// the backend should still use short-lived tokens.)
const KEY = 'bibliotech.session';

export const session = {
  read() {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  write(value) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* storage blocked - session lasts only until refresh */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};

export const getToken = () => session.read()?.token ?? null;

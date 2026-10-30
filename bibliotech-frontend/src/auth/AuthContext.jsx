import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import { contracts } from '../contracts';
import { MANAGE_ROLES } from '../config';
import { buildUser, decodeJwt, extractToken, isExpired } from './jwt';
import { session } from './session';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function loadSession() {
  const s = session.read();
  if (!s?.token || isExpired(decodeJwt(s.token))) {
    session.clear();
    return null;
  }
  return s;
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(loadSession);
  const [notice, setNotice] = useState(null);

  const signout = useCallback((message) => {
    session.clear();
    setState(null);
    setNotice(typeof message === 'string' ? message : null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => signout('Your session has expired. Please sign in again.'));
  }, [signout]);

  // Sign out automatically when the token's own expiry time passes.
  useEffect(() => {
    const exp = state?.user?.exp;
    if (!exp) return undefined;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) {
      signout('Your session has expired. Please sign in again.');
      return undefined;
    }
    const id = setTimeout(() => signout('Your session has expired. Please sign in again.'), Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(id);
  }, [state, signout]);

  const signin = useCallback(async (identifier, password) => {
    const data = await authApi.signin(contracts.signin({ identifier, password }));
    const token = extractToken(data);
    if (!token) {
      throw new ApiError(
        'Signed in, but the response contained no JWT I could find (looked for token, accessToken, access_token, jwt). Check what POST /signin returns, then adjust extractToken in src/auth/jwt.js.',
        0,
        data
      );
    }
    const next = { token, user: buildUser(token, data, identifier) };
    session.write(next);
    setNotice(null);
    setState(next);
  }, []);

  const signup = useCallback((form) => authApi.signup(contracts.signup(form)), []);

  const value = useMemo(() => {
    const user = state?.user ?? null;
    const canManage = !user ? false : user.roles.length === 0 || user.roles.some((r) => MANAGE_ROLES.includes(r));
    return {
      user,
      token: state?.token ?? null,
      canManage,
      notice,
      clearNotice: () => setNotice(null),
      signin,
      signup,
      signout,
    };
  }, [state, notice, signin, signup, signout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

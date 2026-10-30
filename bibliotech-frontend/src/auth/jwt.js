
// Decoding is for display and expiry checks only.
// The backend verifies the JWT signature.

export function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const isExpired = (claims) =>
  Boolean(claims?.exp) && claims.exp * 1000 <= Date.now();

/** Finds the JWT in the sign-in response. */
export function extractToken(data) {
  if (!data) return null;

  if (typeof data === 'string') {
    const token = data.replace(/^Bearer\s+/i, '').trim();
    return token.split('.').length === 3 ? token : null;
  }

  const candidates = [
    data.token,
    data.accessToken,
    data.access_token,
    data.jwt,
    data.jwtToken,
    data.idToken,
    data.data?.token,
    data.data?.accessToken,
  ];

  const token = candidates.find(
    (value) => typeof value === 'string' && value
  );

  return token
    ? token.replace(/^Bearer\s+/i, '').trim()
    : null;
}

function normalizeRoles(value) {
  if (!value) return [];

  const roles = Array.isArray(value)
    ? value
    : String(value).split(/[\s,]+/);

  return roles
    .map((item) =>
      typeof item === 'string'
        ? item
        : item?.authority || item?.name || ''
    )
    .map((role) => role.replace(/^ROLE_/i, '').toUpperCase())
    .filter(Boolean);
}

/** Builds the frontend user from the JWT and sign-in response. */
export function buildUser(token, response, fallbackName) {
  const claims = decodeJwt(token) || {};
  const result =
    response && typeof response === 'object' ? response : {};

  return {
    id:
      result.userId ??
      result.id ??
      claims.userId ??
      claims.uid ??
      claims.id ??
      null,

    username:
      result.username ??
      result.name ??
      claims.username ??
      claims.name ??
      claims.sub ??
      fallbackName,

    email:
      result.email ??
      claims.email ??
      (fallbackName?.includes('@') ? fallbackName : null),

    roles: normalizeRoles(
      result.roles ??
      result.role ??
      claims.roles ??
      claims.role ??
      claims.authorities ??
      claims.scope
    ),

    exp: claims.exp ?? null,
  };
}

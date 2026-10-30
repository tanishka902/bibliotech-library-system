import { API_BASE_URL } from '../config';
import { getToken } from '../auth/session';

export class ApiError extends Error {
  constructor(message, status = 0, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const STATUS_TEXT = {
  400: 'The server rejected the request. Check the values you entered.',
  401: 'Your session is not valid. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'Not found. The record may not exist, or the gateway has no route for this path.',
  409: 'That conflicts with existing data.',
  502: 'The gateway could not reach the service behind this route.',
  503: 'The service is unavailable. Is it running and registered in Eureka?',
  504: 'The service took too long to answer.',
};

function messageFrom(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.length < 300 ? data : '';
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.defaultMessage || e.message || String(e)).join('; ');
  }
  return data.message || data.error || data.detail || '';
}

/**
 * Calls the API Gateway. `path` starts with "/" and is relative to the gateway root.
 * Attaches `Authorization: Bearer <jwt>` whenever a session exists (auth: true).
 */
export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Cannot reach the API Gateway. Make sure it is running on port 8080 (and, if you call it directly, that CORS is enabled).',
      0
    );
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const msg = messageFrom(data) || STATUS_TEXT[res.status] || `Request failed (${res.status}).`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

import { API_BASE } from '../config/api';

/**
 * JSON API client — used by all feature modules in src/api/index.js
 */
export async function apiFetch(path, options = {}) {
  const { headers, body, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
    ...rest,
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    if (typeof data === 'object' && data != null) {
      if (typeof data.detail === 'string') message = data.detail;
      else if (Array.isArray(data.detail)) {
        message = data.detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ');
      } else if (data.message) message = data.message;
    } else if (typeof data === 'string' && data) {
      message = data;
    }
    throw new Error(message);
  }

  return data;
}

/** Fetch binary responses (e.g. PDF). */
export async function apiBlob(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Request failed (${response.status})`);
  }
  return response.blob();
}

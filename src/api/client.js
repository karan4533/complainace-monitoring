import { API_BASE } from '../config/api';

function connectionHint() {
  if (API_BASE) {
    return `Check that FastAPI is running at ${API_BASE} and port 8000 is reachable.`;
  }
  if (import.meta.env.DEV) {
    return 'Start the backend (python dummy-backend.py) on port 8000, or set VITE_API_BASE in .env to your VM URL.';
  }
  return 'Check backend connectivity and VITE_API_BASE configuration.';
}

/**
 * JSON API client — used by all feature modules in src/api/index.js
 */
export async function apiFetch(path, options = {}) {
  const { headers, body, timeoutMs = 120000, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : body,
      ...rest,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out. ${connectionHint()}`);
    }
    throw new Error(`Cannot connect to backend. ${connectionHint()}`);
  } finally {
    clearTimeout(timeoutId);
  }

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
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...options,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Request failed (${response.status})`);
    }
    return response.blob();
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Request failed')) throw err;
    throw new Error(`Cannot connect to backend. ${connectionHint()}`);
  }
}

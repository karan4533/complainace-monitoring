// Set VITE_API_BASE in .env when backend is on another host (e.g. GCP VM).
// In dev without VITE_API_BASE, requests use same-origin paths so Vite proxy
// forwards /api and /ws to http://localhost:8000 (see vite.config.js).
const envBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, '');

export const API_BASE = envBase ?? (import.meta.env.DEV ? '' : `http://${window.location.hostname}:8000`);

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_BASE = envBase
  ? envBase.replace(/^http/, 'ws')
  : import.meta.env.DEV
    ? `${wsProtocol}//${window.location.host}`
    : `ws://${window.location.hostname}:8000`;

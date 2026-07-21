// In production: set VITE_API_BASE in .env (e.g. http://192.168.1.10:8000)
// In dev:        falls back to same hostname:8000 so it works on any machine
const envBase = import.meta.env.VITE_API_BASE;

const _base = envBase
  ? envBase.replace(/\/$/, '')
  : `http://${window.location.hostname}:8000`;

export const API_BASE = _base;
export const WS_BASE = _base.replace(/^http/, 'ws');

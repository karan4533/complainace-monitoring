import { apiFetch } from './apiClient';

export async function login(username, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function getSession() {
  return apiFetch('/api/auth/me');
}

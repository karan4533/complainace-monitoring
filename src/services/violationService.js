import { apiFetch } from './apiClient';
import { fetchReports } from './reportService';

export async function fetchViolations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.cameraId) params.set('camera_id', filters.cameraId);
  if (filters.zone) params.set('zone', filters.zone);
  if (filters.type) params.set('type', filters.type);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.limit) params.set('limit', filters.limit);

  try {
    const qs = params.toString();
    return await apiFetch(`/api/violations${qs ? `?${qs}` : ''}`);
  } catch {
    const limit = filters.limit || 100;
    return fetchReports(limit);
  }
}

export async function getViolation(id) {
  try {
    return await apiFetch(`/api/violations/${id}`);
  } catch {
    const rows = await fetchReports(200);
    return rows.find((r) => String(r.id) === String(id)) || null;
  }
}

export async function acknowledgeViolation(id) {
  return apiFetch(`/api/violations/${id}/acknowledge`, { method: 'POST' });
}

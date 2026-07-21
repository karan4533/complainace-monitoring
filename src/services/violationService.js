import api from '../api';
import { fetchReports } from './reportService';

export async function fetchViolations(filters = {}) {
  try {
    return await api.violations.list(filters);
  } catch {
    const limit = filters.limit || 100;
    return fetchReports(limit);
  }
}

export async function getViolation(id) {
  try {
    return await api.violations.getById(id);
  } catch {
    const rows = await fetchReports(200);
    return rows.find((r) => String(r.id) === String(id)) || null;
  }
}

export const acknowledgeViolation = api.violations.acknowledge;

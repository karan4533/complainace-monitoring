import api from '../api';
import { fetchReports } from './reportService';

/**
 * Prefer /api/reports (implemented by dummy-backend).
 * Fall back to /api/violations only if reports fails and violations exists.
 */
export async function fetchViolations(filters = {}) {
  const limit = filters.limit || 100;
  try {
    return await fetchReports(limit);
  } catch (reportsErr) {
    try {
      return await api.violations.list(filters);
    } catch {
      throw reportsErr;
    }
  }
}

export async function getViolation(id) {
  try {
    const rows = await fetchReports(200);
    return rows.find((r) => String(r.id) === String(id)) || null;
  } catch {
    try {
      return await api.violations.getById(id);
    } catch {
      return null;
    }
  }
}

export const acknowledgeViolation = api.violations.acknowledge;

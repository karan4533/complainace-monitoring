import { API_BASE } from '../config/api';

export async function fetchReports(limit = 100) {
  const response = await fetch(`${API_BASE}/api/reports?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch reports.');
  }
  return response.json();
}

export async function downloadPdfReport({ startDate, endDate, startTime, endTime, signal }) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);

  const response = await fetch(`${API_BASE}/api/reports/download-pdf?${params.toString()}`, { signal });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server returned ${response.status}`);
  }
  return response.blob();
}

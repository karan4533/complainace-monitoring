import { API_BASE } from '../config/api';
import { MOCK_REPORT_ENTRIES, createMockPdfBlob } from '../data/mockReports';
import { filterReportEntries } from '../utils/reportUtils';

export async function fetchReports(limit = 100) {
  try {
    const response = await fetch(`${API_BASE}/api/reports?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reports.');
    }
    return response.json();
  } catch {
    return MOCK_REPORT_ENTRIES.slice(0, limit);
  }
}

export async function downloadPdfReport({
  startDate,
  endDate,
  startTime,
  endTime,
  isoStartDate,
  isoEndDate,
  signal,
}) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);

  try {
    const response = await fetch(`${API_BASE}/api/reports/download-pdf?${params.toString()}`, { signal });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Server returned ${response.status}`);
    }
    return response.blob();
  } catch (err) {
    if (err?.name === 'AbortError') throw err;

    // Backend unavailable — mock PDF filtered by selected range
    const filteredEntries = filterReportEntries(MOCK_REPORT_ENTRIES, {
      startDate: isoStartDate || startDate,
      endDate: isoEndDate || endDate,
      startTime,
      endTime,
    });

    return createMockPdfBlob({
      startDate: isoStartDate || startDate,
      endDate: isoEndDate || endDate,
      startTime,
      endTime,
      entries: filteredEntries,
    });
  }
}

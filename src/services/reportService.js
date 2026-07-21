import api from '../api';
import { MOCK_REPORT_ENTRIES, createMockPdfBlob } from '../data/mockReports';
import { filterReportEntries } from '../utils/reportUtils';

export async function fetchReports(limit = 100) {
  try {
    return await api.reports.list(limit);
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
  try {
    return await api.reports.downloadPdf({
      startDate,
      endDate,
      startTime,
      endTime,
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;

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

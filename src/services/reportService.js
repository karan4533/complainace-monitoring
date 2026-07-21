import { detectionApi } from '../api/detectionApi';

export async function fetchReports(limit = 100, offset = 0) {
  return detectionApi.listReports(limit, offset);
}

export async function downloadPdfReport({
  startDate,
  endDate,
  startTime,
  endTime,
  signal,
}) {
  return detectionApi.downloadReportPdf({
    startDate,
    endDate,
    startTime,
    endTime,
    signal,
  });
}

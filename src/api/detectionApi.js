import { apiFetch } from './client';
import { apiBlob } from './client';
import { API_ENDPOINTS as EP } from './endpoints';

export const detectionApi = {
  startPipeline: () => apiFetch(EP.pipeline.start, { method: 'POST' }),
  stopPipeline: () => apiFetch(EP.pipeline.stop, { method: 'POST' }),
  getPipelineStatus: () => apiFetch(EP.pipeline.status),
  getStreamConfig: () => apiFetch(EP.pipeline.streamConfig),

  listReports: (limit = 100, offset = 0) =>
    apiFetch(`${EP.reports.list}?limit=${limit}&offset=${offset}`),

  downloadReportPdf: ({ startDate, endDate, startTime, endTime, signal }) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (startTime) params.set('start_time', startTime);
    if (endTime) params.set('end_time', endTime);
    return apiBlob(`${EP.reports.downloadPdf}?${params}`, { signal });
  },
};

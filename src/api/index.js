/**
 * Main API integration module — single entry point for all backend calls.
 *
 * Usage in UI/services:
 *   import api from '../api';
 *   await api.sop.getConfigs();
 *
 * Backend team: update paths in ./endpoints.js, methods in this file.
 */

import { API_BASE } from '../config/api';
import { apiBlob, apiFetch } from './client';
import { API_ENDPOINTS as EP } from './endpoints';

// ─── Auth ───────────────────────────────────────────────────────────────────

const auth = {
  login: (username, password) =>
    apiFetch(EP.auth.login, { method: 'POST', body: { username, password } }),

  logout: () => apiFetch(EP.auth.logout, { method: 'POST' }),

  getSession: () => apiFetch(EP.auth.me),
};

// ─── SOP ────────────────────────────────────────────────────────────────────

const sop = {
  getConfigs: async () => {
    const data = await apiFetch(EP.sop.config);
    return data?.streams ?? [];
  },

  saveConfig: (streamId, sopSteps) =>
    apiFetch(EP.sop.config, {
      method: 'PATCH',
      body: { stream_id: Number(streamId), sop_steps: sopSteps },
    }),

  deleteConfig: (streamId) =>
    apiFetch(EP.sop.configByStream(streamId), { method: 'DELETE' }),

  getEvents: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.streamId != null) qs.set('stream_id', String(params.streamId));
    if (params.objectId != null) qs.set('object_id', String(params.objectId));
    if (params.onlyAlerts) qs.set('only_alerts', 'true');
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiFetch(`${EP.sop.events}${suffix}`);
  },

  getPersonIds: async (streamId) => {
    const qs = streamId != null ? `?stream_id=${streamId}` : '';
    const data = await apiFetch(`${EP.sop.personIds}${qs}`);
    return data?.object_ids ?? [];
  },
};

// ─── Pipeline ───────────────────────────────────────────────────────────────

const pipeline = {
  start: () => apiFetch(EP.pipeline.start, { method: 'POST' }),

  stop: () => apiFetch(EP.pipeline.stop, { method: 'POST' }),

  getStatus: () => apiFetch(EP.pipeline.status),

  getStreamConfig: () => apiFetch(EP.pipeline.streamConfig),
};

// ─── Cameras ────────────────────────────────────────────────────────────────

const cameras = {
  list: () => apiFetch(EP.cameras.list),

  create: ({ name, rtspUrl }) =>
    apiFetch(EP.cameras.list, {
      method: 'POST',
      body: { name, rtsp_url: rtspUrl },
    }),

  remove: (cameraId) =>
    apiFetch(EP.cameras.byId(cameraId), { method: 'DELETE' }),
};

// ─── PPE Reports ────────────────────────────────────────────────────────────

const reports = {
  list: (limit = 100, offset = 0) =>
    apiFetch(`${EP.reports.list}?limit=${limit}&offset=${offset}`),

  downloadPdf: ({ startDate, endDate, startTime, endTime, signal }) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (startTime) params.set('start_time', startTime);
    if (endTime) params.set('end_time', endTime);
    return apiBlob(`${EP.reports.downloadPdf}?${params}`, { signal });
  },
};

// ─── Violations (optional) ──────────────────────────────────────────────────

const violations = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.cameraId) params.set('camera_id', filters.cameraId);
    if (filters.zone) params.set('zone', filters.zone);
    if (filters.type) params.set('type', filters.type);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.startDate) params.set('start_date', filters.startDate);
    if (filters.endDate) params.set('end_date', filters.endDate);
    if (filters.limit) params.set('limit', filters.limit);
    const qs = params.toString();
    return apiFetch(`${EP.violations.list}${qs ? `?${qs}` : ''}`);
  },

  getById: (id) => apiFetch(EP.violations.byId(id)),

  acknowledge: (id) =>
    apiFetch(EP.violations.acknowledge(id), { method: 'POST' }),
};

// ─── Static asset URLs ──────────────────────────────────────────────────────

const assets = {
  imageUrl: (imagePath) => {
    const filename = imagePath?.split('/').pop() || '';
    if (!filename) return '';
    return `${API_BASE}${EP.static.images}/${filename}`;
  },

  sopImageUrl: (imagePath) => {
    const filename = imagePath?.split('/').pop() || '';
    if (!filename) return '';
    return `${API_BASE}${EP.static.sopImages}/${filename}`;
  },
};

// ─── Export ─────────────────────────────────────────────────────────────────

const api = {
  auth,
  sop,
  pipeline,
  cameras,
  reports,
  violations,
  assets,
};

export { API_ENDPOINTS } from './endpoints';
export { apiFetch, apiBlob } from './client';
export * as cameraApi from './cameraApi';
export { workflowApi } from './workflowApi';
export { detectionApi } from './detectionApi';
export default api;

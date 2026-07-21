import { apiFetch } from './client';
import { API_ENDPOINTS as EP } from './endpoints';
import { normalizeCameraFeeds } from './cameraApi';

const PIPELINE_POLL_MS = 1000;
const PIPELINE_MAX_ATTEMPTS = 90;

async function waitForPipelineReady() {
  for (let attempt = 0; attempt < PIPELINE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const status = await apiFetch(EP.pipeline.status, { timeoutMs: 10000 });
      if (status?.deepstream_running && status?.go2rtc_running) {
        return true;
      }
    } catch {
      /* backend may still be booting */
    }
    await new Promise((resolve) => setTimeout(resolve, PIPELINE_POLL_MS));
  }
  return false;
}

async function resolveActiveFeeds(startResult) {
  let feeds = normalizeCameraFeeds(startResult);
  if (feeds.length) return feeds;

  try {
    const feedPayload = await apiFetch(EP.cameras.feeds, { timeoutMs: 15000 });
    feeds = normalizeCameraFeeds(feedPayload);
    if (feeds.length) return feeds;
  } catch {
    /* optional endpoint */
  }

  try {
    const cameraPayload = await apiFetch(EP.cameras.list, { timeoutMs: 15000 });
    feeds = normalizeCameraFeeds(cameraPayload);
    if (feeds.length) return feeds;
  } catch {
    /* optional endpoint */
  }

  try {
    const streamConfig = await apiFetch(EP.pipeline.streamConfig, { timeoutMs: 15000 });
    const streamUrl = streamConfig?.streamUrl || '';
    if (streamUrl) {
      return normalizeCameraFeeds([
        { id: 1, name: 'Camera 1', status: 'online', stream_url: streamUrl },
      ]);
    }
  } catch {
    /* stream config unavailable */
  }

  return [];
}

export const workflowApi = {
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

  getPipelineStatus: () => apiFetch(EP.pipeline.status, { timeoutMs: 10000 }),

  stopStream: () => apiFetch(EP.pipeline.stop, { method: 'POST', timeoutMs: 30000 }),

  /**
   * Start backend pipeline, wait until ready, then return active camera feeds.
   * Matches dummy-backend.py workflow: POST start-pipeline -> poll status -> GET stream-config.
   */
  startStream: async () => {
    const result = await apiFetch(EP.pipeline.start, { method: 'POST', timeoutMs: 120000 });

    const ready = await waitForPipelineReady();
    if (!ready) {
      throw new Error(
        'Pipeline did not become ready in time. Check pipeline_debug.log on the backend server.'
      );
    }

    const feeds = await resolveActiveFeeds(result);
    return { ...result, feeds, pipelineReady: true };
  },
};

import { apiFetch } from './apiClient';

/** GET /api/sop-config — all per-stream SOP workflows. */
export async function fetchSopConfigs() {
  const data = await apiFetch('/api/sop-config');
  return data?.streams ?? [];
}

/** PATCH /api/sop-config — create or update one camera's SOP workflow. */
export async function saveStreamSopConfig(streamId, sopSteps) {
  return apiFetch('/api/sop-config', {
    method: 'PATCH',
    body: { stream_id: Number(streamId), sop_steps: sopSteps },
  });
}

/** DELETE /api/sop-config/{stream_id} — remove a camera's workflow. */
export async function deleteStreamSopConfig(streamId) {
  return apiFetch(`/api/sop-config/${streamId}`, { method: 'DELETE' });
}

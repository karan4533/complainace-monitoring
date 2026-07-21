import { apiFetch } from './apiClient';

/** GET /api/sop-events — SOP monitoring events for reports. */
export async function fetchSopEvents(params = {}) {
  const qs = new URLSearchParams();
  if (params.streamId != null) qs.set('stream_id', String(params.streamId));
  if (params.objectId != null) qs.set('object_id', String(params.objectId));
  if (params.onlyAlerts) qs.set('only_alerts', 'true');
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch(`/api/sop-events${suffix}`);
}

/** GET /api/sop-events/person-ids — distinct tracked person ids. */
export async function fetchSopPersonIds(streamId) {
  const qs = streamId != null ? `?stream_id=${streamId}` : '';
  const data = await apiFetch(`/api/sop-events/person-ids${qs}`);
  return data?.object_ids ?? [];
}

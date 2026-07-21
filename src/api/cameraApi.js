import { apiFetch } from './client';
import { API_ENDPOINTS as EP } from './endpoints';

function pickFeedUrl(item) {
  return (
    item.stream_url ||
    item.streamUrl ||
    item.feed_url ||
    item.feedUrl ||
    item.url ||
    ''
  );
}

export function normalizeCameraFeeds(payload) {
  const rows =
    payload?.feeds ||
    payload?.video_feeds ||
    payload?.camera_feeds ||
    payload?.cameras ||
    payload?.streams ||
    payload?.items ||
    payload?.data ||
    payload;

  if (!Array.isArray(rows)) return [];

  return rows
    .map((item, idx) => ({
      id: Number(item.id ?? item.camera_id ?? item.stream_id ?? idx + 1),
      name: item.name || item.camera_name || `Camera ${idx + 1}`,
      status: item.status || 'online',
      stream_url: pickFeedUrl(item),
      stream_src: item.stream_src || null,
    }))
    .filter((item) => item.stream_url || item.stream_src || item.id);
}

export function listCameras() {
  return apiFetch(EP.cameras.list);
}

export function createCamera({ name, rtspUrl }) {
  return apiFetch(EP.cameras.list, {
    method: 'POST',
    body: { name, rtsp_url: rtspUrl },
  });
}

export function removeCamera(cameraId) {
  return apiFetch(EP.cameras.byId(cameraId), { method: 'DELETE' });
}

export async function submitStreamUrl(streamUrl) {
  const payload = await apiFetch(EP.cameras.submitStream, {
    method: 'POST',
    body: { stream_url: streamUrl },
  });
  return {
    raw: payload,
    feeds: normalizeCameraFeeds(payload),
  };
}

export async function fetchCameraFeeds() {
  const payload = await apiFetch(EP.cameras.feeds);
  return normalizeCameraFeeds(payload);
}

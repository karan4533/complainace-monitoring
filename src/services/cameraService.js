import { apiFetch } from './apiClient';

export async function fetchCameras() {
  return apiFetch('/api/cameras');
}

export async function addCamera({ name, rtspUrl }) {
  return apiFetch('/api/cameras', {
    method: 'POST',
    body: { name, rtsp_url: rtspUrl },
  });
}

export async function removeCamera(cameraId) {
  return apiFetch(`/api/cameras/${cameraId}`, { method: 'DELETE' });
}

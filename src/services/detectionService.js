import { apiFetch } from './apiClient';

export async function getDetectionConfig(cameraId) {
  return apiFetch(`/api/cameras/${cameraId}/detection-config`);
}

export async function saveDetectionConfig(cameraId, config) {
  return apiFetch(`/api/cameras/${cameraId}/detection-config`, {
    method: 'PUT',
    body: config,
  });
}

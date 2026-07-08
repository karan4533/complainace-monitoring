import { API_BASE } from '../config/api';

async function parseJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Request failed.');
  }
  return data;
}

export async function startPipeline() {
  const response = await fetch(`${API_BASE}/api/start-pipeline`, { method: 'POST' });
  return parseJson(response);
}

export async function stopPipeline() {
  const response = await fetch(`${API_BASE}/api/stop-pipeline`, { method: 'POST' });
  return parseJson(response);
}

export async function getPipelineStatus() {
  const response = await fetch(`${API_BASE}/api/pipeline-status`);
  return parseJson(response);
}

export async function getStreamConfig() {
  const response = await fetch(`${API_BASE}/api/stream-config`);
  return parseJson(response);
}

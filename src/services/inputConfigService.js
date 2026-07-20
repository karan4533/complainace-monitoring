import { apiFetch } from './apiClient';
import { DEFAULT_INPUT_CONFIG } from '../config/constants';

const STORAGE_KEY = 'compliance_input_config';

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INPUT_CONFIG };
    return { ...DEFAULT_INPUT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_INPUT_CONFIG };
  }
}

function writeLocal(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return config;
}

/** Global input config: what PPE types to detect across the site. */
export async function getInputConfig() {
  try {
    const remote = await apiFetch('/api/detection/input-config');
    const merged = { ...DEFAULT_INPUT_CONFIG, ...remote };
    writeLocal(merged);
    return merged;
  } catch {
    return readLocal();
  }
}

export async function saveInputConfig(config) {
  const payload = { ...DEFAULT_INPUT_CONFIG, ...config };
  writeLocal(payload);
  try {
    return await apiFetch('/api/detection/input-config', {
      method: 'PUT',
      body: payload,
    });
  } catch {
    return { ...payload, _localOnly: true };
  }
}

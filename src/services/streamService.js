import { DEFAULT_STREAMS } from '../config/constants';
import { fetchCameras } from './cameraService';

/**
 * Available camera streams for SOP workflow UI.
 * Uses /api/cameras when present; otherwise falls back to DEFAULT_STREAMS.
 */
export async function fetchStreams() {
  try {
    const cameras = await fetchCameras();
    if (Array.isArray(cameras) && cameras.length) {
      return cameras.map((c) => ({
        id: c.id,
        name: c.name || `Camera ${c.id}`,
      }));
    }
  } catch {
    /* backend may not expose /api/cameras */
  }
  return DEFAULT_STREAMS.map((s) => ({ ...s }));
}

import { severityFromConfidence } from '../config/constants';
import { API_BASE } from '../config/api';

export function normalizeViolation(entry) {
  return {
    id: entry.id,
    cameraId: entry.stream_id ?? entry.camera_id,
    cameraName: entry.camera_name || `Camera ${entry.stream_id ?? entry.camera_id}`,
    zone: entry.zone || 'Full frame',
    type: entry.label || entry.type,
    severity: entry.severity || severityFromConfidence(entry.confidence ?? 0),
    timestamp: entry.timestamp,
    confidence: entry.confidence,
    imagePath: entry.image_path,
    trackId: entry.track_id ?? null,
    vlmReport: entry.vlm_report ?? null,
    vlmPending: entry.vlm_pending ?? !entry.vlm_report,
    acknowledged: entry.acknowledged ?? false,
    raw: entry,
  };
}

export function violationImageUrl(violation) {
  if (!violation?.imagePath) return '';
  const filename = violation.imagePath.split('/').pop();
  return `${API_BASE}/stored_images/${filename}`;
}

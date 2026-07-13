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

export function applyViolationFilters(violations, filters) {
  return violations.filter((v) => {
    if (filters.cameraId && String(v.cameraId) !== String(filters.cameraId)) return false;
    if (filters.zone && filters.zone !== 'all' && v.zone !== filters.zone) return false;
    if (filters.type && filters.type !== 'all' && !v.type.toLowerCase().includes(filters.type.toLowerCase())) return false;
    if (filters.severity && filters.severity !== 'all' && v.severity !== filters.severity) return false;
    if (filters.startDate && v.timestamp.slice(0, 10) < filters.startDate) return false;
    if (filters.endDate && v.timestamp.slice(0, 10) > filters.endDate) return false;
    return true;
  });
}

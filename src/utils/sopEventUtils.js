import { API_BASE } from '../config/api';

const EVENT_LABELS = {
  completed: 'Step completed',
  skipped: 'Step skipped',
  out_of_order: 'Out of order',
  overdue: 'Step overdue',
};

const EVENT_VARIANTS = {
  completed: 'success',
  skipped: 'error',
  out_of_order: 'warning',
  overdue: 'error',
};

export function sopEventTypeLabel(eventType) {
  return EVENT_LABELS[eventType] || eventType?.replace(/_/g, ' ') || 'Unknown';
}

export function sopEventTypeVariant(eventType) {
  return EVENT_VARIANTS[eventType] || 'neutral';
}

export function isSopAlert(eventType) {
  return ['skipped', 'out_of_order', 'overdue'].includes(eventType);
}

export function sopEventImageUrl(event) {
  const filename = event?.image_path?.split('/').pop() || '';
  if (!filename || filename.startsWith('mock_')) {
    const label = encodeURIComponent(
      `${sopEventTypeLabel(event?.event_type)} · Cam ${event?.stream_id ?? '?'}`
    );
    return `https://placehold.co/320x200/1a1a1a/ffffff?text=${label}`;
  }
  return `${API_BASE}/stored_sop_images/${filename}`;
}

export function buildSopEventSummary(event) {
  if (!event) return '';
  const when = event.timestamp || 'Unknown time';
  const camera = event.stream_id != null ? `Camera ${event.stream_id}` : 'Unknown camera';
  const person =
    event.object_id != null ? `Person #${event.object_id}` : 'Tracked person';
  const step = event.step_text || `Step ${event.step_index ?? '?'}`;
  const status = sopEventTypeLabel(event.event_type).toLowerCase();

  if (event.event_type === 'completed') {
    return `On ${when}, ${person} at ${camera} successfully completed: "${step}".`;
  }
  if (event.event_type === 'skipped') {
    return `On ${when}, ${person} at ${camera} skipped a required step: "${step}". Review the snapshot and follow up with site supervision.`;
  }
  if (event.event_type === 'out_of_order') {
    return `On ${when}, ${person} at ${camera} performed steps out of sequence. Expected step: "${step}". Verify the correct SOP order was followed.`;
  }
  if (event.event_type === 'overdue') {
    return `On ${when}, ${person} at ${camera} did not complete "${step}" within the required time. This may indicate a compliance delay.`;
  }
  return `On ${when}, ${person} at ${camera} recorded a ${status} event for "${step}".`;
}

export function mergeSopEvent(existing, incoming) {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const event of incoming) {
    if (event?.id != null) byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => Number(b.id) - Number(a.id));
}

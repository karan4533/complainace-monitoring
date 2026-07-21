import { PPE_GEAR_OPTIONS } from '../config/constants';

const gearById = Object.fromEntries(PPE_GEAR_OPTIONS.map((g) => [g.id, g]));

/** UI detection ids → backend sop_steps strings (PATCH /api/sop-config). */
export function detectionIdsToSopSteps(detectionIds) {
  return detectionIds
    .map((id) => gearById[id]?.sopStep)
    .filter(Boolean)
    .map((step) => (step.endsWith('.') ? step : `${step}.`));
}

/** Backend sop_steps → UI detection ids for display/editing. */
export function sopStepsToDetectionIds(sopSteps = []) {
  const ids = new Set();
  for (const step of sopSteps) {
    const lower = String(step).toLowerCase();
    for (const gear of PPE_GEAR_OPTIONS) {
      if (
        lower.includes(gear.sopStep.replace(/\.$/, '').toLowerCase()) ||
        lower.includes(gear.keyword) ||
        lower.includes(gear.label.toLowerCase())
      ) {
        ids.add(gear.id);
      }
    }
  }
  return [...ids];
}

export function getDetectionLabels(detectionIds) {
  return detectionIds.map((id) => gearById[id]?.label).filter(Boolean);
}

export function formatWorkflowSummary(detectionIds) {
  const labels = getDetectionLabels(detectionIds);
  if (!labels.length) return 'No detections configured';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export function configsByStreamId(streams = []) {
  const map = new Map();
  for (const cfg of streams) {
    map.set(Number(cfg.stream_id), { ...cfg });
  }
  return map;
}

/** Textarea display: one step per line, without trailing periods. */
export function sopStepsToText(sopSteps = []) {
  return sopSteps
    .map((step) => String(step).trim().replace(/\.$/, ''))
    .filter(Boolean)
    .join('\n');
}

/** Parse textarea lines into backend sop_steps array. */
export function parseSopStepsText(text) {
  return String(text)
    .split('\n')
    .map((line) => line.trim().replace(/^["']|["'],?$/g, '').trim())
    .filter(Boolean)
    .map((step) => (step.endsWith('.') ? step : `${step}.`));
}

export function mergeStreamLists(baseStreams, sopStreams) {
  const byId = new Map(baseStreams.map((s) => [Number(s.id), { ...s }]));
  for (const cfg of sopStreams) {
    const id = Number(cfg.stream_id);
    if (!byId.has(id)) {
      byId.set(id, { id, name: `Camera ${id}` });
    }
  }
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

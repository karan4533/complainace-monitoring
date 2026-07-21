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

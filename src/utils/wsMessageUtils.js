/** Shared WebSocket /ws/violations carries PPE rows and typed SOP payloads. */

export function isSopWsMessage(payload) {
  return Boolean(payload?.kind);
}

/** PPE ingest rows have no `kind`; they include a violation label. */
export function isPpeViolationMessage(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (isSopWsMessage(payload)) return false;
  return payload.label != null || payload.type != null;
}

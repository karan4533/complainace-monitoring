import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../config/api';
import { fetchViolations } from '../services/violationService';
import { normalizeViolation } from '../utils/violationUtils';
import { isPpeViolationMessage } from '../utils/wsMessageUtils';

const MAX_ROWS = 200;

export function useViolations({ enabled = true } = {}) {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const pendingVlmRef = useRef(new Map());

  const upsertViolation = useCallback((entry) => {
    const normalized = normalizeViolation(entry);
    setViolations((prev) => {
      const idx = prev.findIndex((v) => v.id === normalized.id);
      const next = idx >= 0 ? [...prev] : [normalized, ...prev];
      if (idx >= 0) next[idx] = { ...next[idx], ...normalized };
      return next.slice(0, MAX_ROWS);
    });

    if (!normalized.vlmReport && !pendingVlmRef.current.has(normalized.id)) {
      pendingVlmRef.current.set(normalized.id, setTimeout(() => {
        setViolations((prev) =>
          prev.map((v) =>
            v.id === normalized.id
              ? {
                  ...v,
                  vlmPending: false,
                  vlmReport: v.vlmReport || `Automated review: ${v.type} detected on ${v.cameraName} in ${v.zone} with ${(v.confidence * 100).toFixed(1)}% confidence.`,
                }
              : v
          )
        );
        pendingVlmRef.current.delete(normalized.id);
      }, 5000));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let socket;
    let reconnectTimer;
    let flushInterval;
    let buffer = [];

    const hydrate = async () => {
      try {
        const data = await fetchViolations({ limit: MAX_ROWS });
        setViolations(Array.isArray(data) ? data.map(normalizeViolation) : []);
      } catch (err) {
        console.error('Failed to load violations:', err);
        setViolations([]);
      } finally {
        setLoading(false);
      }
    };

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/ws/violations`);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (isPpeViolationMessage(payload)) buffer.unshift(payload);
        } catch {
          /* ignore non-json */
        }
      };
      socket.onclose = () => { reconnectTimer = setTimeout(connect, 2000); };
      socket.onerror = () => socket.close();
    };

    flushInterval = setInterval(() => {
      if (!buffer.length) return;
      const batch = buffer;
      buffer = [];
      batch.forEach(upsertViolation);
    }, 500);

    hydrate();
    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushInterval) clearInterval(flushInterval);
      pendingVlmRef.current.forEach((t) => clearTimeout(t));
      pendingVlmRef.current.clear();
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, upsertViolation]);

  const acknowledge = useCallback((id) => {
    setViolations((prev) => prev.map((v) => (v.id === id ? { ...v, acknowledged: true } : v)));
  }, []);

  return { violations, loading, acknowledge, upsertViolation };
}

import { useCallback, useEffect, useState } from 'react';
import { WS_BASE } from '../config/api';
import { fetchViolations } from '../services/violationService';
import { mergeFlatEntriesIntoGroups } from '../utils/reportUtils';
import { isPpeViolationMessage } from '../utils/wsMessageUtils';

const MAX_FRAMES = 100;

export function useViolationFrames({ enabled = true } = {}) {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mergeFrames = useCallback((flatEntries, existing = []) => {
    return mergeFlatEntriesIntoGroups(flatEntries, existing).slice(0, MAX_FRAMES);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let socket;
    let reconnectTimer;
    let flushInterval;
    let buffer = [];

    const hydrate = async () => {
      setError('');
      try {
        const data = await fetchViolations({ limit: MAX_FRAMES });
        setFrames(Array.isArray(data) && data.length ? mergeFrames(data.reverse(), []) : []);
      } catch (err) {
        console.error('Failed to load violation frames:', err);
        setFrames([]);
        setError(err.message || 'Failed to load violation reports.');
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
      socket.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
    };

    flushInterval = setInterval(() => {
      if (!buffer.length) return;
      const batch = buffer;
      buffer = [];
      setFrames((prev) => mergeFrames(batch, prev));
    }, 1000);

    hydrate();
    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (flushInterval) clearInterval(flushInterval);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, mergeFrames]);

  return { frames, loading, error };
}

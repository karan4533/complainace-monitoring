import { useCallback, useEffect, useState } from 'react';
import { WS_BASE } from '../config/api';
import { MOCK_SOP_EVENTS } from '../data/mockSopEvents';
import { fetchSopEvents } from '../services/sopEventService';
import { mergeSopEvent } from '../utils/sopEventUtils';

const MAX_EVENTS = 200;

export function useSopEvents(filters = {}, { enabled = true } = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiFilters = {
    streamId: filters.streamId || undefined,
    objectId: filters.objectId || undefined,
    onlyAlerts: filters.onlyAlerts || undefined,
    limit: MAX_EVENTS,
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchSopEvents(apiFilters);
      if (Array.isArray(data) && data.length) {
        setEvents(data.slice(0, MAX_EVENTS));
      } else {
        setEvents(MOCK_SOP_EVENTS);
      }
    } catch (err) {
      console.error('Failed to load SOP events, using mock data:', err);
      setEvents(MOCK_SOP_EVENTS);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [filters.streamId, filters.objectId, filters.onlyAlerts]);

  useEffect(() => {
    if (!enabled) return undefined;
    setLoading(true);
    load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return undefined;

    let socket;
    let reconnectTimer;
    let buffer = [];

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/ws/violations`);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.kind === 'sop_event') {
            buffer.unshift(payload);
          }
        } catch {
          /* ignore non-json */
        }
      };
      socket.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
    };

    const flushInterval = setInterval(() => {
      if (!buffer.length) return;
      const batch = buffer.filter((e) => {
        if (filters.streamId && String(e.stream_id) !== String(filters.streamId)) return false;
        if (filters.objectId && String(e.object_id) !== String(filters.objectId)) return false;
        if (filters.onlyAlerts && !['skipped', 'out_of_order', 'overdue'].includes(e.event_type)) {
          return false;
        }
        return true;
      });
      buffer = [];
      if (!batch.length) return;
      setEvents((prev) => mergeSopEvent(prev, batch).slice(0, MAX_EVENTS));
    }, 1000);

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(flushInterval);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, filters.streamId, filters.objectId, filters.onlyAlerts]);

  return { events, loading, error, reload: load };
}

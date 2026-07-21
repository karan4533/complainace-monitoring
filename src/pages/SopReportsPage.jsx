import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import SopEventFilters from '../components/sop/SopEventFilters';
import SopEventsTable from '../components/sop/SopEventsTable';
import SopEventDrawer from '../components/sop/SopEventDrawer';
import StatusBadge from '../components/common/StatusBadge';
import { useSopEvents } from '../hooks/useSopEvents';
import { fetchSopPersonIds } from '../services/sopEventService';
import { fetchStreams } from '../services/streamService';
import { isSopAlert, sopEventImageUrl } from '../utils/sopEventUtils';
import { palette } from '../theme/theme';

export default function SopReportsPage() {
  const [streams, setStreams] = useState([]);
  const [personIds, setPersonIds] = useState([]);
  const [streamId, setStreamId] = useState('');
  const [objectId, setObjectId] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { events, loading, error, reload } = useSopEvents({
    streamId: streamId || undefined,
    objectId: objectId || undefined,
    onlyAlerts,
  });

  useEffect(() => {
    fetchStreams().then(setStreams).catch(() => setStreams([]));
  }, []);

  useEffect(() => {
    setObjectId('');
    fetchSopPersonIds(streamId || undefined)
      .then(setPersonIds)
      .catch(() => setPersonIds([]));
  }, [streamId]);

  const alertCount = useMemo(() => events.filter((e) => isSopAlert(e.event_type)).length, [events]);

  const handleStreamChange = (value) => {
    setStreamId(value);
    setObjectId('');
  };

  return (
    <AppLayout activePage="sop-reports">
      <PageHeader
        title="SOP Reports"
        subtitle="Per-person compliance events from the monitoring pipeline"
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={reload}
            disabled={loading}
            sx={{ height: 42 }}
          >
            Refresh
          </Button>
        }
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <StatusBadge label={`${events.length} event${events.length === 1 ? '' : 's'}`} variant="tag" />
        <StatusBadge
          label={`${alertCount} alert${alertCount === 1 ? '' : 's'}`}
          variant={alertCount ? 'error' : 'success'}
        />
      </Box>

      <SopEventFilters
        streams={streams}
        personIds={personIds}
        streamId={streamId}
        objectId={objectId}
        onlyAlerts={onlyAlerts}
        onStreamChange={handleStreamChange}
        onPersonChange={setObjectId}
        onOnlyAlertsChange={setOnlyAlerts}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!events.length && !loading && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No SOP events yet. Configure workflows under SOP Workflows, start the pipeline on the Dashboard, and
          events will appear here as people are tracked on each camera.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <SopEventsTable
          events={events}
          imageUrl={sopEventImageUrl}
          onSelect={setSelectedEvent}
        />
      )}

      {!loading && events.length > 0 && (
        <Typography sx={{ fontSize: '0.75rem', color: palette.textMuted, mt: 2, textAlign: 'center' }}>
          Live updates via WebSocket · snapshots served from /stored_sop_images
        </Typography>
      )}

      <SopEventDrawer
        event={selectedEvent}
        imageUrl={selectedEvent ? sopEventImageUrl(selectedEvent) : ''}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </AppLayout>
  );
}

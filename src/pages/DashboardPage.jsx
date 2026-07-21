import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import LiveCameraTable from '../components/live/LiveCameraTable';
import {
  getPipelineStatus,
  getStreamConfig,
  startPipeline,
  stopPipeline,
} from '../services/pipelineService';
import { fetchCameras } from '../services/cameraService';
import { fetchStreams } from '../services/streamService';
import { DEFAULT_STREAMS } from '../config/constants';
import { useViolations } from '../hooks/useViolations';
import { API_BASE } from '../config/api';
import { palette } from '../theme/theme';

function resolveCameraStreamUrl(camera, baseStreamUrl) {
  if (camera.stream_url) return camera.stream_url;
  if (camera.streamUrl) return camera.streamUrl;
  if (baseStreamUrl && camera.stream_src) {
    const playerBase = baseStreamUrl.split('?')[0];
    return `${playerBase}?src=${camera.stream_src}`;
  }
  return baseStreamUrl;
}

export default function DashboardPage() {
  const [cameras, setCameras] = useState([]);
  const [streamUrl, setStreamUrl] = useState(null);
  const [pipelineStarted, setPipelineStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef(null);
  const { violations } = useViolations({ enabled: true });

  const activeCameraIds = new Set(
    violations.filter((v) => !v.acknowledged).map((v) => v.cameraId)
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCameras();
        if (Array.isArray(data) && data.length) {
          setCameras(data);
          return;
        }
        const streams = await fetchStreams();
        setCameras(streams.map((s) => ({ id: s.id, name: s.name, status: 'online' })));
      } catch {
        setCameras(
          DEFAULT_STREAMS.map((s) => ({ id: s.id, name: s.name, status: 'online' }))
        );
      } finally {
        setCamerasLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const status = await getPipelineStatus();
        if (status.deepstream_running && status.go2rtc_running) {
          const streamData = await getStreamConfig();
          setStreamUrl(streamData.streamUrl);
          setPipelineStarted(true);
          setPipelineStatus('Pipeline running. Stream live.');
        }
      } catch {
        /* pipeline not running */
      }
    })();
  }, []);

  const waitForPipelineReady = () => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      attempts += 1;
      try {
        const data = await getPipelineStatus();
        if (data.deepstream_running && data.go2rtc_running) {
          const streamData = await getStreamConfig();
          setStreamUrl(streamData.streamUrl);
          setPipelineStatus('Pipeline running. Stream live.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error polling pipeline status:', err);
      }

      if (attempts < maxAttempts) {
        pollRef.current = setTimeout(poll, 1000);
      } else {
        setPipelineStatus('Pipeline taking longer than expected. Check pipeline_debug.log on the VM.');
        setLoading(false);
      }
    };

    poll();
  };

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const handleStartStream = async () => {
    try {
      setLoading(true);
      setPipelineStatus('Starting pipeline...');
      setPipelineStarted(true);
      const data = await startPipeline();
      setPipelineStatus(data.message || 'Pipeline starting...');
      waitForPipelineReady();
    } catch (error) {
      console.error(error);
      setPipelineStarted(false);
      setPipelineStatus(
        `Could not reach backend at ${API_BASE}. Make sure FastAPI is running and port 8000 is open in GCP firewall.`
      );
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    try {
      setStopping(true);
      if (pollRef.current) clearTimeout(pollRef.current);
      await stopPipeline();
      setStreamUrl(null);
      setPipelineStarted(false);
      setLoading(false);
      setPipelineStatus('Pipeline stopped.');
    } catch (error) {
      console.error(error);
      setPipelineStatus('Failed to stop pipeline.');
    } finally {
      setStopping(false);
    }
  };

  const pipelineLive = !!(pipelineStarted && streamUrl);

  return (
    <AppLayout activePage="dashboard" pipelineLive={pipelineLive}>
      <PageHeader
        title="Live Monitoring Dashboard"
        subtitle="Camera live feeds in a table · rows highlight red on active violation"
        action={
          <Box sx={{ display: 'flex', width: { xs: '100%', sm: 'auto' } }}>
            {pipelineStarted ? (
              <Button
                variant="outlined"
                onClick={handleStopStream}
                disabled={stopping}
                startIcon={stopping ? <CircularProgress size={18} color="inherit" /> : <StopCircleOutlinedIcon />}
                sx={{
                  height: 42,
                  px: 2.5,
                  flex: { xs: 1, sm: 'none' },
                  color: palette.error,
                  borderColor: palette.errorBg,
                  backgroundColor: palette.errorBg,
                  '&:hover': { borderColor: palette.error, backgroundColor: '#FDDEDE' },
                }}
              >
                {stopping ? 'Stopping...' : 'Stop Stream'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleStartStream}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayCircleFilledIcon />}
                sx={{ height: 42, px: 2.5, flex: { xs: 1, sm: 'none' } }}
              >
                {loading ? 'Starting...' : 'Start Stream'}
              </Button>
            )}
          </Box>
        }
      />

      {pipelineStatus && (
        <Box sx={{ mb: 2.5 }}>
          <StatusBadge
            label={pipelineStatus}
            variant={pipelineLive ? 'success' : pipelineStarted ? 'warning' : 'neutral'}
          />
        </Box>
      )}

      {camerasLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : cameras.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            borderRadius: '12px',
            border: `1px dashed ${palette.border}`,
            backgroundColor: palette.surface,
          }}
        >
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            No cameras connected yet
          </Typography>
          <Typography color="text.secondary">
            Once the backend connects cameras, all live feeds will appear here in the monitoring table.
          </Typography>
        </Box>
      ) : (
        <LiveCameraTable
          cameras={cameras}
          resolveStreamUrl={(camera) => resolveCameraStreamUrl(camera, streamUrl)}
          activeCameraIds={activeCameraIds}
          pipelineLive={pipelineLive}
        />
      )}
    </AppLayout>
  );
}

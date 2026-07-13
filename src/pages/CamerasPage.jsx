import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import CameraTable from '../components/cameras/CameraTable';
import CameraDetailDrawer from '../components/cameras/CameraDetailDrawer';
import { addCamera, fetchCameras, removeCamera } from '../services/cameraService';
import { getPipelineStatus, getStreamConfig } from '../services/pipelineService';

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);

  const loadCameras = async () => {
    try {
      const data = await fetchCameras();
      setCameras(data);
    } catch {
      setCameras([
        { id: 1, name: 'Camera 1', rtsp_url: 'rtsp://placeholder/stream', status: 'online' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const status = await getPipelineStatus();
        if (status.deepstream_running && status.go2rtc_running) {
          const cfg = await getStreamConfig();
          setStreamUrl(cfg.streamUrl);
        }
      } catch {
        /* pipeline not running */
      }
    })();
  }, []);

  const handleAdd = async ({ name, rtspUrl }) => {
    try {
      const created = await addCamera({ name, rtspUrl });
      setCameras((prev) => [...prev, created]);
    } catch {
      setCameras((prev) => [
        ...prev,
        { id: Date.now(), name, rtsp_url: rtspUrl, status: 'online' },
      ]);
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeCamera(id);
    } catch {
      /* local fallback */
    }
    setCameras((prev) => prev.filter((c) => c.id !== id));
    if (selectedCamera?.id === id) setSelectedCamera(null);
  };

  return (
    <AppLayout activePage="add-stream">
      <PageHeader
        title="Add Stream"
        subtitle={`${cameras.length} configured camera${cameras.length !== 1 ? 's' : ''} · click a row for full details`}
      />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <CameraTable
          cameras={cameras}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onSelect={setSelectedCamera}
          loading={loading}
        />
      )}

      <CameraDetailDrawer
        camera={selectedCamera}
        streamUrl={streamUrl}
        open={!!selectedCamera}
        onClose={() => setSelectedCamera(null)}
        onRemove={handleRemove}
      />
    </AppLayout>
  );
}

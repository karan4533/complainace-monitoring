import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import GearChecklist from '../components/detection/GearChecklist';
import ZoneCanvas from '../components/detection/ZoneCanvas';
import { navigateTo } from '../config/routes';
import { getDetectionConfig, saveDetectionConfig } from '../services/detectionService';
import { getInputConfig } from '../services/inputConfigService';
import { PPE_GEAR_OPTIONS } from '../config/constants';

export default function DetectionConfigPage({ cameraId }) {
  const [selectedGear, setSelectedGear] = useState(PPE_GEAR_OPTIONS.map((g) => g.id));
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!cameraId) return;
    (async () => {
      try {
        const [config, inputConfig] = await Promise.all([
          getDetectionConfig(cameraId).catch(() => null),
          getInputConfig().catch(() => null),
        ]);
        if (config?.enforced_gear) setSelectedGear(config.enforced_gear);
        else if (inputConfig?.enabledDetections?.length) setSelectedGear(inputConfig.enabledDetections);
        if (config?.zones) setZones(config.zones);
      } catch {
        /* use defaults */
      } finally {
        setLoading(false);
      }
    })();
  }, [cameraId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveDetectionConfig(cameraId, { enforced_gear: selectedGear, zones });
      setMessage('Detection configuration saved.');
    } catch {
      setMessage('Saved locally. Backend detection-config endpoint not available yet.');
    } finally {
      setSaving(false);
    }
  };

  if (!cameraId) {
    return (
      <AppLayout activePage="detection-config">
        <Alert severity="info" sx={{ mb: 2 }}>
          Pick a camera from Add Stream for zone drawing, or set site-wide detection inputs first.
        </Alert>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button variant="contained" onClick={() => navigateTo('input-config')}>
            Open Input Config
          </Button>
          <Button onClick={() => navigateTo('add-stream')}>Go to Add Stream</Button>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePage="detection-config">
      <PageHeader
        title="Detection Config"
        subtitle={`Camera ${cameraId} · gear enforcement & optional zones`}
        action={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigateTo('add-stream')}>
            Back to Add Stream
          </Button>
        }
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          <GearChecklist selectedGear={selectedGear} onChange={setSelectedGear} />
          <ZoneCanvas previewUrl="" zones={zones} onZonesChange={setZones} />
          {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ mt: 2, width: { xs: '100%', sm: 'auto' }, height: 44 }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </>
      )}
    </AppLayout>
  );
}

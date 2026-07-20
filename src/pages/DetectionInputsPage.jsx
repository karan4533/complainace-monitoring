import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Slider,
  Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import DetectionTypeCards from '../components/detection/DetectionTypeCards';
import { DEFAULT_INPUT_CONFIG } from '../config/constants';
import { getInputConfig, saveInputConfig } from '../services/inputConfigService';
import { fetchCameras } from '../services/cameraService';
import { palette } from '../theme/theme';

export default function DetectionInputsPage() {
  const [config, setConfig] = useState({ ...DEFAULT_INPUT_CONFIG });
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [saved, cams] = await Promise.all([
          getInputConfig(),
          fetchCameras().catch(() => [
            { id: 1, name: 'Camera 1' },
            { id: 2, name: 'Camera 2' },
            { id: 3, name: 'Camera 3' },
            { id: 4, name: 'Camera 4' },
            { id: 5, name: 'Camera 5' },
          ]),
        ]);
        setConfig(saved);
        setCameras(Array.isArray(cams) ? cams : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (patch) => setConfig((prev) => ({ ...prev, ...patch }));

  const toggleCamera = (id) => {
    const ids = config.cameraIds.map(String).includes(String(id))
      ? config.cameraIds.filter((x) => String(x) !== String(id))
      : [...config.cameraIds, id];
    update({ cameraIds: ids });
  };

  const handleSave = async () => {
    if (!config.enabledDetections.length) {
      setError('Select at least one item to detect.');
      setMessage('');
      return;
    }
    if (!config.applyToAllCameras && !config.cameraIds.length) {
      setError('Select at least one camera, or apply to all cameras.');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await saveInputConfig(config);
      setMessage(
        result?._localOnly
          ? 'Input configuration saved on this device. Backend sync will apply when the API is available.'
          : 'Input configuration saved. The pipeline will use these detection inputs.'
      );
    } catch {
      setError('Could not save input configuration.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = config.enabledDetections.length;

  return (
    <AppLayout activePage="input-config">
      <PageHeader
        title="Input Configuration"
        subtitle="Choose what the system should detect · PPE missing gear alerts"
        action={
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            onClick={handleSave}
            disabled={saving || loading}
            sx={{ height: 42, px: 2.5 }}
          >
            {saving ? 'Saving...' : 'Save Inputs'}
          </Button>
        }
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 960 }}>
          {(message || error) && (
            <Alert severity={error ? 'error' : 'success'} onClose={() => { setMessage(''); setError(''); }}>
              {error || message}
            </Alert>
          )}

          <Section
            title="What to detect"
            hint={`${selectedCount} of ${DEFAULT_INPUT_CONFIG.enabledDetections.length} selected · click a card to toggle`}
          >
            <DetectionTypeCards
              selectedIds={config.enabledDetections}
              onChange={(enabledDetections) => update({ enabledDetections })}
            />
          </Section>

          <Section
            title="Detection sensitivity"
            hint="Higher confidence means fewer false alerts, but some real issues may be missed"
          >
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '12px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: palette.textPrimary }}>
                  Minimum confidence
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: palette.primary }}>
                  {Math.round(config.confidenceThreshold * 100)}%
                </Typography>
              </Box>
              <Slider
                value={config.confidenceThreshold}
                min={0.3}
                max={0.95}
                step={0.05}
                onChange={(_, value) => update({ confidenceThreshold: value })}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                sx={{ color: palette.primary, maxWidth: 480 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', maxWidth: 480 }}>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  More alerts
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  Fewer, higher-confidence alerts
                </Typography>
              </Box>
            </Paper>
          </Section>

          <Section title="Apply to cameras" hint="Use the same detection inputs on every stream, or pick specific cameras">
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '12px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.applyToAllCameras}
                    onChange={(e) => update({ applyToAllCameras: e.target.checked })}
                  />
                }
                label="Apply to all cameras"
              />

              {!config.applyToAllCameras && (
                <Box
                  sx={{
                    mt: 1.5,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 0.5,
                  }}
                >
                  {cameras.map((cam) => (
                    <FormControlLabel
                      key={cam.id}
                      control={
                        <Checkbox
                          checked={config.cameraIds.map(String).includes(String(cam.id))}
                          onChange={() => toggleCamera(cam.id)}
                        />
                      }
                      label={cam.name || `Camera ${cam.id}`}
                    />
                  ))}
                  {!cameras.length && (
                    <Typography variant="body2">No cameras configured yet. Add a stream first.</Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Section>

          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ height: 44 }}
            >
              {saving ? 'Saving...' : 'Save Inputs'}
            </Button>
          </Box>
        </Box>
      )}
    </AppLayout>
  );
}

function Section({ title, hint, children }) {
  return (
    <Box>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: '1rem',
          color: palette.textPrimary,
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      {hint && (
        <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary, mb: 1.5 }}>
          {hint}
        </Typography>
      )}
      {children}
    </Box>
  );
}

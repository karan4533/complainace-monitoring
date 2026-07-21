import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import SopCameraList from '../components/sop/SopCameraList';
import SopSequenceEditor from '../components/sop/SopSequenceEditor';
import { fetchSopConfigs, saveStreamSopConfig, deleteStreamSopConfig } from '../services/sopConfigService';
import { fetchStreams } from '../services/streamService';
import {
  configsByStreamId,
  mergeStreamLists,
  parseSopStepsText,
  sopStepsToText,
} from '../utils/sopUtils';

export default function DetectionInputsPage() {
  const [streams, setStreams] = useState([]);
  const [configMap, setConfigMap] = useState(new Map());
  const [selectedStreamId, setSelectedStreamId] = useState(null);
  const [stepsText, setStepsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const [streamList, sopStreams] = await Promise.all([
        fetchStreams(),
        fetchSopConfigs().catch(() => []),
      ]);
      const merged = mergeStreamLists(streamList, sopStreams);
      setStreams(merged);
      setConfigMap(configsByStreamId(sopStreams));
      setSelectedStreamId((current) => current ?? merged[0]?.id ?? null);
    } catch (err) {
      setLoadError(err.message || 'Failed to load SOP workflows.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedStream = useMemo(
    () => streams.find((s) => Number(s.id) === Number(selectedStreamId)),
    [streams, selectedStreamId]
  );

  const existingConfig = configMap.get(Number(selectedStreamId));
  const isExisting = Boolean(existingConfig?.sop_steps?.length);

  useEffect(() => {
    if (selectedStreamId == null) {
      setStepsText('');
      return;
    }
    const cfg = configMap.get(Number(selectedStreamId));
    setStepsText(sopStepsToText(cfg?.sop_steps ?? []));
    setSaveError('');
  }, [selectedStreamId, configMap]);

  const handleSelect = (streamId) => {
    setSelectedStreamId(streamId);
    setMessage('');
    setSaveError('');
  };

  const handleSave = async () => {
    if (!selectedStreamId) return;
    const sopSteps = parseSopStepsText(stepsText);
    if (!sopSteps.length) {
      setSaveError('Enter at least one SOP step (one per line).');
      return;
    }

    setSaving(true);
    setSaveError('');
    setMessage('');
    try {
      const result = await saveStreamSopConfig(selectedStreamId, sopSteps);
      const saved = result?.config ?? {
        stream_id: Number(selectedStreamId),
        sop_steps: sopSteps,
        updated_at: new Date().toISOString(),
      };
      setConfigMap((prev) => {
        const next = new Map(prev);
        next.set(Number(selectedStreamId), saved);
        return next;
      });
      setMessage(
        `SOP sequence ${isExisting ? 'updated' : 'saved'} for ${selectedStream?.name || `Stream ${selectedStreamId}`}.`
      );
    } catch (err) {
      setSaveError(err.message || 'Failed to save SOP sequence.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStreamId || !isExisting) return;
    setDeleting(true);
    setMessage('');
    setLoadError('');
    try {
      await deleteStreamSopConfig(selectedStreamId);
      setConfigMap((prev) => {
        const next = new Map(prev);
        next.delete(Number(selectedStreamId));
        return next;
      });
      setStepsText('');
      setMessage(`SOP sequence removed for Stream ${selectedStreamId}.`);
    } catch (err) {
      setLoadError(err.message || 'Failed to delete SOP sequence.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout activePage="input-config">
      <PageHeader
        title="SOP Workflows"
        subtitle="Configure ordered SOP steps per camera stream"
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {loadError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError('')}>
              {loadError}
            </Alert>
          )}
          {message && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>
              {message}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            <SopCameraList
              streams={streams}
              configMap={configMap}
              selectedStreamId={selectedStreamId}
              onSelect={handleSelect}
            />
            <SopSequenceEditor
              stream={selectedStream}
              streamId={selectedStreamId ?? ''}
              stepsText={stepsText}
              onStepsChange={setStepsText}
              onSave={handleSave}
              onDelete={handleDelete}
              saving={saving}
              deleting={deleting}
              error={saveError}
              isExisting={isExisting}
            />
          </Box>
        </Box>
      )}
    </AppLayout>
  );
}

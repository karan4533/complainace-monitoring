import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { navigateTo } from '../config/routes';
import { getViolation, acknowledgeViolation } from '../services/violationService';
import { violationImageUrl } from '../utils/violationUtils';
import { buildSummary } from '../utils/reportUtils';
import { palette } from '../theme/theme';
import { SEVERITY_COLORS } from '../config/constants';

export default function ViolationDetailPage({ id }) {
  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getViolation(id);
        if (data) {
          setViolation({
            id: data.id,
            cameraId: data.stream_id ?? data.camera_id,
            cameraName: data.camera_name || `Camera ${data.stream_id ?? data.camera_id}`,
            zone: data.zone || 'Full frame',
            type: data.label || data.type,
            severity: data.severity || 'medium',
            timestamp: data.timestamp,
            confidence: data.confidence,
            imagePath: data.image_path,
            trackId: data.track_id ?? '—',
            vlmReport: data.vlm_report || buildSummary({
              timestamp: data.timestamp,
              stream_id: data.stream_id,
              violations: [{ label: data.label, confidence: data.confidence }],
            }),
            acknowledged: data.acknowledged,
          });
          setAcknowledged(!!data.acknowledged);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAcknowledge = async () => {
    try {
      await acknowledgeViolation(id);
    } catch {
      /* local fallback */
    }
    setAcknowledged(true);
  };

  if (loading) {
    return (
      <AppLayout activePage="reports">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      </AppLayout>
    );
  }

  if (!violation) {
    return (
      <AppLayout activePage="reports">
        <Typography>Violation not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigateTo('reports')}>Back</Button>
      </AppLayout>
    );
  }

  const sev = SEVERITY_COLORS[violation.severity] || SEVERITY_COLORS.medium;

  return (
    <AppLayout activePage="reports">
      <PageHeader
        title="Violation Detail"
        subtitle={`Alert #${violation.id}`}
        action={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigateTo('reports')}>
            Back to Reports
          </Button>
        }
      />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: { md: '1 1 58%' } }}>
          <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', backgroundColor: '#111' }}>
              <img
                src={violationImageUrl(violation)}
                alt="Annotated snapshot"
                style={{ width: '100%', display: 'block', maxHeight: 480, objectFit: 'contain' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  border: `3px solid ${palette.error}`,
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  opacity: 0.35,
                }}
              />
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Annotated snapshot with bounding boxes (overlay TBD from pipeline)
              </Typography>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: { md: '1 1 42%' } }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <StatusBadge label={violation.type} variant="tag" />
              <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: '20px', backgroundColor: sev.bg }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: sev.color, textTransform: 'capitalize' }}>
                  {violation.severity}
                </Typography>
              </Box>
              {acknowledged && <StatusBadge label="Reviewed" variant="success" />}
            </Box>

            <MetaRow label="Camera" value={violation.cameraName} />
            <MetaRow label="Zone" value={violation.zone} />
            <MetaRow label="Track ID" value={violation.trackId} />
            <MetaRow label="Confidence" value={`${(violation.confidence * 100).toFixed(1)}%`} />
            <MetaRow label="Timestamp" value={violation.timestamp} />
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>VLM Report</Typography>
            <Typography sx={{ lineHeight: 1.7, fontSize: '0.9rem' }}>{violation.vlmReport}</Typography>
          </Paper>

          {!acknowledged && (
            <Button variant="contained" fullWidth onClick={handleAcknowledge} sx={{ height: 44 }}>
              Acknowledge Violation
            </Button>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}

function MetaRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: `1px solid ${palette.borderLight}` }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value}</Typography>
    </Box>
  );
}

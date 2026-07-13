import React from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StatusBadge from '../common/StatusBadge';
import { buildSummary } from '../../utils/reportUtils';
import { palette } from '../../theme/theme';

export default function ViolationDrawer({ report, imageUrl, open, onClose }) {
  if (!report) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          borderLeft: `1px solid ${palette.border}`,
          backgroundColor: palette.surface,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${palette.borderLight}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: palette.textPrimary }}>
                Camera {report.stream_id}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: palette.textMuted, mt: 0.25 }}>
                {report.timestamp}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: palette.textMuted }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <StatusBadge label={`${report.violations.length} Violations`} variant="error" />
            <StatusBadge label={`Stream ${report.stream_id}`} variant="tag" />
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
          <Box
            sx={{
              width: '100%',
              height: 200,
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#1a1a1a',
              mb: 3,
            }}
          >
            <img src={imageUrl} alt="Violation" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>

          <Section title="Detected Violations">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {report.violations.map((v) => (
                <StatusBadge
                  key={v.id}
                  label={`${v.label} · ${(v.confidence * 100).toFixed(1)}%`}
                  variant="tag"
                />
              ))}
            </Box>
          </Section>

          <Section title="Frame Details">
            <DetailRow label="Camera ID" value={report.stream_id} />
            <DetailRow label="Violations in frame" value={report.violations.length} />
            <DetailRow label="Timestamp" value={report.timestamp} />
          </Section>

          <Section title="Summary">
            <Box
              sx={{
                p: 2,
                borderRadius: '10px',
                backgroundColor: palette.background,
                border: `1px solid ${palette.borderLight}`,
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', color: palette.textPrimary, lineHeight: 1.7 }}>
                {buildSummary(report)}
              </Typography>
            </Box>
          </Section>

          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: '10px',
              backgroundColor: palette.warningBg,
              border: `1px solid #FFE082`,
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', color: palette.warning, lineHeight: 1.6 }}>
              Violation frames are captured automatically by the PPE detection pipeline. Review flagged incidents and export reports for compliance records.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2.5, borderTop: `1px solid ${palette.borderLight}` }}>
          <Button fullWidth variant="contained" onClick={onClose} sx={{ height: 44 }}>
            Close Details
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1.25, color: palette.textMuted }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function DetailRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: `1px solid ${palette.borderLight}` }}>
      <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: palette.textPrimary }}>{value}</Typography>
    </Box>
  );
}

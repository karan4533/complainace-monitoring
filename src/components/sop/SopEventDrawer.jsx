import React from 'react';
import { Box, Button, Drawer, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StatusBadge from '../common/StatusBadge';
import {
  buildSopEventSummary,
  sopEventTypeLabel,
  sopEventTypeVariant,
} from '../../utils/sopEventUtils';
import { palette } from '../../theme/theme';

export default function SopEventDrawer({ event, imageUrl, open, onClose }) {
  if (!event) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 440 },
          borderLeft: `1px solid ${palette.border}`,
          backgroundColor: palette.surface,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${palette.borderLight}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
                Camera {event.stream_id}
                {event.object_id != null ? ` · Person #${event.object_id}` : ''}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: palette.textMuted, mt: 0.25 }}>
                {event.timestamp}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: palette.textMuted }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <StatusBadge
              label={sopEventTypeLabel(event.event_type)}
              variant={sopEventTypeVariant(event.event_type)}
            />
            {event.step_index != null && (
              <StatusBadge label={`Step ${event.step_index}`} variant="tag" />
            )}
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
            <img src={imageUrl} alt="SOP event" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>

          <Section title="SOP Step">
            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              {event.step_text || 'No step description recorded.'}
            </Typography>
          </Section>

          <Section title="Event details">
            <DetailRow label="Event ID" value={event.id} />
            <DetailRow label="Camera" value={`Stream ${event.stream_id}`} />
            <DetailRow label="Person" value={event.object_id != null ? `#${event.object_id}` : 'Not tracked'} />
            <DetailRow label="Event type" value={sopEventTypeLabel(event.event_type)} />
            <DetailRow label="Timestamp" value={event.timestamp} />
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
              <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                {buildSopEventSummary(event)}
              </Typography>
            </Box>
          </Section>

          {event.raw_vlm_response && (
            <Section title="Detection analysis">
              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: palette.tagBg,
                  border: `1px solid ${palette.borderLight}`,
                }}
              >
                <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.6, color: palette.textSecondary }}>
                  {event.raw_vlm_response}
                </Typography>
              </Box>
            </Section>
          )}
        </Box>

        <Box sx={{ p: 2.5, borderTop: `1px solid ${palette.borderLight}` }}>
          <Button fullWidth variant="contained" onClick={onClose} sx={{ height: 44 }}>
            Close
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
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: 0.75,
        borderBottom: `1px solid ${palette.borderLight}`,
        gap: 2,
      }}
    >
      <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
    </Box>
  );
}

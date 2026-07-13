import React from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StatusBadge from '../common/StatusBadge';
import { navigateTo } from '../../config/routes';
import { palette } from '../../theme/theme';

const statusVariant = {
  online: 'success',
  offline: 'neutral',
  violation_active: 'error',
};

export default function CameraDetailDrawer({ camera, streamUrl, open, onClose, onRemove }) {
  if (!camera) return null;

  const rtsp = camera.rtsp_url || camera.rtspUrl || 'Not available';
  const previewUrl = camera.stream_url || camera.streamUrl || streamUrl;

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
              <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: palette.textPrimary }}>
                {camera.name}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: palette.textMuted, mt: 0.25 }}>
                Camera ID: {camera.id}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: palette.textMuted }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ mt: 2 }}>
            <StatusBadge
              label={(camera.status || 'offline').replace('_', ' ')}
              variant={statusVariant[camera.status] || 'neutral'}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
          <Section title="Live Preview">
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#111',
                aspectRatio: '16/9',
              }}
            >
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={camera.name}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <Box sx={{ height: '100%', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
                    Stream preview unavailable
                  </Typography>
                </Box>
              )}
            </Box>
          </Section>

          <Section title="Stream Details">
            <DetailRow label="Camera Name" value={camera.name} />
            <DetailRow label="Camera ID" value={camera.id} />
            <DetailRow label="RTSP URL" value={rtsp} multiline />
            <DetailRow label="Processing" value={camera.status === 'online' ? 'Active' : 'Inactive'} />
          </Section>

          <Box
            sx={{
              p: 2,
              borderRadius: '10px',
              backgroundColor: palette.warningBg,
              border: '1px solid #FFE082',
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', color: palette.warning, lineHeight: 1.6 }}>
              Camera processing starts immediately after save. Configure detection rules from the button below.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2.5, borderTop: `1px solid ${palette.borderLight}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<SettingsOutlinedIcon />}
            onClick={() => {
              onClose();
              navigateTo('detection-config', { cameraId: camera.id });
            }}
            sx={{ height: 44 }}
          >
            Detection Config
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => {
              onRemove(camera.id);
              onClose();
            }}
            sx={{ height: 44 }}
          >
            Remove Camera
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

function DetailRow({ label, value, multiline }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.75,
        borderBottom: `1px solid ${palette.borderLight}`,
        flexDirection: multiline ? 'column' : 'row',
      }}
    >
      <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: palette.textPrimary,
          textAlign: multiline ? 'left' : 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

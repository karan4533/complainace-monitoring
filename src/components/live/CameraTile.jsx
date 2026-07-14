import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import StatusBadge from '../common/StatusBadge';
import { palette } from '../../theme/theme';

export default function CameraTile({ camera, streamUrl, violationActive }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: violationActive ? `2px solid ${palette.error}` : `1px solid ${palette.borderLight}`,
        backgroundColor: violationActive ? palette.errorBg : palette.surface,
        transition: 'border-color 0.2s',
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#111' }}>
        {streamUrl ? (
          <iframe src={streamUrl} title={camera.name} style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>Stream offline</Typography>
          </Box>
        )}
        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 0.75 }}>
          <StatusBadge
            label={violationActive ? 'Violation Active' : (camera.status || 'offline').replace('_', ' ')}
            variant={violationActive ? 'error' : camera.status === 'online' ? 'success' : 'neutral'}
          />
        </Box>
      </Box>
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography
          fontWeight={600}
          fontSize="0.875rem"
          sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {camera.name}
        </Typography>
        <Typography variant="body2" sx={{ flexShrink: 0 }}>
          ID {camera.id}
        </Typography>
      </Box>
    </Paper>
  );
}

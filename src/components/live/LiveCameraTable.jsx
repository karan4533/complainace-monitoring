import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import StatusBadge from '../common/StatusBadge';
import { palette } from '../../theme/theme';

function isVideoFileUrl(url) {
  if (!url) return false;
  return url.startsWith('blob:') || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

function StreamPreview({ streamUrl, cameraName }) {
  const showVideoTag = isVideoFileUrl(streamUrl);
  return (
    <Box
      sx={{
        width: { xs: 120, sm: 160, md: 200 },
        aspectRatio: '16/9',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#111',
        border: `1px solid ${palette.borderLight}`,
      }}
    >
      {streamUrl ? (
        showVideoTag ? (
          <video
            src={streamUrl}
            title={cameraName}
            controls
            muted
            autoPlay
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <iframe
            src={streamUrl}
            title={cameraName}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )
      ) : (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.6875rem', textAlign: 'center' }}>
            Stream offline
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function LiveCameraTable({ cameras, resolveStreamUrl, activeCameraIds, pipelineLive }) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ borderRadius: '12px', overflowX: 'auto', maxWidth: '100%', border: `1px solid ${palette.borderLight}` }}
    >
      <Table sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: palette.background }}>
            {['ID', 'Camera', 'Live Feed', 'Stream', 'Alert'].map((heading) => (
              <TableCell key={heading} sx={{ py: 1.5, borderBottom: `1px solid ${palette.border}` }}>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {heading}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {cameras.map((camera) => {
            const violationActive = activeCameraIds.has(camera.id);
            const streamUrl = resolveStreamUrl(camera);
            const streamOnline = !!streamUrl && (pipelineLive || isVideoFileUrl(streamUrl));

            return (
              <TableRow
                key={camera.id}
                hover
                sx={{
                  backgroundColor: violationActive ? palette.errorBg : 'transparent',
                  borderLeft: violationActive ? `3px solid ${palette.error}` : '3px solid transparent',
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                <TableCell sx={{ width: 56, color: palette.textSecondary, fontWeight: 600 }}>
                  {camera.id}
                </TableCell>
                <TableCell sx={{ minWidth: 140 }}>
                  <Typography fontWeight={600} fontSize="0.875rem">
                    {camera.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: palette.textMuted }}>
                    {(camera.status || 'offline').replace('_', ' ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StreamPreview streamUrl={streamUrl} cameraName={camera.name} />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={streamOnline ? 'Live' : 'Offline'}
                    variant={streamOnline ? 'success' : 'neutral'}
                  />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={violationActive ? 'Violation Active' : 'Clear'}
                    variant={violationActive ? 'error' : 'success'}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

import React from 'react';
import { Box, List, ListItemButton, ListItemText, Paper, Typography } from '@mui/material';
import { palette } from '../../theme/theme';

export default function SopCameraList({ streams, configMap, selectedStreamId, onSelect }) {
  const configured = streams.filter((s) => (configMap.get(Number(s.id))?.sop_steps?.length ?? 0) > 0);
  const unconfigured = streams.filter((s) => !(configMap.get(Number(s.id))?.sop_steps?.length ?? 0));

  const renderItem = (stream) => {
    const cfg = configMap.get(Number(stream.id));
    const stepCount = cfg?.sop_steps?.length ?? 0;
    const selected = Number(selectedStreamId) === Number(stream.id);

    return (
      <ListItemButton
        key={stream.id}
        selected={selected}
        onClick={() => onSelect(stream.id)}
        sx={{
          borderRadius: '8px',
          mb: 0.5,
          py: 1.25,
          px: 1.5,
          '&.Mui-selected': {
            backgroundColor: palette.tagBg,
            borderLeft: `3px solid ${palette.primary}`,
            '&:hover': { backgroundColor: palette.tagBg },
          },
          '&:hover': { backgroundColor: palette.background },
        }}
      >
        <ListItemText
          primary={stream.name || `Stream ${stream.id}`}
          secondary={stepCount ? `${stepCount} step(s)` : 'Not configured'}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: selected ? 700 : 600,
            color: palette.textPrimary,
          }}
          secondaryTypographyProps={{
            fontSize: '0.75rem',
            color: stepCount ? palette.textSecondary : palette.textMuted,
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
        height: '100%',
        minHeight: { xs: 'auto', md: 480 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${palette.borderLight}` }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: palette.textPrimary }}>
          Configured cameras
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {configured.length > 0 && (
          <List disablePadding sx={{ mb: unconfigured.length ? 1.5 : 0 }}>
            {configured.map(renderItem)}
          </List>
        )}

        {unconfigured.length > 0 && (
          <>
            {configured.length > 0 && (
              <Typography
                variant="caption"
                sx={{ display: 'block', px: 1.5, mb: 0.75, color: palette.textMuted }}
              >
                Available cameras
              </Typography>
            )}
            <List disablePadding>{unconfigured.map(renderItem)}</List>
          </>
        )}

        {!streams.length && (
          <Typography sx={{ px: 1.5, py: 2, fontSize: '0.8125rem', color: palette.textMuted }}>
            No cameras available.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

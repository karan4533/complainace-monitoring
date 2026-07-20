import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { PPE_GEAR_OPTIONS } from '../../config/constants';
import { palette } from '../../theme/theme';

export default function DetectionTypeCards({ selectedIds, onChange }) {
  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(3, 1fr)',
        },
        gap: 1.5,
      }}
    >
      {PPE_GEAR_OPTIONS.map((gear) => {
        const active = selectedIds.includes(gear.id);
        return (
          <Paper
            key={gear.id}
            elevation={0}
            role="button"
            tabIndex={0}
            onClick={() => toggle(gear.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle(gear.id);
              }
            }}
            sx={{
              p: 2,
              borderRadius: '12px',
              cursor: 'pointer',
              border: `1.5px solid ${active ? palette.primary : palette.border}`,
              backgroundColor: active ? palette.tagBg : palette.surface,
              transition: 'border-color 0.15s, background-color 0.15s',
              outline: 'none',
              '&:hover': {
                borderColor: palette.primaryLight,
              },
              '&:focus-visible': {
                boxShadow: `0 0 0 2px ${palette.primary}33`,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              {active ? (
                <CheckCircleIcon sx={{ color: palette.primary, fontSize: 22, mt: 0.15 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ color: palette.textMuted, fontSize: 22, mt: 0.15 }} />
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: palette.textPrimary,
                    mb: 0.5,
                  }}
                >
                  {gear.label}
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary, lineHeight: 1.5 }}>
                  {gear.description}
                </Typography>
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}

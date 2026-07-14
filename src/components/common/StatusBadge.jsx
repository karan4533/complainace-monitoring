import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { palette } from '../../theme/theme';

const variants = {
  success: { bg: palette.successBg, color: palette.success, icon: CheckCircleOutlineIcon },
  error: { bg: palette.errorBg, color: palette.error, icon: ErrorOutlineIcon },
  tag: { bg: palette.tagBg, color: palette.tagText, icon: null },
  warning: { bg: palette.warningBg, color: palette.warning, icon: null },
  neutral: { bg: palette.borderLight, color: palette.textSecondary, icon: null },
};

export default function StatusBadge({ label, variant = 'neutral', icon: IconOverride }) {
  const style = variants[variant] || variants.neutral;
  const Icon = IconOverride || style.icon;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.4,
        borderRadius: '20px',
        backgroundColor: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {Icon && <Icon sx={{ fontSize: 14, flexShrink: 0 }} />}
      <Typography
        component="span"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'inherit',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

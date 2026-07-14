import React from 'react';
import { Box, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' },
            mb: 0.5,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="subtitle1"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.85rem', sm: '0.9375rem' },
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            '& > *': { width: { xs: '100%', sm: 'auto' } },
            '& .MuiBox-root': { width: { xs: '100%', sm: 'auto' } },
            '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
          }}
        >
          {action}
        </Box>
      )}
    </Box>
  );
}

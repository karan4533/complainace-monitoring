import React from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StatusBadge from '../common/StatusBadge';
import { palette } from '../../theme/theme';

export default function ViolationCard({ report, imageUrl, onSelect }) {
  return (
    <Paper
      elevation={0}
      onClick={() => onSelect?.(report)}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': onSelect
          ? { boxShadow: '0 4px 20px rgba(74, 55, 40, 0.1)', transform: 'translateY(-2px)' }
          : {},
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: { xs: 200, sm: 220 }, backgroundColor: '#1a1a1a' }}>
        <img
          src={imageUrl}
          alt="Violation frame"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
          <StatusBadge label={`${report.violations.length} violation(s)`} variant="error" />
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: palette.textPrimary, mb: 0.25 }}>
              Camera {report.stream_id}
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary }}>
              {report.timestamp}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(report);
            }}
            sx={{ color: palette.textMuted, mt: -0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {report.violations.map((v) => (
            <StatusBadge
              key={v.id}
              label={`${v.label} · ${(v.confidence * 100).toFixed(1)}%`}
              variant="tag"
            />
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

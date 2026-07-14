import React from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { palette } from '../../theme/theme';

export default function ReportToolbar({
  startDate,
  endDate,
  startTime,
  endTime,
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onDownload,
  downloading,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        flexWrap: 'wrap',
        gap: 2,
        alignItems: { xs: 'stretch', md: 'flex-end' },
        p: { xs: 1.75, sm: 2.5 },
        backgroundColor: palette.surface,
        borderRadius: '12px',
        border: `1px solid ${palette.borderLight}`,
        mb: 3,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 1.5,
          flex: 1,
          width: '100%',
        }}
      >
        <DateField label="From date" value={startDate} onChange={onStartDateChange} />
        <DateField label="From time (optional)" value={startTime} onChange={onStartTimeChange} type="time" muted />
        <DateField label="To date" value={endDate} onChange={onEndDateChange} />
        <DateField label="To time (optional)" value={endTime} onChange={onEndTimeChange} type="time" muted />
      </Box>

      <Button
        variant="contained"
        onClick={onDownload}
        disabled={downloading || !startDate || !endDate}
        startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
        sx={{
          height: 42,
          px: 2.5,
          whiteSpace: 'nowrap',
          width: { xs: '100%', md: 'auto' },
          flexShrink: 0,
        }}
      >
        {downloading ? 'Generating...' : 'Download PDF Report'}
      </Button>
    </Box>
  );
}

function DateField({ label, value, onChange, type = 'date', muted }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, width: '100%' }}>
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: muted ? palette.textMuted : palette.textSecondary,
        }}
      >
        {label}
      </Typography>
      <TextField
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        fullWidth
      />
    </Box>
  );
}

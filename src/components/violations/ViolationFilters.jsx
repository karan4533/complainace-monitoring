import React from 'react';
import {
  Box,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { SEVERITY_LEVELS } from '../../config/constants';
import { palette } from '../../theme/theme';

export default function ViolationFilters({ filters, onChange, cameras }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: '12px',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' },
        gap: 1.5,
      }}
    >
      <FilterSelect label="Camera" value={filters.cameraId} onChange={(v) => set('cameraId', v)}>
        <MenuItem value="">All cameras</MenuItem>
        {cameras.map((c) => (
          <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
        ))}
      </FilterSelect>

      <FilterSelect label="Zone" value={filters.zone} onChange={(v) => set('zone', v)}>
        <MenuItem value="all">All zones</MenuItem>
        <MenuItem value="Full frame">Full frame</MenuItem>
      </FilterSelect>

      <FilterSelect label="Type" value={filters.type} onChange={(v) => set('type', v)}>
        <MenuItem value="all">All types</MenuItem>
        <MenuItem value="hardhat">Hard Hat</MenuItem>
        <MenuItem value="vest">Vest</MenuItem>
        <MenuItem value="mask">Mask</MenuItem>
      </FilterSelect>

      <FilterSelect label="Severity" value={filters.severity} onChange={(v) => set('severity', v)}>
        <MenuItem value="all">All severities</MenuItem>
        {SEVERITY_LEVELS.map((s) => (
          <MenuItem key={s} value={s}>{s}</MenuItem>
        ))}
      </FilterSelect>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="From"
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={filters.startDate}
          onChange={(e) => set('startDate', e.target.value)}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={filters.endDate}
          onChange={(e) => set('endDate', e.target.value)}
        />
      </Box>
    </Paper>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: palette.textMuted, mb: 0.5 }}>{label}</Typography>
      <TextField select size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </TextField>
    </Box>
  );
}

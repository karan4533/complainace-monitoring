import React from 'react';
import {
  Box,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { palette } from '../../theme/theme';

export default function SopEventFilters({
  streams,
  personIds,
  streamId,
  objectId,
  onlyAlerts,
  onStreamChange,
  onPersonChange,
  onOnlyAlertsChange,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: '12px',
        mb: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: 1.5,
        alignItems: 'end',
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: palette.textSecondary, mb: 0.5 }}>
          Camera
        </Typography>
        <TextField select size="small" fullWidth value={streamId} onChange={(e) => onStreamChange(e.target.value)}>
          <MenuItem value="">All cameras</MenuItem>
          {streams.map((s) => (
            <MenuItem key={s.id} value={String(s.id)}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: palette.textSecondary, mb: 0.5 }}>
          Person
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          value={objectId}
          onChange={(e) => onPersonChange(e.target.value)}
          disabled={!personIds.length}
        >
          <MenuItem value="">All persons</MenuItem>
          {personIds.map((id) => (
            <MenuItem key={id} value={String(id)}>
              Person #{id}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <FormControlLabel
        control={
          <Checkbox checked={onlyAlerts} onChange={(e) => onOnlyAlertsChange(e.target.checked)} />
        }
        label="Alerts only (skipped, out of order, overdue)"
        sx={{ m: 0, alignSelf: 'center' }}
      />
    </Paper>
  );
}

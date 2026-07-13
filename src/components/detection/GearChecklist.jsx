import React from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Typography,
} from '@mui/material';
import { PPE_GEAR_OPTIONS } from '../../config/constants';
import { palette } from '../../theme/theme';

export default function GearChecklist({ selectedGear, onChange }) {
  const toggle = (id) => {
    if (selectedGear.includes(id)) onChange(selectedGear.filter((g) => g !== id));
    else onChange([...selectedGear, id]);
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', mb: 3 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1.5 }}>
        Enforced PPE Gear
      </Typography>
      <FormGroup>
        {PPE_GEAR_OPTIONS.map((gear) => (
          <FormControlLabel
            key={gear.id}
            control={<Checkbox checked={selectedGear.includes(gear.id)} onChange={() => toggle(gear.id)} />}
            label={gear.label}
          />
        ))}
      </FormGroup>
      <Typography variant="body2" sx={{ mt: 1, color: palette.textMuted }}>
        Select which gear violations should be enforced for this camera.
      </Typography>
    </Paper>
  );
}

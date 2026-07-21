import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { palette } from '../../theme/theme';

const QUICK_STEPS = [
  'check person wearing gloves',
  'check person wearing vest',
  'check person wearing hard hat',
  'check person wearing face mask',
  'check person wearing safety goggles',
  'check person wearing safety boots',
];

export default function SopSequenceEditor({
  stream,
  streamId,
  stepsText,
  onStepsChange,
  onSave,
  onDelete,
  saving,
  deleting,
  error,
  isExisting,
}) {
  const appendStep = (line) => {
    const trimmed = stepsText.trim();
    onStepsChange(trimmed ? `${trimmed}\n${line}` : line);
  };

  if (!stream) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: '12px',
          border: `1px solid ${palette.border}`,
          backgroundColor: palette.surface,
          p: 4,
          minHeight: { xs: 280, md: 480 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ color: palette.textMuted, textAlign: 'center', maxWidth: 320 }}>
          Select a camera from the list to configure its SOP sequence.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.surface,
        p: { xs: 2, sm: 2.5 },
        minHeight: { xs: 'auto', md: 480 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: palette.textPrimary, mb: 0.5 }}>
        SOP Sequence Configuration — per camera
      </Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: palette.textSecondary, mb: 2.5, lineHeight: 1.6 }}>
        Each camera runs an independent sequence. The line order in the text area is the order the pipeline
        enforces for every person tracked on that stream.
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box sx={{ minWidth: 120 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: palette.textSecondary, mb: 0.5 }}>
            Stream ID
          </Typography>
          <TextField
            size="small"
            value={streamId}
            InputProps={{ readOnly: true }}
            sx={{
              width: 100,
              '& .MuiInputBase-input': { fontWeight: 700, color: palette.textPrimary },
            }}
          />
        </Box>
        <Box sx={{ alignSelf: 'flex-end', pb: 0.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: palette.textMuted }}>
            {isExisting ? 'Editing existing camera' : 'New configuration'}
          </Typography>
        </Box>
      </Box>

      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: palette.textSecondary, mb: 0.75 }}>
        SOP steps, in order (one per line)
      </Typography>
      <TextField
        multiline
        minRows={8}
        maxRows={14}
        fullWidth
        placeholder={'check person wearing gloves\ncheck person wearing vest'}
        value={stepsText}
        onChange={(e) => onStepsChange(e.target.value)}
        sx={{
          mb: 1.5,
          '& .MuiOutlinedInput-root': {
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            backgroundColor: palette.background,
          },
        }}
      />

      <Typography sx={{ fontSize: '0.75rem', color: palette.textMuted, mb: 1 }}>
        Quick insert:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
        {QUICK_STEPS.map((step) => (
          <Chip
            key={step}
            label={step}
            size="small"
            onClick={() => appendStep(step)}
            sx={{
              backgroundColor: palette.tagBg,
              color: palette.tagText,
              fontSize: '0.7rem',
              '&:hover': { backgroundColor: palette.border },
            }}
          />
        ))}
      </Box>

      {error && (
        <Typography sx={{ fontSize: '0.8125rem', color: palette.error, mb: 1.5 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 'auto' }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
          onClick={onSave}
          disabled={saving || deleting}
          sx={{ height: 42, px: 2.5, flex: { xs: 1, sm: 'none' }, minWidth: 200 }}
        >
          {saving ? 'Saving...' : isExisting ? 'Update SOP Sequence' : 'Save SOP Sequence'}
        </Button>
        {isExisting && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onDelete}
            disabled={saving || deleting}
            sx={{ height: 42 }}
          >
            {deleting ? 'Deleting...' : 'Delete SOP Sequence'}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

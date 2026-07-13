import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StatusBadge from '../common/StatusBadge';
import { navigateTo } from '../../config/routes';
import { palette } from '../../theme/theme';

const statusVariant = {
  online: 'success',
  offline: 'neutral',
  violation_active: 'error',
};

export default function CameraTable({ cameras, onAdd, onRemove, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !rtspUrl.trim()) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), rtspUrl: rtspUrl.trim() });
      setName('');
      setRtspUrl('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Camera
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: palette.background }}>
              {['Camera', 'RTSP URL', 'Status', 'Actions'].map((h) => (
                <TableCell key={h}>
                  <Typography variant="caption">{h}</Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {cameras.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No cameras configured. Add an RTSP camera to begin.</Typography>
                </TableCell>
              </TableRow>
            )}
            {cameras.map((camera) => (
              <TableRow
                key={camera.id}
                hover
                onClick={() => onSelect?.(camera)}
                sx={{ cursor: onSelect ? 'pointer' : 'default' }}
              >
                <TableCell>
                  <Typography fontWeight={600}>{camera.name}</Typography>
                  <Typography variant="body2">ID: {camera.id}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {camera.rtsp_url || camera.rtspUrl}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={(camera.status || 'offline').replace('_', ' ')}
                    variant={statusVariant[camera.status] || 'neutral'}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="small"
                    onClick={() => navigateTo('detection-config', { cameraId: camera.id })}
                    title="Detection config"
                  >
                    <SettingsOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onRemove(camera.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onSelect?.(camera)} title="View details">
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Camera</DialogTitle>
        <DialogContent>
          <TextField label="Camera name" fullWidth margin="normal" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="RTSP URL"
            fullWidth
            margin="normal"
            placeholder="rtsp://user:pass@host:554/stream"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
          />
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Camera processing starts immediately after save.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Start'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import React from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StatusBadge from '../common/StatusBadge';
import { frameKey } from '../../utils/reportUtils';
import { palette } from '../../theme/theme';

export default function ViolationFramesTable({ frames, imageUrl, onSelect }) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ borderRadius: '12px', overflowX: 'auto' }}
    >
      <Table sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: palette.background }}>
            {['Snapshot', 'Camera ID', 'Violations', 'Types', 'Timestamp', ''].map((h) => (
              <TableCell key={h || 'action'}>
                <Typography variant="caption">{h}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {frames.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                <Typography color="text.secondary">No violation reports available.</Typography>
              </TableCell>
            </TableRow>
          )}
          {frames.map((frame) => (
            <TableRow
              key={frameKey(frame)}
              hover
              onClick={() => onSelect(frame)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Box
                  component="img"
                  src={imageUrl(frame)}
                  alt="Violation snapshot"
                  sx={{
                    width: 96,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: '#111',
                    display: 'block',
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography fontWeight={700} fontSize="0.9rem">
                  {frame.stream_id}
                </Typography>
              </TableCell>
              <TableCell>
                <StatusBadge
                  label={`${frame.violations.length} in frame`}
                  variant="error"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxWidth: 280 }}>
                  {frame.violations.map((v) => (
                    <StatusBadge
                      key={v.id}
                      label={`${v.label} · ${(v.confidence * 100).toFixed(1)}%`}
                      variant="tag"
                    />
                  ))}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  {frame.timestamp}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSelect(frame); }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StatusBadge from '../common/StatusBadge';
import { frameKey } from '../../utils/reportUtils';
import { palette } from '../../theme/theme';

export default function ViolationFramesTable({ frames, imageUrl, onSelect }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {frames.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
            <Typography color="text.secondary">No violation reports available.</Typography>
          </Paper>
        )}
        {frames.map((frame) => (
          <Paper
            key={frameKey(frame)}
            elevation={0}
            onClick={() => onSelect(frame)}
            sx={{
              borderRadius: '12px',
              overflow: 'hidden',
              cursor: 'pointer',
              '&:active': { opacity: 0.92 },
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, p: 1.5 }}>
              <Box
                component="img"
                src={imageUrl(frame)}
                alt="Violation snapshot"
                sx={{
                  width: 88,
                  height: 64,
                  objectFit: 'cover',
                  borderRadius: '8px',
                  backgroundColor: '#111',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Typography fontWeight={700} fontSize="0.9rem">
                    Camera {frame.stream_id}
                  </Typography>
                  <StatusBadge label={`${frame.violations.length}`} variant="error" />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: palette.textSecondary,
                    fontSize: '0.75rem',
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {frame.timestamp}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {frame.violations.slice(0, 3).map((v) => (
                    <StatusBadge key={v.id} label={v.label} variant="tag" />
                  ))}
                </Box>
              </Box>
              <IconButton size="small" sx={{ alignSelf: 'center' }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  }

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ borderRadius: '12px', overflowX: 'auto', maxWidth: '100%' }}
    >
      <Table sx={{ minWidth: 680 }}>
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
                    width: { sm: 80, md: 96 },
                    height: { sm: 54, md: 64 },
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
                <StatusBadge label={`${frame.violations.length} in frame`} variant="error" />
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
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(frame);
                  }}
                >
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

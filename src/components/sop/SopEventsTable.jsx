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
import { sopEventTypeLabel, sopEventTypeVariant } from '../../utils/sopEventUtils';
import { palette } from '../../theme/theme';

export default function SopEventsTable({ events, imageUrl, onSelect }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {!events.length && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
            <Typography color="text.secondary">No SOP events recorded yet.</Typography>
          </Paper>
        )}
        {events.map((event) => (
          <Paper
            key={event.id}
            elevation={0}
            onClick={() => onSelect(event)}
            sx={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, p: 1.5 }}>
              <Box
                component="img"
                src={imageUrl(event)}
                alt="SOP snapshot"
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography fontWeight={700} fontSize="0.9rem">
                    Camera {event.stream_id}
                  </Typography>
                  <StatusBadge
                    label={sopEventTypeLabel(event.event_type)}
                    variant={sopEventTypeVariant(event.event_type)}
                  />
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: palette.textSecondary, mt: 0.5 }}>
                  {event.timestamp}
                </Typography>
                {event.object_id != null && (
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.25 }}>
                    Person #{event.object_id}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    mt: 0.75,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.step_text || '—'}
                </Typography>
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
      <Table sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: palette.background }}>
            {['Snapshot', 'Camera', 'Person', 'Event', 'SOP Step', 'Timestamp', ''].map((h) => (
              <TableCell key={h || 'action'}>
                <Typography variant="caption">{h}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {!events.length && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                <Typography color="text.secondary">No SOP events recorded yet.</Typography>
              </TableCell>
            </TableRow>
          )}
          {events.map((event) => (
            <TableRow key={event.id} hover onClick={() => onSelect(event)} sx={{ cursor: 'pointer' }}>
              <TableCell>
                <Box
                  component="img"
                  src={imageUrl(event)}
                  alt="SOP snapshot"
                  sx={{
                    width: 80,
                    height: 54,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    backgroundColor: '#111',
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography fontWeight={700}>{event.stream_id}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {event.object_id != null ? `#${event.object_id}` : '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <StatusBadge
                  label={sopEventTypeLabel(event.event_type)}
                  variant={sopEventTypeVariant(event.event_type)}
                />
              </TableCell>
              <TableCell sx={{ maxWidth: 240 }}>
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {event.step_text || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                  {event.timestamp}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSelect(event); }}>
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

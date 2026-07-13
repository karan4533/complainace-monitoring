import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import StatusBadge from '../common/StatusBadge';
import { SEVERITY_COLORS } from '../../config/constants';
import { navigateTo } from '../../config/routes';
import { violationImageUrl } from '../../utils/violationUtils';
import { palette } from '../../theme/theme';

export default function ViolationsTable({ violations, onAcknowledge, acknowledgingId }) {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: palette.background }}>
            {['Snapshot', 'Camera', 'Zone', 'Type', 'Severity', 'Time', 'VLM Report', ''].map((h) => (
              <TableCell key={h || 'actions'}>
                <Typography variant="caption">{h}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {violations.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                <Typography color="text.secondary">No violations match the current filters.</Typography>
              </TableCell>
            </TableRow>
          )}
          {violations.map((v) => {
            const sev = SEVERITY_COLORS[v.severity] || SEVERITY_COLORS.low;
            return (
              <TableRow
                key={v.id}
                hover
                sx={{ cursor: 'pointer', opacity: v.acknowledged ? 0.65 : 1 }}
                onClick={() => navigateTo('violation-detail', { id: v.id })}
              >
                <TableCell>
                  <Box
                    component="img"
                    src={violationImageUrl(v)}
                    alt="snapshot"
                    sx={{ width: 72, height: 48, objectFit: 'cover', borderRadius: '6px', backgroundColor: '#111' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography fontWeight={600} fontSize="0.875rem">{v.cameraName}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2">{v.zone}</Typography></TableCell>
                <TableCell><StatusBadge label={v.type} variant="tag" /></TableCell>
                <TableCell>
                  <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: '20px', backgroundColor: sev.bg }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: sev.color, textTransform: 'capitalize' }}>
                      {v.severity}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell><Typography variant="body2">{v.timestamp}</Typography></TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  {v.vlmPending ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={14} />
                      <Typography variant="body2" color="text.secondary">Generating...</Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.vlmReport}
                    </Typography>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    variant={v.acknowledged ? 'text' : 'outlined'}
                    disabled={v.acknowledged || acknowledgingId === v.id}
                    startIcon={v.acknowledged ? <CheckCircleOutlineIcon /> : null}
                    onClick={() => onAcknowledge(v.id)}
                  >
                    {v.acknowledged ? 'Reviewed' : 'Acknowledge'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

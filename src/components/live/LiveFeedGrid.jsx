import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import StatusBadge from '../common/StatusBadge';
import { palette } from '../../theme/theme';

function FeedCard({ feed, violationActive }) {
  const feedUrl = feed.stream_url || feed.streamUrl || '';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: violationActive ? `2px solid ${palette.error}` : `1px solid ${palette.borderLight}`,
        backgroundColor: violationActive ? palette.errorBg : palette.surface,
      }}
    >
      <Box sx={{ aspectRatio: '16/9', backgroundColor: '#111', position: 'relative' }}>
        {feedUrl ? (
          <iframe
            src={feedUrl}
            title={feed.name}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="autoplay; encrypted-media"
          />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
              Feed unavailable
            </Typography>
          </Box>
        )}

        <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
          <StatusBadge
            label={violationActive ? 'Violation Active' : (feed.status || 'online').replace('_', ' ')}
            variant={violationActive ? 'error' : feedUrl ? 'success' : 'neutral'}
          />
        </Box>
      </Box>

      <Box sx={{ px: 1.5, py: 1.25, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Typography fontWeight={600} fontSize="0.875rem" noWrap>
          {feed.name}
        </Typography>
        <Typography variant="body2" sx={{ color: palette.textSecondary, flexShrink: 0 }}>
          ID {feed.id}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function LiveFeedGrid({ feeds, activeCameraIds }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
          xl: 'repeat(4, minmax(0, 1fr))',
        },
      }}
    >
      {feeds.map((feed) => (
        <FeedCard key={feed.id} feed={feed} violationActive={activeCameraIds.has(feed.id)} />
      ))}
    </Box>
  );
}

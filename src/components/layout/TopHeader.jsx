import React from 'react';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import StatusBadge from '../common/StatusBadge';
import HeuristicLogo from '../common/HeuristicLogo';
import { palette } from '../../theme/theme';
import { DRAWER_WIDTH } from './Sidebar';

export default function TopHeader({ pipelineLive, onMenuClick, showMenuButton }) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        backgroundColor: palette.background,
        borderBottom: `1px solid ${palette.borderLight}`,
        color: palette.textPrimary,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 }, gap: 2 }}>
        {showMenuButton && (
          <IconButton edge="start" onClick={onMenuClick} sx={{ color: palette.textPrimary, mr: -0.5 }}>
            <MenuIcon />
          </IconButton>
        )}

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.5,
            borderRadius: '20px',
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.surface,
          }}
        >
          <HeuristicLogo size={22} variant="dark" />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: palette.textPrimary }}>
            Heuristic Labs
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <StatusBadge
            label={pipelineLive ? 'Pipeline Operational' : 'Pipeline Idle'}
            variant={pipelineLive ? 'success' : 'neutral'}
          />
          <IconButton size="small" sx={{ color: palette.textMuted }}>
            <NotificationsNoneOutlinedIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

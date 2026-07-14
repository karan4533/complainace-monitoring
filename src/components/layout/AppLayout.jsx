import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import TopHeader from './TopHeader';
import { palette } from '../../theme/theme';

export default function AppLayout({ children, activePage, pipelineLive = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: palette.background }}>
      <CssBaseline />
      <Sidebar activePage={activePage} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <TopHeader
        pipelineLive={pipelineLive}
        showMenuButton={isMobile}
        onMenuClick={() => setMobileOpen(true)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          maxWidth: '100%',
          minWidth: 0,
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Box
          sx={{
            px: { xs: 1.5, sm: 3, md: 4 },
            pb: { xs: 3, md: 4 },
            pt: { xs: 1, sm: 2 },
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

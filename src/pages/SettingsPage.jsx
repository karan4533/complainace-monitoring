import React from 'react';
import { Box, Typography } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';

export default function SettingsPage() {
  return (
    <AppLayout activePage="settings">
      <PageHeader title="Settings" subtitle="Application configuration" />
      <Box
        sx={{
          mt: 2,
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography color="text.secondary">
          Settings will be available in a future release.
        </Typography>
      </Box>
    </AppLayout>
  );
}

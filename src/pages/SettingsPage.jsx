import React from 'react';
import { Paper, Typography } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';

export default function SettingsPage() {
  return (
    <AppLayout activePage="settings">
      <PageHeader title="Settings" subtitle="Application configuration" />
      <Paper elevation={0} sx={{ p: 3, borderRadius: '12px' }}>
        <Typography color="text.secondary">
          Settings will be available in a future release.
        </Typography>
      </Paper>
    </AppLayout>
  );
}

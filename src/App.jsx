import React, { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { useHashRoute } from './hooks/useHashRoute';
import { navigateTo } from './config/routes';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CamerasPage from './pages/CamerasPage';
import DetectionInputsPage from './pages/DetectionInputsPage';
import ViolationsPage from './pages/ViolationsPage';
import ViolationDetailPage from './pages/ViolationDetailPage';
import SopReportsPage from './pages/SopReportsPage';


export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const route = useHashRoute();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && route.page !== 'login') navigateTo('login');
      if (isAuthenticated && route.page === 'login') navigateTo('dashboard');
    }
  }, [loading, isAuthenticated, route.page]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  switch (route.page) {
    case 'dashboard':
      return <DashboardPage />;
    case 'add-stream':
      return <CamerasPage />;
    case 'input-config':
      return <DetectionInputsPage />;
    case 'reports':
      return <ViolationsPage />;
    case 'sop-reports':
      return <SopReportsPage />;
    case 'violation-detail':
      return <ViolationDetailPage id={route.params.id} />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

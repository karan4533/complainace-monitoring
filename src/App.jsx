import React from 'react';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  const isReportPage = window.location.hash === '#/reports';
  return isReportPage ? <ReportsPage /> : <DashboardPage />;
}

import React, { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import ReportToolbar from '../components/reports/ReportToolbar';
import ViolationFramesTable from '../components/violations/ViolationFramesTable';
import ViolationDrawer from '../components/reports/ViolationDrawer';
import { API_BASE } from '../config/api';
import { useViolationFrames } from '../hooks/useViolationFrames';
import { downloadPdfReport } from '../services/reportService';
import { toBackendDate } from '../utils/reportUtils';

export default function ViolationsPage() {
  const { frames, loading } = useViolationFrames();
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const filteredFrames = frames;

  const imageUrl = (frame) =>
    `${API_BASE}/stored_images/${frame.image_path.split('/').pop()}`;

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert('Please select both a start and end date.');
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      setDownloadingPdf(true);
      const blob = await downloadPdfReport({
        startDate: toBackendDate(startDate),
        endDate: toBackendDate(endDate),
        startTime,
        endTime,
        signal: controller.signal,
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ppe_report_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err.message || 'PDF download failed.');
    } finally {
      clearTimeout(timeoutId);
      setDownloadingPdf(false);
    }
  };

  return (
    <AppLayout activePage="reports">
      <PageHeader
        title="PPE Violation Reports"
        subtitle={`${filteredFrames.length} captured frame${filteredFrames.length !== 1 ? 's' : ''} · click a row for full details`}
      />

      <ReportToolbar
        startDate={startDate}
        endDate={endDate}
        startTime={startTime}
        endTime={endTime}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        onDownload={handleDownload}
        downloading={downloadingPdf}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ViolationFramesTable
          frames={filteredFrames}
          imageUrl={imageUrl}
          onSelect={setSelectedFrame}
        />
      )}

      <ViolationDrawer
        report={selectedFrame}
        imageUrl={selectedFrame ? imageUrl(selectedFrame) : ''}
        open={!!selectedFrame}
        onClose={() => setSelectedFrame(null)}
      />
    </AppLayout>
  );
}

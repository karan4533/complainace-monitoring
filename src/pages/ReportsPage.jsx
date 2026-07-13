import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import ReportToolbar from '../components/reports/ReportToolbar';
import ViolationCard from '../components/reports/ViolationCard';
import ViolationDrawer from '../components/reports/ViolationDrawer';
import { API_BASE, WS_BASE } from '../config/api';
import { downloadPdfReport, fetchReports } from '../services/reportService';
import { frameKey, mergeFlatEntriesIntoGroups, toBackendDate } from '../utils/reportUtils';
import { palette } from '../theme/theme';

const MAX_FRAMES = 100;

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleDownloadReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both a start and end date.');
      return;
    }
    if (endDate < startDate) {
      alert('End date cannot be before start date.');
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
      console.error('PDF download failed:', err);
      if (err.name === 'AbortError') {
        alert('Report generation took too long and timed out. Try a smaller date range.');
      } else {
        alert(`Failed to download report: ${err.message}`);
      }
    } finally {
      clearTimeout(timeoutId);
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let updateInterval;
    let messageBuffer = [];

    const hydrateReports = async () => {
      try {
        const data = await fetchReports(MAX_FRAMES);
        const groupedHistory = mergeFlatEntriesIntoGroups(data.reverse(), []);
        setReports(groupedHistory.slice(0, MAX_FRAMES));
      } catch (error) {
        console.error('Error fetching reports:', error);
      }
    };

    const connectSocket = () => {
      socket = new WebSocket(`${WS_BASE}/ws/violations`);

      socket.onmessage = (event) => {
        const newEntry = JSON.parse(event.data);
        messageBuffer.unshift(newEntry);
      };

      socket.onclose = () => {
        reconnectTimer = setTimeout(connectSocket, 2000);
      };
      socket.onerror = () => {
        socket.close();
      };
    };

    updateInterval = setInterval(() => {
      if (messageBuffer.length === 0) return;
      const toMerge = messageBuffer;
      messageBuffer = [];
      setReports((prev) => mergeFlatEntriesIntoGroups(toMerge, prev).slice(0, MAX_FRAMES));
    }, 1000);

    hydrateReports();
    connectSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (updateInterval) clearInterval(updateInterval);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  const imageUrl = (report) =>
    `${API_BASE}/stored_images/${report.image_path.split('/').pop()}`;

  return (
    <AppLayout activePage="reports">
      <PageHeader
        title="Violation Reports"
        subtitle={`${reports.length} captured frame${reports.length !== 1 ? 's' : ''} · live updates enabled`}
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
        onDownload={handleDownloadReport}
        downloading={downloadingPdf}
      />

      {reports.length === 0 ? (
        <Box
          sx={{
            height: { xs: '50vh', md: '60vh' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: palette.surface,
            borderRadius: '12px',
            border: `1px solid ${palette.borderLight}`,
          }}
        >
          <AssessmentOutlinedIcon sx={{ fontSize: 48, color: palette.textMuted, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ color: palette.textSecondary, fontWeight: 600 }}>
            No Reports Available
          </Typography>
          <Typography sx={{ color: palette.textMuted, fontSize: '0.875rem', mt: 0.5 }}>
            Violations will appear here as they are detected
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(320px, 1fr))',
              lg: 'repeat(auto-fill, minmax(380px, 1fr))',
            },
            gap: 2.5,
          }}
        >
          {reports.map((report) => (
            <ViolationCard
              key={frameKey(report)}
              report={report}
              imageUrl={imageUrl(report)}
              onSelect={setSelectedReport}
            />
          ))}
        </Box>
      )}

      <ViolationDrawer
        report={selectedReport}
        imageUrl={selectedReport ? imageUrl(selectedReport) : ''}
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </AppLayout>
  );
}

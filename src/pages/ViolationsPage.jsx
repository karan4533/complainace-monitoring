import React, { useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from '@mui/material';
import AppLayout from '../components/layout/AppLayout';
import PageHeader from '../components/common/PageHeader';
import ReportToolbar from '../components/reports/ReportToolbar';
import ViolationFramesTable from '../components/violations/ViolationFramesTable';
import ViolationDrawer from '../components/reports/ViolationDrawer';
import { API_BASE } from '../config/api';
import { useViolationFrames } from '../hooks/useViolationFrames';
import { downloadPdfReport } from '../services/reportService';
import { filterReportFrames, toBackendDate } from '../utils/reportUtils';
import { getDefaultReportDateRange } from '../data/mockReports';
import { palette } from '../theme/theme';

const defaultRange = getDefaultReportDateRange();

export default function ViolationsPage() {
  const { frames, loading, error } = useViolationFrames();
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [startTime, setStartTime] = useState(defaultRange.startTime);
  const [endTime, setEndTime] = useState(defaultRange.endTime);
  const [cameraId, setCameraId] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const cameras = useMemo(() => {
    const map = new Map();
    frames.forEach((frame) => {
      if (!map.has(frame.stream_id)) {
        map.set(frame.stream_id, { id: frame.stream_id, name: `Camera ${frame.stream_id}` });
      }
    });
    return Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id));
  }, [frames]);

  const filteredFrames = useMemo(
    () =>
      filterReportFrames(frames, {
        startDate,
        endDate,
        startTime,
        endTime,
        cameraId,
      }),
    [frames, startDate, endDate, startTime, endTime, cameraId]
  );

  const imageUrl = (frame) => {
    const filename = frame.image_path?.split('/').pop() || '';
    if (!filename) return '';
    return `${API_BASE}/stored_images/${filename}`;
  };

  const handleDownload = async () => {
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
      alert(err.message || 'PDF download failed. Check backend connectivity.');
    } finally {
      clearTimeout(timeoutId);
      setDownloadingPdf(false);
    }
  };

  return (
    <AppLayout activePage="reports">
      <PageHeader
        title="PPE Violation Reports"
        subtitle={`${filteredFrames.length} of ${frames.length} frame${frames.length !== 1 ? 's' : ''} · filtered by date/time`}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && !frames.length && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No PPE violations yet. Start the pipeline, then detections will appear here and update live.
        </Alert>
      )}

      <Box
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'flex-end',
        }}
      >
        <Box sx={{ minWidth: { xs: '100%', sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: palette.textSecondary, mb: 0.5 }}>
            Camera
          </Typography>
          <TextField
            select
            size="small"
            fullWidth
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
          >
            <MenuItem value="">All cameras</MenuItem>
            {cameras.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

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

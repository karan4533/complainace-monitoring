import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { API_BASE, WS_BASE } from '../config/api';
import { downloadPdfReport, fetchReports } from '../services/reportService';
import { buildSummary, frameKey, mergeFlatEntriesIntoGroups, toBackendDate } from '../utils/reportUtils';

const MAX_FRAMES = 100;

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  return (
    <>
      <CssBaseline />
      <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f5f7fa', p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
          PPE Violation Reports
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            alignItems: 'flex-end',
            mb: 4,
            p: 2.5,
            backgroundColor: '#ffffff',
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>From date</Typography>
              <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" sx={{ width: 170 }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>From time (optional)</Typography>
              <TextField type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} size="small" sx={{ width: 140 }} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>To date</Typography>
              <TextField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" sx={{ width: 170 }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>To time (optional)</Typography>
              <TextField type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} size="small" sx={{ width: 140 }} />
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={handleDownloadReport}
            disabled={downloadingPdf || !startDate || !endDate}
            startIcon={downloadingPdf ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, boxShadow: 'none', height: 40 }}
          >
            {downloadingPdf ? 'Generating...' : 'Download PDF Report'}
          </Button>
        </Box>

        {reports.length === 0 ? (
          <Box sx={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ color: '#94a3b8', fontWeight: 500 }}>
              No Report Available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 3 }}>
            {reports.map((report) => (
              <Paper key={frameKey(report)} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <Box sx={{ width: '100%', height: 260, backgroundColor: '#000' }}>
                  <img
                    src={`${API_BASE}/stored_images/${report.image_path.split('/').pop()}`}
                    alt="Violation"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {report.violations.map((v) => (
                      <Chip
                        key={v.id}
                        label={`${v.label} · ${(v.confidence * 100).toFixed(1)}%`}
                        sx={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}
                      />
                    ))}
                  </Box>
                  <Typography sx={{ mb: 1 }}>
                    <strong>Camera ID:</strong> {report.stream_id}
                  </Typography>
                  <Typography sx={{ mb: 1 }}>
                    <strong>Violations in frame:</strong> {report.violations.length}
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    <strong>Timestamp:</strong> {report.timestamp}
                  </Typography>

                  <Accordion
                    elevation={0}
                    sx={{
                      backgroundColor: '#f8fafc',
                      boxShadow: 'none',
                      borderRadius: 2,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight={600}>Show Summary</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography sx={{ color: '#374151', lineHeight: 1.8 }}>{buildSummary(report)}</Typography>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}

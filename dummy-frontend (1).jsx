import React, { useState, useEffect, useRef } from 'react';
import {
  Box, AppBar, Toolbar, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, CssBaseline, Paper, Button, CircularProgress, Chip,
  TextField, MenuItem, Select, InputLabel, FormControl, IconButton, Divider
} from '@mui/material';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxIcon from '@mui/icons-material/AddBox';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
const drawerWidth = 110;

const HOST     = window.location.hostname;
const API_BASE = `http://${HOST}:8000`;
const WS_BASE  = `ws://${HOST}:8000`;

const frameKey = (r) => `${r.timestamp}__${r.stream_id}__${r.image_path}`;

function mergeFlatEntriesIntoGroups(flatEntries, existingGroups) {
  const groups = [...existingGroups];
  const indexByKey = new Map(groups.map((g, i) => [frameKey(g), i]));

  for (const entry of flatEntries) {
    const key = `${entry.timestamp}__${entry.stream_id}__${entry.image_path}`;
    const violation = { id: entry.id, label: entry.label, confidence: entry.confidence };

    if (indexByKey.has(key)) {
      const idx = indexByKey.get(key);
      const already = groups[idx].violations.some((v) => v.id === violation.id);
      if (!already) {
        groups[idx] = {
          ...groups[idx],
          violations: [...groups[idx].violations, violation],
        };
      }
    } else {
      const newGroup = {
        timestamp: entry.timestamp,
        stream_id: entry.stream_id,
        image_path: entry.image_path,
        violations: [violation],
      };
      groups.unshift(newGroup);
      indexByKey.set(key, 0);
      for (const [k, i] of indexByKey) {
        if (k !== key) indexByKey.set(k, i + 1);
      }
    }
  }

  return groups;
}

function buildSummary(report) {
  const helmet_viol = report.violations.filter(v => v.label.toLowerCase().includes("hardhat")).length;
  const vest_viol = report.violations.filter(v => v.label.toLowerCase().includes("vest")).length;
  const mask_viol = report.violations.filter(v => v.label.toLowerCase().includes("mask")).length;
  return `At ${report.timestamp} on Stream ${report.stream_id}, there were ${helmet_viol} Hard Hat violation(s), ${vest_viol} Vest violation(s), and ${mask_viol} Mask violation(s) detected in this frame.`;
}

// event_type -> display info for SOP report cards.
// 'completed' = normal progress (not an alert).
// 'skipped' / 'out_of_order' / 'overdue' = alert-worthy deviations.
const SOP_EVENT_META = {
  completed:     { label: 'COMPLETED',    bg: '#dcfce7', color: '#15803d' },
  skipped:       { label: 'SKIPPED',      bg: '#fee2e2', color: '#b91c1c' },
  out_of_order:  { label: 'OUT OF ORDER', bg: '#fef3c7', color: '#b45309' },
  overdue:       { label: 'OVERDUE',      bg: '#fee2e2', color: '#b91c1c' },
};

export default function App() {
  const [streamUrl, setStreamUrl]             = useState(null);
  const [pipelineStarted, setPipelineStarted] = useState(false);
  const [reports, setReports]                 = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [pipelineStatus, setPipelineStatus]   = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime]     = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const isReportPage = window.location.hash === '#/reports';
  const pollRef = useRef(null);

  // --- SOP: multi-stream config state ---
  // configuredStreams holds EVERY stream currently returned by
  // GET /api/sop-config -> {"streams": [{stream_id, sop_steps, updated_at}, ...]}
  // UNCHANGED shape: configuration is still per-camera. The pipeline applies
  // whichever sequence is configured for a stream independently to EVERY
  // person it tracks on that stream — there is no per-person config to edit
  // here, since a person doesn't exist in the system until they walk into
  // frame.
  const [configuredStreams, setConfiguredStreams] = useState([]);
  const [sopStreamId, setSopStreamId] = useState(''); // which stream the form is editing
  const [isNewStream, setIsNewStream] = useState(false); // 'add new stream' mode vs picking existing
  const [sopStepsText, setSopStepsText] = useState('');
  const [sopConfigStatus, setSopConfigStatus] = useState('');
  const [sopSaving, setSopSaving] = useState(false);
  const [sopDeleting, setSopDeleting] = useState(false);

  const [sopReports, setSopReports] = useState([]);
  const [sopOnlyAlerts, setSopOnlyAlerts] = useState(false);
  const [sopFilterStreamId, setSopFilterStreamId] = useState(''); // '' = all streams
  // NEW: person-level filter, since one stream can now have several
  // people's SOP sequences interleaved at once.
  const [sopFilterObjectId, setSopFilterObjectId] = useState(''); // '' = all people
  const [sopPersonIds, setSopPersonIds] = useState([]);
  const isSopReportPage = window.location.hash === '#/sop-reports';

  const waitForPipelineReady = () => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      attempts += 1;
      try {
        const res  = await fetch(`${API_BASE}/api/pipeline-status`);
        const data = await res.json();

        if (data.deepstream_running && data.go2rtc_running) {
          const streamRes  = await fetch(`${API_BASE}/api/stream-config`);
          const streamData = await streamRes.json();
          setStreamUrl(streamData.streamUrl);
          setPipelineStatus('Pipeline running. Stream live.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error polling pipeline status:', err);
      }

      if (attempts < maxAttempts) {
        pollRef.current = setTimeout(poll, 1000);
      } else {
        setPipelineStatus('Pipeline taking longer than expected. Check pipeline_debug.log on the VM.');
        setLoading(false);
      }
    };

    poll();
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  // Fetch ALL configured streams' SOP sequences on dashboard load, and
  // refresh periodically so edits made elsewhere (or by another user) show up.
  // UNCHANGED — SOP config is still per-camera only.
  const fetchConfiguredStreams = () => {
    fetch(`${API_BASE}/api/sop-config`)
      .then((r) => r.json())
      .then((data) => {
        const streams = Array.isArray(data.streams) ? data.streams : [];
        setConfiguredStreams(streams);
      })
      .catch((err) => console.error('Error fetching SOP config list:', err));
  };

  useEffect(() => {
    if (isReportPage || isSopReportPage) return;
    fetchConfiguredStreams();
    const interval = setInterval(fetchConfiguredStreams, 5000);
    return () => clearInterval(interval);
  }, [isReportPage, isSopReportPage]);

  // When the user picks an existing configured stream from the dropdown,
  // pre-fill the editor with that stream's current sequence.
  // UNCHANGED — this edits the camera's sequence, which then applies to
  // every current and future person tracked on that camera.
  const handlePickExistingStream = (streamIdStr) => {
    setIsNewStream(false);
    setSopStreamId(streamIdStr);
    setSopConfigStatus('');
    const match = configuredStreams.find((s) => String(s.stream_id) === streamIdStr);
    setSopStepsText(match ? match.sop_steps.join('\n') : '');
  };

  const handleStartNewStream = () => {
    setIsNewStream(true);
    setSopStreamId('');
    setSopStepsText('');
    setSopConfigStatus('');
  };

  const handleStartStream = async () => {
    try {
      setLoading(true);
      setPipelineStatus('Starting pipeline...');
      setPipelineStarted(true);

      const response = await fetch(`${API_BASE}/api/start-pipeline`, { method: 'POST' });
      const data     = await response.json();

      if (!response.ok) {
        setPipelineStatus(`Error: ${data.detail || 'Unknown error from backend.'}`);
        setLoading(false);
        return;
      }

      setPipelineStatus(data.message || 'Pipeline starting...');
      waitForPipelineReady();
    } catch (error) {
      console.error(error);
      setPipelineStatus(
        `Could not reach backend at ${API_BASE}. ` +
        `Make sure FastAPI is running and port 8000 is open in GCP firewall.`
      );
      setLoading(false);
    }
  };

  const toBackendDate = (isoDate) => {
    const [year, month, day] = isoDate.split('-');
    return `${month}-${day}-${year}`;
  };

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

      const params = new URLSearchParams({
        start_date: toBackendDate(startDate),
        end_date: toBackendDate(endDate),
      });
      if (startTime) params.set('start_time', startTime);
      if (endTime) params.set('end_time', endTime);

      const url = `${API_BASE}/api/reports/download-pdf?${params.toString()}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server returned ${response.status}`);
      }

      const blob = await response.blob();
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

  const handleStopStream = async () => {
    try {
      await fetch(`${API_BASE}/api/stop-pipeline`, { method: 'POST' });
      setStreamUrl(null);
      setPipelineStarted(false);
      setPipelineStatus('Pipeline stopped.');
    } catch (error) {
      console.error(error);
      setPipelineStatus('Failed to stop pipeline.');
    }
  };

  // PATCH the selected stream's ORDERED SOP steps to /api/sop-config.
  // Backend upserts by stream_id — this stream's sequence is created or
  // replaced, every other stream's sequence is untouched. UNCHANGED — the
  // per-person tracking happens entirely inside the pipeline process, not
  // in this config.
  const handleSaveSopConfig = async () => {
    const streamIdNum = parseInt(sopStreamId, 10);
    const steps = sopStepsText
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (Number.isNaN(streamIdNum)) {
      setSopConfigStatus('Enter a valid numeric stream ID.');
      return;
    }
    if (steps.length === 0) {
      setSopConfigStatus('Enter at least one SOP step (one per line, in order).');
      return;
    }

    try {
      setSopSaving(true);
      setSopConfigStatus('Saving...');
      const res = await fetch(`${API_BASE}/api/sop-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: streamIdNum, sop_steps: steps }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSopConfigStatus(`Error: ${data.detail || 'Failed to save SOP config.'}`);
        return;
      }
      setSopConfigStatus(
        `Saved. Now monitoring Stream ${streamIdNum} for a ${steps.length}-step sequence — ` +
        `applied independently to every person the camera tracks.`
      );
      setIsNewStream(false);
      fetchConfiguredStreams();
    } catch (err) {
      console.error(err);
      setSopConfigStatus(`Could not reach backend at ${API_BASE}.`);
    } finally {
      setSopSaving(false);
    }
  };

  // DELETE this stream's SOP config entirely (e.g. camera taken offline,
  // or a site no longer needs monitoring). UNCHANGED.
  const handleDeleteSopConfig = async () => {
    const streamIdNum = parseInt(sopStreamId, 10);
    if (Number.isNaN(streamIdNum)) {
      setSopConfigStatus('Pick a configured stream first.');
      return;
    }
    if (!window.confirm(`Stop SOP monitoring for Stream ${streamIdNum}? This deletes its sequence.`)) {
      return;
    }
    try {
      setSopDeleting(true);
      const res = await fetch(`${API_BASE}/api/sop-config/${streamIdNum}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setSopConfigStatus(`Error: ${data.detail || 'Failed to delete SOP config.'}`);
        return;
      }
      setSopConfigStatus(`Stream ${streamIdNum}'s SOP sequence removed.`);
      setSopStreamId('');
      setSopStepsText('');
      setIsNewStream(false);
      fetchConfiguredStreams();
    } catch (err) {
      console.error(err);
      setSopConfigStatus(`Could not reach backend at ${API_BASE}.`);
    } finally {
      setSopDeleting(false);
    }
  };

  useEffect(() => {
    if (!isReportPage) return;

    let socket;
    let reconnectTimer;
    let updateInterval;
    let messageBuffer = [];
    const MAX_FRAMES = 100;

    const fetchReports = () => {
      fetch(`${API_BASE}/api/reports?limit=${MAX_FRAMES}`)
        .then((r) => r.json())
        .then((data) => {
          const groupedHistory = mergeFlatEntriesIntoGroups(data.reverse(), []);
          setReports(groupedHistory.slice(0, MAX_FRAMES));
        })
        .catch((err) => console.error('Error fetching reports:', err));
    };

    const connectSocket = () => {
      socket = new WebSocket(`${WS_BASE}/ws/violations`);

      socket.onmessage = (event) => {
        const newEntry = JSON.parse(event.data);
        // The socket also carries SOP events ({kind: 'sop_event', ...}) and
        // config-change notifications ({kind: 'sop_config_updated', ...})
        // from the backend. Those belong to the SOP reports page / config
        // panel, not the flat PPE violation feed, so skip them here.
        if (newEntry.kind === 'sop_event' || newEntry.kind === 'sop_config_updated') return;
        messageBuffer.unshift(newEntry);
      };

      socket.onclose = () => { reconnectTimer = setTimeout(connectSocket, 2000); };
      socket.onerror = () => { socket.close(); };
    };

    updateInterval = setInterval(() => {
      if (messageBuffer.length > 0) {
        const toMerge = messageBuffer;
        messageBuffer = [];
        setReports((prev) => {
          const merged = mergeFlatEntriesIntoGroups(toMerge, prev);
          return merged.slice(0, MAX_FRAMES);
        });
      }
    }, 1000);

    fetchReports();
    connectSocket();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (updateInterval) clearInterval(updateInterval);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [isReportPage]);

  // SOP reports page — now polls /api/sop-events with optional stream_id
  // AND object_id filters, so you can view one camera's timeline alone,
  // one PERSON's timeline alone (new), or every event together.
  useEffect(() => {
    if (!isSopReportPage) return;

    const fetchSopReports = () => {
      const params = new URLSearchParams({ limit: '100', only_alerts: String(sopOnlyAlerts) });
      if (sopFilterStreamId !== '') params.set('stream_id', sopFilterStreamId);
      if (sopFilterObjectId !== '') params.set('object_id', sopFilterObjectId);
      fetch(`${API_BASE}/api/sop-events?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setSopReports(data))
        .catch((err) => console.error('Error fetching SOP events:', err));
    };

    fetchSopReports();
    const interval = setInterval(fetchSopReports, 3000);
    return () => clearInterval(interval);
  }, [isSopReportPage, sopOnlyAlerts, sopFilterStreamId, sopFilterObjectId]);

  // NEW: fetch which person IDs actually have events, scoped to whichever
  // camera is currently selected in the filter (or all cameras if none
  // selected), so the Person dropdown only ever shows real options.
  useEffect(() => {
    if (!isSopReportPage) return;

    const fetchPersonIds = () => {
      const params = new URLSearchParams();
      if (sopFilterStreamId !== '') params.set('stream_id', sopFilterStreamId);
      fetch(`${API_BASE}/api/sop-events/person-ids?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setSopPersonIds(Array.isArray(data.object_ids) ? data.object_ids : []))
        .catch((err) => console.error('Error fetching SOP person IDs:', err));
    };

    fetchPersonIds();
    const interval = setInterval(fetchPersonIds, 5000);
    return () => clearInterval(interval);
  }, [isSopReportPage, sopFilterStreamId]);

  // If the camera filter changes and the currently-selected person no
  // longer belongs to it, clear the person filter rather than silently
  // showing a stale/empty result set.
  useEffect(() => {
    if (sopFilterObjectId !== '' && !sopPersonIds.includes(Number(sopFilterObjectId))) {
      setSopFilterObjectId('');
    }
  }, [sopPersonIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also fetch the configured-streams list on the SOP reports page, so the
  // filter dropdown knows which stream IDs actually exist.
  useEffect(() => {
    if (!isSopReportPage) return;
    fetchConfiguredStreams();
  }, [isSopReportPage]);

  const handleNavigation = (text) => {
    if (text === 'Reports') window.open('/#/reports', '_blank');
    if (text === 'SOP Reports') window.open('/#/sop-reports', '_blank');
  };

  // --- SOP REPORT PAGE ---
  if (isSopReportPage) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f5f7fa', p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
              SOP Sequence Reports
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Camera</InputLabel>
                <Select
                  label="Camera"
                  value={sopFilterStreamId}
                  onChange={(e) => setSopFilterStreamId(e.target.value)}
                >
                  <MenuItem value="">All streams</MenuItem>
                  {configuredStreams.map((s) => (
                    <MenuItem key={s.stream_id} value={String(s.stream_id)}>
                      Stream {s.stream_id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* NEW: person filter — only meaningful now that a stream can
                  have several people's sequences interleaved. */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Person</InputLabel>
                <Select
                  label="Person"
                  value={sopFilterObjectId}
                  onChange={(e) => setSopFilterObjectId(e.target.value)}
                >
                  <MenuItem value="">All people</MenuItem>
                  {sopPersonIds.map((id) => (
                    <MenuItem key={id} value={String(id)}>
                      Person #{id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant={sopOnlyAlerts ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setSopOnlyAlerts((v) => !v)}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
              >
                {sopOnlyAlerts ? 'Showing: Alerts Only' : 'Showing: All Events'}
              </Button>
            </Box>
          </Box>

          {sopReports.length === 0 ? (
            <Box sx={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ color: '#94a3b8', fontWeight: 500 }}>No SOP Events Recorded Yet</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 3 }}>
              {sopReports.map((r) => {
                const meta = SOP_EVENT_META[r.event_type] || { label: r.event_type?.toUpperCase() || 'UNKNOWN', bg: '#e2e8f0', color: '#334155' };
                return (
                  <Paper key={r.id} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    <Box sx={{ width: '100%', height: 220, backgroundColor: '#000' }}>
                      <img
                        src={`${API_BASE}/stored_sop_images/${r.image_path.split('/').pop()}`}
                        alt="SOP check"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={meta.label}
                          sx={{ fontWeight: 700, backgroundColor: meta.bg, color: meta.color }}
                        />
                        {/* NEW: person badge, only rendered when the event
                            has an object_id (older rows before this change
                            may not). */}
                        {r.object_id !== null && r.object_id !== undefined && (
                          <Chip
                            icon={<PersonIcon sx={{ fontSize: 16 }} />}
                            label={`Person #${r.object_id}`}
                            variant="outlined"
                            sx={{ fontWeight: 600, color: '#334155' }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ mb: 1 }}><strong>Camera ID:</strong> {r.stream_id}</Typography>
                      <Typography sx={{ mb: 1 }}><strong>Step #{r.step_index}:</strong> {r.step_text || '—'}</Typography>
                      {r.raw_vlm_response && (
                        <Typography sx={{ mb: 1, fontSize: '0.8rem', color: '#94a3b8' }}>
                          <strong>Raw VLM answer:</strong> {r.raw_vlm_response}
                        </Typography>
                      )}
                      <Typography sx={{ mb: 0 }}><strong>Timestamp:</strong> {r.timestamp}</Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </>
    );
  }

  // --- REPORT PAGE (unchanged — PPE violations aren't tracked per-SOP-person) ---
  if (isReportPage) {
    return (
      <>
        <CssBaseline />
        <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: '#f5f7fa', p: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 4 }}>
            PPE Violation Reports
          </Typography>
          <Box
            sx={{
              display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-end', mb: 4,
              p: 2.5, backgroundColor: '#ffffff', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
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
              <Typography variant="h5" sx={{ color: '#94a3b8', fontWeight: 500 }}>No Report Available</Typography>
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
                    <Typography sx={{ mb: 1 }}><strong>Camera ID:</strong> {report.stream_id}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Violations in frame:</strong> {report.violations.length}</Typography>
                    <Typography sx={{ mb: 2 }}><strong>Timestamp:</strong> {report.timestamp}</Typography>

                    <Accordion elevation={0} sx={{ backgroundColor: "#f8fafc", boxShadow: "none", borderRadius: 2, "&:before": { display: "none" } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>Show Summary</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography sx={{ color: "#374151", lineHeight: 1.8 }}>
                          {buildSummary(report)}
                        </Typography>
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

  // --- DASHBOARD (unchanged config panel — still per-camera) ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f4f6f8' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#ffffff', color: '#000000' }}>
        <Toolbar sx={{ minHeight: '64px !important' }}>
          <PlayCircleFilledIcon sx={{ color: '#3f51b5', fontSize: 34, mr: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>Video Intelligence Platform</Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, mt: '64px' } }}>
        <List sx={{ pt: 2 }}>
          <ListItemButton sx={{ flexDirection: 'column', py: 2, mx: 1, borderRadius: 2, backgroundColor: '#e8eaf6' }}>
            <ListItemIcon sx={{ color: '#3f51b5' }}><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
          </ListItemButton>
          {[
            { text: 'Add Stream',  icon: <AddBoxIcon /> },
            { text: 'Reports',     icon: <AssessmentIcon /> },
            { text: 'SOP Reports', icon: <AssessmentIcon /> },
            { text: 'Settings',    icon: <SettingsIcon /> },
          ].map((item) => (
            <ListItemButton key={item.text} onClick={() => handleNavigation(item.text)} sx={{ flexDirection: 'column', py: 2, mx: 1 }}>
              <ListItemIcon sx={{ color: '#757575' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.75rem' }} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4, mt: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>Live Monitoring Dashboard</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleStartStream}
              disabled={loading || (pipelineStarted && !!streamUrl)}
              sx={{ textTransform: 'none', borderRadius: 2, px: 3, py: 1.2, fontWeight: 600, boxShadow: 'none' }}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayCircleFilledIcon />}
            >
              {loading ? 'Starting...' : 'Start Stream'}
            </Button>
            {pipelineStarted && (
              <Button
                variant="outlined" color="error" onClick={handleStopStream}
                sx={{ textTransform: 'none', borderRadius: 2, px: 3, py: 1.2, fontWeight: 600 }}
              >
                Stop Stream
              </Button>
            )}
          </Box>
        </Box>

        {pipelineStatus && (
          <Typography sx={{ mb: 2, color: '#475569', fontWeight: 500 }}>{pipelineStatus}</Typography>
        )}

        <Paper
          elevation={5}
          sx={{
            width: '100%', maxWidth: 1100, aspectRatio: '16/9',
            borderRadius: 4, overflow: 'hidden', backgroundColor: '#000',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}
        >
          {streamUrl ? (
            <iframe src={`http://34.27.105.7:1984/stream.html?src=ds-test`} title="Live Stream" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
          ) : (
            <Typography variant="h6" sx={{ color: '#ffffff', opacity: 0.7 }}>
              {pipelineStarted ? 'Starting stream...' : 'Stream Not Started'}
            </Typography>
          )}
        </Paper>

        {/* SOP configuration panel — UNCHANGED. Still per-camera: Stream 1 =
            pharma cleanroom, Stream 2 = construction site, etc. Whatever
            sequence is set for a camera here now applies independently to
            every person that camera's pipeline instance tracks — that
            per-person behavior lives entirely in the pipeline, not here. */}
        <Paper elevation={3} sx={{ mt: 3, maxWidth: 1100, borderRadius: 3, p: 3, backgroundColor: '#ffffff' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
            SOP Sequence Configuration — per camera
          </Typography>
          <Typography sx={{ mb: 2, color: '#64748b', fontSize: '0.8rem' }}>
            Each camera runs its own independent sequence, applied to every person that camera
            tracks. Pick an existing camera to edit its steps, or add a new one. Steps are
            enforced in the order listed — line order = required execution order for that
            specific stream.
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Left: list of configured streams */}
            <Box sx={{ minWidth: 220 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', mb: 1 }}>
                Configured cameras
              </Typography>
              {configuredStreams.length === 0 ? (
                <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>None yet.</Typography>
              ) : (
                <List dense sx={{ mb: 1 }}>
                  {configuredStreams.map((s) => (
                    <ListItemButton
                      key={s.stream_id}
                      selected={!isNewStream && sopStreamId === String(s.stream_id)}
                      onClick={() => handlePickExistingStream(String(s.stream_id))}
                      sx={{ borderRadius: 2, mb: 0.5 }}
                    >
                      <ListItemText
                        primary={`Stream ${s.stream_id}`}
                        secondary={`${s.sop_steps.length} step(s)`}
                        primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
              <Button
                size="small"
                variant="outlined"
                onClick={handleStartNewStream}
                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
              >
                + Add new camera
              </Button>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* Right: editor for whichever stream is selected */}
            <Box sx={{ flexGrow: 1, minWidth: 320 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <TextField
                  label="Stream ID"
                  type="number"
                  value={sopStreamId}
                  onChange={(e) => { setIsNewStream(true); setSopStreamId(e.target.value); }}
                  size="small"
                  disabled={!isNewStream && sopStreamId !== ''}
                  sx={{ width: 140 }}
                  helperText={!isNewStream && sopStreamId !== '' ? 'Editing existing camera' : 'New camera ID'}
                />
                <TextField
                  label="SOP steps, in order (one per line)"
                  value={sopStepsText}
                  onChange={(e) => setSopStepsText(e.target.value)}
                  size="small"
                  multiline
                  minRows={3}
                  placeholder={"Sanitize hands\nScan badge\nPut on cleanroom mask\nPut on coveralls"}
                  helperText="Line order = required execution order for this camera"
                  sx={{ flexGrow: 1, minWidth: 300 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveSopConfig}
                  disabled={sopSaving}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, boxShadow: 'none', height: 40 }}
                >
                  {sopSaving ? 'Saving...' : (isNewStream ? 'Create SOP Sequence' : 'Update SOP Sequence')}
                </Button>
                {!isNewStream && sopStreamId !== '' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDeleteSopConfig}
                    disabled={sopDeleting}
                    startIcon={<DeleteIcon />}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, height: 40 }}
                  >
                    {sopDeleting ? 'Removing...' : 'Delete'}
                  </Button>
                )}
              </Box>
              {sopConfigStatus && (
                <Typography sx={{ mt: 1.5, color: '#475569', fontSize: '0.875rem' }}>
                  {sopConfigStatus}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
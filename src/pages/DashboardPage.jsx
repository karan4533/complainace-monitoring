import React, { useEffect, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxIcon from '@mui/icons-material/AddBox';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  getPipelineStatus,
  getStreamConfig,
  startPipeline,
  stopPipeline,
} from '../services/pipelineService';
import { API_BASE } from '../config/api';

const drawerWidth = 110;

export default function DashboardPage() {
  const [streamUrl, setStreamUrl] = useState(null);
  const [pipelineStarted, setPipelineStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const pollRef = useRef(null);

  const waitForPipelineReady = () => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      attempts += 1;
      try {
        const data = await getPipelineStatus();
        if (data.deepstream_running && data.go2rtc_running) {
          const streamData = await getStreamConfig();
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
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const handleStartStream = async () => {
    try {
      setLoading(true);
      setPipelineStatus('Starting pipeline...');
      setPipelineStarted(true);
      const data = await startPipeline();
      setPipelineStatus(data.message || 'Pipeline starting...');
      waitForPipelineReady();
    } catch (error) {
      console.error(error);
      setPipelineStatus(
        `Could not reach backend at ${API_BASE}. Make sure FastAPI is running and port 8000 is open in GCP firewall.`
      );
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    try {
      await stopPipeline();
      setStreamUrl(null);
      setPipelineStarted(false);
      setPipelineStatus('Pipeline stopped.');
    } catch (error) {
      console.error(error);
      setPipelineStatus('Failed to stop pipeline.');
    }
  };

  const handleNavigation = (text) => {
    if (text === 'Reports') window.open('/#/reports', '_blank');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f4f6f8' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#ffffff', color: '#000000' }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          <PlayCircleFilledIcon sx={{ color: '#3f51b5', fontSize: 34, mr: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Video Intelligence Platform
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, mt: '64px' } }}>
        <List sx={{ pt: 2 }}>
          <ListItemButton sx={{ flexDirection: 'column', py: 2, mx: 1, borderRadius: 2, backgroundColor: '#e8eaf6' }}>
            <ListItemIcon sx={{ color: '#3f51b5' }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
          </ListItemButton>
          {[
            { text: 'Add Stream', icon: <AddBoxIcon /> },
            { text: 'Reports', icon: <AssessmentIcon /> },
            { text: 'Settings', icon: <SettingsIcon /> },
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
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Live Monitoring Dashboard
          </Typography>
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
                variant="outlined"
                color="error"
                onClick={handleStopStream}
                sx={{ textTransform: 'none', borderRadius: 2, px: 3, py: 1.2, fontWeight: 600 }}
              >
                Stop Stream
              </Button>
            )}
          </Box>
        </Box>

        {pipelineStatus && <Typography sx={{ mb: 2, color: '#475569', fontWeight: 500 }}>{pipelineStatus}</Typography>}

        <Paper
          elevation={5}
          sx={{
            width: '100%',
            maxWidth: 1100,
            aspectRatio: '16/9',
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {streamUrl ? (
            <iframe
              src={streamUrl}
              title="Live Stream"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
            />
          ) : (
            <Typography variant="h6" sx={{ color: '#ffffff', opacity: 0.7 }}>
              {pipelineStarted ? 'Starting stream...' : 'Stream Not Started'}
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

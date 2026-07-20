import React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import { navigateTo } from '../../config/routes';
import { palette } from '../../theme/theme';
import HeuristicLogo from '../common/HeuristicLogo';

const DRAWER_WIDTH = 260;

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, page: 'dashboard' },
  { id: 'add-stream', label: 'Add Stream', icon: AddBoxOutlinedIcon, page: 'add-stream' },
  { id: 'input-config', label: 'Input Config', icon: TuneOutlinedIcon, page: 'input-config' },
  { id: 'reports', label: 'Reports', icon: AssessmentOutlinedIcon, page: 'reports' },
  { id: 'settings', label: 'Settings', icon: SettingsOutlinedIcon, page: 'settings' },
];

function SidebarContent({ activePage, onClose }) {
  const { user, logout } = useAuth();

  const handleNav = (page) => {
    navigateTo(page);
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    navigateTo('login');
    onClose?.();
  };

  const isActive = (item) => {
    if (item.id === 'reports') {
      return activePage === 'reports' || activePage === 'violation-detail';
    }
    return activePage === item.id;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#fff' }}>
      <Box sx={{ px: 2.5, pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
          <HeuristicLogo size={40} variant="light" />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Compliance
            </Typography>
            <Typography sx={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
              Heuristic Labs
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#81C784' }} />
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            SAFETY ADMIN
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, flex: 1 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', px: 1, mb: 1, display: 'block' }}>
          Monitoring
        </Typography>
        <List disablePadding>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <ListItemButton
                key={item.id}
                onClick={() => handleNav(item.page)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.5,
                  py: 1.25,
                  backgroundColor: active ? palette.sidebarActive : 'transparent',
                  '&:hover': { backgroundColor: active ? palette.sidebarActive : palette.sidebarHover },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                  <Icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                    color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ px: 2, pb: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)', pt: 2 }}>
        <ListItemButton sx={{ borderRadius: '10px', py: 1, mb: 1, '&:hover': { backgroundColor: palette.sidebarHover } }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'rgba(255,255,255,0.55)' }}>
            <HelpOutlineIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText
            primary="Help & Support"
            primaryTypographyProps={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)' }}
          />
        </ListItemButton>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.5,
            py: 1.25,
            borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {(user?.username || 'A').charAt(0).toUpperCase()}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
              {user?.username || 'Admin'}
            </Typography>
            <Typography sx={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>
              SAFETY ADMIN
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.4)' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

export default function Sidebar({ activePage, mobileOpen, onMobileClose }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawerPaper = {
    width: DRAWER_WIDTH,
    backgroundColor: palette.sidebar,
    border: 'none',
    boxSizing: 'border-box',
  };

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': drawerPaper }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={onMobileClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <SidebarContent activePage={activePage} onClose={onMobileClose} />
      </Drawer>
    );
  }

  return (
    <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': drawerPaper }}>
      <SidebarContent activePage={activePage} />
    </Drawer>
  );
}

export { DRAWER_WIDTH };

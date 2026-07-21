import React, { useEffect, useState } from 'react';
import {
  Box,
  Collapse,
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
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../context/AuthContext';
import { navigateTo } from '../../config/routes';
import { palette } from '../../theme/theme';
import HeuristicLogo from '../common/HeuristicLogo';

const DRAWER_WIDTH = 260;

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, page: 'dashboard' },
  { id: 'add-stream', label: 'Add Stream', icon: AddBoxOutlinedIcon, page: 'add-stream' },
  { id: 'input-config', label: 'SOP Workflows', icon: TuneOutlinedIcon, page: 'input-config' },
];

const reportNavItems = [
  { id: 'reports', label: 'PPE Violations', icon: AssessmentOutlinedIcon, page: 'reports' },
  { id: 'sop-reports', label: 'SOP Compliance', icon: FactCheckOutlinedIcon, page: 'sop-reports' },
];

const REPORT_PAGES = new Set(['reports', 'sop-reports', 'violation-detail']);

function isReportPageActive(activePage, itemId) {
  if (itemId === 'reports') {
    return activePage === 'reports' || activePage === 'violation-detail';
  }
  if (itemId === 'sop-reports') {
    return activePage === 'sop-reports';
  }
  return false;
}

function NavItem({ item, active, onClick, nested = false }) {
  const Icon = item.icon;
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: '10px',
        mb: 0.5,
        py: nested ? 1 : 1.25,
        pl: nested ? 4.5 : 2,
        backgroundColor: active ? palette.sidebarActive : 'transparent',
        '&:hover': { backgroundColor: active ? palette.sidebarActive : palette.sidebarHover },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: nested ? 32 : 36,
          color: active ? '#fff' : 'rgba(255,255,255,0.65)',
        }}
      >
        <Icon sx={{ fontSize: nested ? 18 : 20 }} />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: nested ? '0.8125rem' : '0.875rem',
          fontWeight: active ? 600 : 500,
          color: active ? '#fff' : 'rgba(255,255,255,0.75)',
        }}
      />
    </ListItemButton>
  );
}

function SidebarContent({ activePage, onClose }) {
  const { user, logout } = useAuth();
  const reportsActive = REPORT_PAGES.has(activePage);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  const handleNav = (page) => {
    navigateTo(page);
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    navigateTo('login');
    onClose?.();
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

      <Box sx={{ px: 2, flex: 1, overflowY: 'auto' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', px: 1, mb: 1, display: 'block' }}>
          Monitoring
        </Typography>
        <List disablePadding sx={{ mb: 2 }}>
          {mainNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activePage === item.id}
              onClick={() => handleNav(item.page)}
            />
          ))}
        </List>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', px: 1, mb: 1, display: 'block' }}>
          Reports
        </Typography>
        <List disablePadding sx={{ mb: 2 }}>
          <ListItemButton
            onClick={() => setReportsOpen((open) => !open)}
            sx={{
              borderRadius: '10px',
              mb: 0.5,
              py: 1.25,
              backgroundColor: reportsActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              '&:hover': { backgroundColor: palette.sidebarHover },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: reportsActive ? '#fff' : 'rgba(255,255,255,0.65)' }}>
              <AssessmentOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="All Reports"
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: reportsActive ? 600 : 500,
                color: reportsActive ? '#fff' : 'rgba(255,255,255,0.75)',
              }}
            />
            <ExpandMoreIcon
              sx={{
                fontSize: 20,
                color: 'rgba(255,255,255,0.5)',
                transform: reportsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </ListItemButton>

          <Collapse in={reportsOpen} timeout="auto" unmountOnExit>
            <List disablePadding>
              {reportNavItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  nested
                  active={isReportPageActive(activePage, item.id)}
                  onClick={() => handleNav(item.page)}
                />
              ))}
            </List>
          </Collapse>
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

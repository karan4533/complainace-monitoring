import { createTheme } from '@mui/material/styles';

export const palette = {
  sidebar: '#3D2E1F',
  sidebarHover: 'rgba(255, 255, 255, 0.08)',
  sidebarActive: 'rgba(255, 255, 255, 0.14)',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  primary: '#4A3728',
  primaryDark: '#3D2E1F',
  primaryLight: '#6B5344',
  textPrimary: '#2D2419',
  textSecondary: '#8B7355',
  textMuted: '#A89888',
  border: '#E8DFD4',
  borderLight: '#F0EAE3',
  success: '#2E7D32',
  successBg: '#E8F5E9',
  warning: '#E65100',
  warningBg: '#FFF8E1',
  error: '#C62828',
  errorBg: '#FEEAEA',
  tagBg: '#F5EDE4',
  tagText: '#6B5344',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: palette.primary,
      dark: palette.primaryDark,
      light: palette.primaryLight,
      contrastText: '#FFFFFF',
    },
    background: {
      default: palette.background,
      paper: palette.surface,
    },
    text: {
      primary: palette.textPrimary,
      secondary: palette.textSecondary,
    },
    divider: palette.border,
    success: { main: palette.success },
    error: { main: palette.error },
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 700, color: palette.textPrimary, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, color: palette.textPrimary, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, color: palette.textPrimary },
    subtitle1: { color: palette.textSecondary, fontSize: '0.9375rem' },
    body2: { color: palette.textSecondary, fontSize: '0.875rem' },
    caption: {
      color: palette.textMuted,
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.background,
          color: palette.textPrimary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          backgroundColor: palette.primary,
          '&:hover': { backgroundColor: palette.primaryDark },
        },
        outlined: {
          borderColor: palette.border,
          color: palette.textPrimary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${palette.borderLight}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: palette.surface,
            '& fieldset': { borderColor: palette.border },
            '&:hover fieldset': { borderColor: palette.textMuted },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
  },
});

export default theme;

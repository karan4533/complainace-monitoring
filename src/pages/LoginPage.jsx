import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../config/routes';
import { palette } from '../theme/theme';
import HeuristicLogo from '../components/common/HeuristicLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigateTo('dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 1.5, sm: 2 },
        py: { xs: 3, sm: 0 },
        background: `linear-gradient(160deg, ${palette.background} 0%, #EFE6DA 45%, #E4D5C3 100%)`,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 2.5, sm: 4 },
          borderRadius: { xs: '14px', sm: '16px' },
          border: `1px solid ${palette.border}`,
          boxShadow: '0 12px 40px rgba(80, 56, 31, 0.12)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'inline-flex', mb: 2 }}>
            <HeuristicLogo size={64} variant="dark" />
          </Box>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: palette.primary,
              mb: 1,
            }}
          >
            Heuristic Labs
          </Typography>
          <Typography variant="h5" sx={{ mb: 0.5, color: palette.primary }}>
            Compliance Monitoring
          </Typography>
          <Typography variant="body2" sx={{ color: palette.textSecondary }}>
            Sign in to access the safety console
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                borderColor: palette.primary,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: palette.primary,
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                borderColor: palette.primary,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: palette.primary,
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              mt: 3,
              height: 46,
              backgroundColor: palette.primary,
              '&:hover': { backgroundColor: palette.primaryDark },
            }}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

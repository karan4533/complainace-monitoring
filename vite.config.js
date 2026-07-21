import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],

    // Dev server
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_DEV_PORT) || 3000,
      proxy: {
        // Proxy API calls to backend in dev so no CORS issues
        '/api': {
          target: env.VITE_API_BASE || 'http://localhost:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: env.VITE_API_BASE || 'http://localhost:8000',
          ws: true,
          changeOrigin: true,
        },
        '/stored_images': {
          target: env.VITE_API_BASE || 'http://localhost:8000',
          changeOrigin: true,
        },
        '/stored_sop_images': {
          target: env.VITE_API_BASE || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    // Production build
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            pdf: ['jspdf'],
          },
        },
      },
    },

    preview: {
      host: '0.0.0.0',
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
    },
  };
});

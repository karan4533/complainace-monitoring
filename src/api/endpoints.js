/**
 * Central API endpoint registry.
 * Backend team: update paths here when endpoints change — UI services import from this file.
 */

export const API_ENDPOINTS = {
  // Auth (optional — dev fallback if missing)
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },

  // SOP workflows & reports (primary integration)
  sop: {
    config: '/api/sop-config',
    configByStream: (streamId) => `/api/sop-config/${streamId}`,
    events: '/api/sop-events',
    personIds: '/api/sop-events/person-ids',
  },

  // Live pipeline / dashboard
  pipeline: {
    start: '/api/start-pipeline',
    stop: '/api/stop-pipeline',
    status: '/api/pipeline-status',
    streamConfig: '/api/stream-config',
  },

  // Cameras / streams (optional — UI falls back to defaults)
  cameras: {
    list: '/api/cameras',
    byId: (cameraId) => `/api/cameras/${cameraId}`,
  },

  // PPE violation reports
  reports: {
    list: '/api/reports',
    downloadPdf: '/api/reports/download-pdf',
  },

  // PPE violations (optional — falls back to reports)
  violations: {
    list: '/api/violations',
    byId: (id) => `/api/violations/${id}`,
    acknowledge: (id) => `/api/violations/${id}/acknowledge`,
  },

  // Static asset mounts (backend serves files)
  static: {
    images: '/stored_images',
    sopImages: '/stored_sop_images',
  },

  // WebSocket
  ws: {
    violations: '/ws/violations',
  },
};

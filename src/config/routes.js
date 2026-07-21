export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ADD_STREAM: '/add-stream',
  INPUT_CONFIG: '/input-config',
  REPORTS: '/reports',
  SOP_REPORTS: '/sop-reports',
  SETTINGS: '/settings',
};

export function parseHashRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path, query] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(query || ''));

  if (!segments.length || segments[0] === 'dashboard') return { page: 'dashboard', params };
  if (segments[0] === 'login') return { page: 'login', params };
  if (segments[0] === 'add-stream' || segments[0] === 'cameras') return { page: 'add-stream', params };
  if (segments[0] === 'live') return { page: 'dashboard', params };
  if (
    segments[0] === 'input-config' ||
    segments[0] === 'detection-inputs' ||
    segments[0] === 'detection' ||
    segments[0] === 'sop-workflows'
  ) {
    return { page: 'input-config', params };
  }
  if (segments[0] === 'detection-config') {
    return { page: 'input-config', params };
  }
  if (segments[0] === 'reports' || segments[0] === 'violations') {
    return {
      page: segments[1] ? 'violation-detail' : 'reports',
      params: { ...params, id: segments[1] },
    };
  }
  if (segments[0] === 'sop-reports') return { page: 'sop-reports', params };
  if (segments[0] === 'settings') return { page: 'settings', params };
  return { page: 'dashboard', params };
}

export function navigateTo(page, options = {}) {
  const { cameraId, id, query = {} } = options;
  const qs = new URLSearchParams(query).toString();
  const suffix = qs ? `?${qs}` : '';

  const paths = {
    login: '#/login',
    dashboard: '#/dashboard',
    'add-stream': '#/add-stream',
    'input-config': '#/input-config',
    'sop-workflows': '#/sop-workflows',
    reports: '#/reports',
    'sop-reports': '#/sop-reports',
    violations: '#/reports',
    settings: '#/settings',
    'violation-detail': `#/reports/${id}${suffix}`,
  };

  window.location.hash = paths[page] || '#/dashboard';
}

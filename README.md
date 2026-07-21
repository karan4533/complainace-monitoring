# Compliance Monitoring — Frontend

React 19 + MUI 7 dashboard for real-time PPE and SOP compliance monitoring.  
Connects to a FastAPI backend (`dummy-backend.py`) running on port **8000**.

---

## Project structure

```
complainace-monitoring/
├── deploy/
│   ├── nginx.conf          # Nginx config for production (SPA + API proxy)
│   └── deploy.sh           # One-command rsync deploy to VM
├── docs/
│   └── BACKEND_API.md      # Full backend API integration guide
├── scripts/
│   └── generate-docs-pdf.mjs
├── src/
│   ├── api/                # Centralised API layer
│   │   ├── client.js       # apiFetch / apiBlob helpers
│   │   ├── endpoints.js    # All endpoint paths (edit here for backend changes)
│   │   └── index.js        # api.sop / api.pipeline / api.reports / …
│   ├── assets/             # Logo images
│   ├── components/
│   │   ├── cameras/        # CameraTable, CameraDetailDrawer
│   │   ├── common/         # PageHeader, StatusBadge, HeuristicLogo
│   │   ├── layout/         # AppLayout, Sidebar, TopHeader
│   │   ├── live/           # LiveCameraTable (dashboard)
│   │   ├── reports/        # ReportToolbar, ViolationDrawer
│   │   ├── sop/            # SopCameraList, SopSequenceEditor, SopEventsTable …
│   │   └── violations/     # ViolationFramesTable
│   ├── config/
│   │   ├── api.js          # API_BASE / WS_BASE (reads VITE_API_BASE)
│   │   ├── constants.js    # PPE_GEAR_OPTIONS, DEFAULT_STREAMS, severity helpers
│   │   └── routes.js       # Hash-router parse + navigate helpers
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── data/               # Mock data (fallback when backend unavailable)
│   ├── hooks/              # useViolations, useSopEvents, useViolationFrames …
│   ├── pages/
│   │   ├── DashboardPage.jsx       # Live camera table + pipeline start/stop
│   │   ├── CamerasPage.jsx         # Add / remove camera streams
│   │   ├── DetectionInputsPage.jsx # SOP Workflows (per-camera step editor)
│   │   ├── ViolationsPage.jsx      # PPE violation reports + PDF download
│   │   ├── SopReportsPage.jsx      # SOP compliance events
│   │   ├── ViolationDetailPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── LoginPage.jsx
│   ├── services/           # Thin wrappers over src/api (backward-compat)
│   ├── theme/theme.js      # MUI theme + palette
│   └── utils/              # sopUtils, violationUtils, reportUtils, sopEventUtils
├── .env.example            # Environment variable template
├── .gitignore
├── dummy-backend.py        # FastAPI backend (run on VM)
├── index.html
├── package.json
└── vite.config.js
```

---

## Quick start (development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and set backend URL
cp .env.example .env
# Edit .env: set VITE_API_BASE=http://<backend-host>:8000

# 3. Start dev server (port 3000)
npm run dev
```

Open `http://localhost:3000`

> **No backend?**  All pages work with mock/fallback data when the backend is unreachable.

---

## Build for production

```bash
npm run build
# Output: dist/
```

### Serve locally to verify

```bash
npm run serve
# Opens at http://localhost:4173
```

---

## Deploy to VM (Linux + Nginx)

### 1. One-command deploy (from your machine)

```bash
VM_HOST=<your-vm-ip> VM_USER=ubuntu ./deploy/deploy.sh
```

This builds the frontend, rsyncs `dist/` to the VM, and reloads Nginx.

### 2. Nginx setup (first time only on VM)

```bash
# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/compliance
sudo ln -s /etc/nginx/sites-available/compliance /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/compliance/dist
sudo chown -R ubuntu /var/www/compliance

# Test and start
sudo nginx -t
sudo systemctl reload nginx
```

Backend (FastAPI) must be running on the same VM at `localhost:8000`.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://<hostname>:8000` | Backend REST + WS base URL |
| `VITE_DEV_PORT` | `3000` | Dev server port |
| `VITE_PREVIEW_PORT` | `4173` | Preview server port |

---

## Backend

See [`docs/BACKEND_API.md`](docs/BACKEND_API.md) for the full API integration guide.

Backend endpoints expected:

| Endpoint | Status |
|----------|--------|
| `/api/sop-config` | ✅ In `dummy-backend.py` |
| `/api/sop-events` | ✅ In `dummy-backend.py` |
| `/api/reports` + PDF | ✅ In `dummy-backend.py` |
| `/api/start-pipeline` / stop / status | ✅ In `dummy-backend.py` |
| `WS /ws/violations` | ✅ In `dummy-backend.py` |
| `/api/cameras` | ⚠️ Not yet — UI falls back to Camera 1–5 |
| `/api/auth/*` | ⚠️ Not yet — dev login fallback active |

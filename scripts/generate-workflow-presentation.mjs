/**
 * Generate a landscape presentation PDF for the project workflow.
 * Run: node scripts/generate-workflow-presentation.mjs
 * Output: docs/Compliance_Monitoring_Workflow_Presentation.pdf
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'docs');
const outFile = join(outDir, 'Compliance_Monitoring_Workflow_Presentation.pdf');

// 16:9 landscape (mm)
const W = 297;
const H = 167;
const M = 16;

const C = {
  bg: [248, 250, 252],
  accent: [15, 76, 117],
  accentSoft: [30, 110, 160],
  title: [15, 23, 42],
  body: [51, 65, 85],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  card: [255, 255, 255],
  line: [226, 232, 240],
  green: [22, 101, 52],
  amber: [146, 64, 14],
};

function newDoc() {
  return new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
}

function paintBg(doc) {
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, 4, 'F');
}

function footer(doc, page, total) {
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(M, H - 10, W - M, H - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text('Compliance Monitoring — Workflow Overview', M, H - 5);
  doc.text(`${page} / ${total}`, W - M, H - 5, { align: 'right' });
}

function slideTitle(doc, title, subtitle) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.title);
  doc.text(title, M, 22);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text(subtitle, M, 30);
  }
}

function bullet(doc, lines, startY, opts = {}) {
  const size = opts.size || 11;
  const gap = opts.gap || 8;
  let y = startY;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...C.body);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(`•  ${line}`, W - M * 2);
    for (const w of wrapped) {
      doc.text(w, M, y);
      y += gap * 0.85;
    }
    y += gap * 0.25;
  }
  return y;
}

function card(doc, x, y, w, h, title, bodyLines) {
  doc.setFillColor(...C.card);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(...C.accent);
  doc.roundedRect(x, y, 2.2, h, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.accent);
  doc.text(title, x + 7, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.body);
  let cy = y + 16;
  for (const line of bodyLines) {
    const wrapped = doc.splitTextToSize(line, w - 12);
    for (const wline of wrapped) {
      doc.text(wline, x + 7, cy);
      cy += 5;
    }
    cy += 1;
  }
}

function flowArrow(doc, x1, y1, x2) {
  doc.setDrawColor(...C.accentSoft);
  doc.setLineWidth(0.8);
  doc.line(x1, y1, x2 - 2, y1);
  doc.setFillColor(...C.accentSoft);
  doc.triangle(x2, y1, x2 - 3, y1 - 1.5, x2 - 3, y1 + 1.5, 'F');
}

function box(doc, x, y, w, h, label, sub) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.accent);
  doc.text(label, x + w / 2, y + h / 2 - (sub ? 2 : 0), { align: 'center' });
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(sub, x + w / 2, y + h / 2 + 5, { align: 'center' });
  }
}

const TOTAL = 7;

function build() {
  const doc = newDoc();

  // ── Slide 1: Title ──────────────────────────────────────────
  paintBg(doc);
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...C.white);
  doc.text('Compliance Monitoring', M, 60);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('PPE & SOP Detection — Project Workflow', M, 74);
  doc.setFontSize(11);
  doc.setTextColor(200, 220, 235);
  doc.text('End-to-end flow: Setup → Start Stream → Detect → Report', M, 92);
  doc.text('Frontend: React + MUI   |   Backend: FastAPI + DeepStream + go2rtc', M, 102);
  doc.setFontSize(9);
  doc.text('Presentation deck for stakeholder walkthrough', M, H - 14);
  footer(doc, 1, TOTAL);

  // ── Slide 2: Architecture ───────────────────────────────────
  doc.addPage([W, H], 'landscape');
  paintBg(doc);
  slideTitle(doc, '1. System Architecture', 'How frontend, backend, and AI pipeline connect');
  const archY = 42;
  box(doc, M, archY, 52, 28, 'Web UI', 'React / Vite');
  flowArrow(doc, M + 54, archY + 14, M + 68);
  box(doc, M + 70, archY, 58, 28, 'FastAPI Backend', 'Port 8000');
  flowArrow(doc, M + 130, archY + 14, M + 144);
  box(doc, M + 146, archY, 58, 28, 'DeepStream', 'PPE + SOP AI');
  flowArrow(doc, M + 206, archY + 14, M + 220);
  box(doc, M + 222, archY, 52, 28, 'go2rtc', 'Live video');

  bullet(
    doc,
    [
      'UI calls REST APIs and listens on WebSocket /ws/violations for live events.',
      'Start Stream boots DeepStream (detection) and go2rtc (browser playback).',
      'PPE violations and SOP events are stored in SQLite and pushed to the UI.',
      'Snapshots served from /stored_images and /stored_sop_images.',
    ],
    88,
    { gap: 7.5 }
  );
  footer(doc, 2, TOTAL);

  // ── Slide 3: Setup ──────────────────────────────────────────
  doc.addPage([W, H], 'landscape');
  paintBg(doc);
  slideTitle(doc, '2. Setup Workflow', 'Before operators can start monitoring');
  card(doc, M, 40, 80, 70, 'Step A — Backend (VM)', [
    '1. Run dummy-backend.py on Linux VM',
    '2. Ensure Docker + DeepStream ready',
    '3. Ensure go2rtc is installed',
    '4. Open firewall ports 8000 & 1984',
    '5. Verify /api/pipeline-status',
  ]);
  card(doc, M + 90, 40, 80, 70, 'Step B — Frontend', [
    '1. npm install',
    '2. Create .env from .env.example',
    '3. Set VITE_API_BASE=http://VM:8000',
    '4. npm run dev (port 3000 / 5173)',
    '5. Open app in browser & login',
  ]);
  card(doc, M + 180, 40, 84, 70, 'Step C — Validate', [
    '1. Browser hits VM:8000/status',
    '2. No "cannot connect" errors',
    '3. Dashboard loads cameras',
    '4. WebSocket connects',
    '5. Ready for Start Stream',
  ]);
  footer(doc, 3, TOTAL);

  // ── Slide 4: Operator day ───────────────────────────────────
  doc.addPage([W, H], 'landscape');
  paintBg(doc);
  slideTitle(doc, '3. Daily Operator Workflow', 'What users do in the UI');

  const steps = [
    ['1', 'SOP Workflows', 'Define ordered steps\nper camera & Save'],
    ['2', 'Start Stream', 'Start pipeline from\nSOP page or Dashboard'],
    ['3', 'Wait Ready', 'Poll until DeepStream\n+ go2rtc are running'],
    ['4', 'Live Monitor', 'Watch cameras &\nviolation highlights'],
    ['5', 'Review Reports', 'PPE reports + SOP\nevents + PDF export'],
    ['6', 'Stop', 'Stop pipeline when\nmonitoring ends'],
  ];
  steps.forEach((s, i) => {
    const x = M + i * 44;
    doc.setFillColor(...C.accent);
    doc.circle(x + 16, 48, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...C.white);
    doc.text(s[0], x + 16, 50, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.title);
    doc.text(s[1], x + 16, 64, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.body);
    const parts = s[2].split('\n');
    parts.forEach((p, pi) => doc.text(p, x + 16, 72 + pi * 5, { align: 'center' }));
    if (i < steps.length - 1) flowArrow(doc, x + 34, 48, x + 42);
  });

  bullet(
    doc,
    [
      'Sidebar pages: Dashboard · Add Stream · SOP Workflows · PPE Reports · SOP Reports · Settings',
      'Start Stream triggers POST /api/start-pipeline, then loads the live player URL.',
    ],
    100,
    { gap: 7 }
  );
  footer(doc, 4, TOTAL);

  // ── Slide 5: Detection ──────────────────────────────────────
  doc.addPage([W, H], 'landscape');
  paintBg(doc);
  slideTitle(doc, '4. Detection & Data Flow', 'How PPE and SOP results reach reports');

  card(doc, M, 40, 128, 85, 'PPE Compliance Path', [
    'Camera frames → DeepStream PPE model',
    'Missing hard hat / vest / mask detected',
    'POST /api/ingest-violation',
    'Saved to DB + push on WebSocket',
    'UI: PPE Violation Reports page',
    'PDF via /api/reports/download-pdf',
    'Images: /stored_images/...',
  ]);
  card(doc, M + 140, 40, 124, 85, 'SOP Compliance Path', [
    'Configure ordered steps per stream',
    'PATCH /api/sop-config',
    'Pipeline checks person step order',
    'POST /api/ingest-sop-event',
    'WS message kind = sop_event',
    'UI: SOP Reports + person filter',
    'Images: /stored_sop_images/...',
  ]);
  footer(doc, 5, TOTAL);

  // ── Slide 6: API map ────────────────────────────────────────
  doc.addPage([W, H], 'landscape');
  paintBg(doc);
  slideTitle(doc, '5. Key APIs Used by the UI', 'Contract with dummy-backend.py');

  const apis = [
    ['POST /api/start-pipeline', 'Start DeepStream + go2rtc'],
    ['POST /api/stop-pipeline', 'Stop all pipeline processes'],
    ['GET /api/pipeline-status', 'Poll deepstream + go2rtc ready'],
    ['GET /api/stream-config', 'Live player URL for iframe'],
    ['GET|PATCH|DELETE /api/sop-config', 'SOP step sequences'],
    ['GET /api/sop-events', 'SOP event list + filters'],
    ['GET /api/reports (+ PDF)', 'PPE violation list / export'],
    ['WS /ws/violations', 'Live PPE + SOP push channel'],
  ];
  let ay = 40;
  apis.forEach((row, i) => {
    const col = i < 4 ? 0 : 1;
    const rowIdx = i % 4;
    const x = M + col * 135;
    const y = 40 + rowIdx * 22;
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.roundedRect(x, y, 128, 18, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.accent);
    doc.text(row[0], x + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.body);
    doc.text(row[1], x + 4, y + 13);
    ay = y;
  });
  footer(doc, 6, TOTAL);

  // ── Slide 7: Checklist ──────────────────────────────────────
  doc.addPage([W, H], 'landscape');
  paintBg(doc);
  slideTitle(doc, '6. End-to-End Checklist', 'Confirm the full loop works');

  bullet(
    doc,
    [
      'Backend reachable: open http://<VM_IP>:8000/api/pipeline-status',
      'Frontend .env points to VM (VITE_API_BASE) and dev server restarted',
      'SOP steps saved for at least one camera stream',
      'Start Stream succeeds and live video appears',
      'Trigger PPE / SOP events from camera activity',
      'PPE Violation Reports shows real rows (not empty / not mock)',
      'SOP Reports shows person events and alerts',
      'PDF download returns a real backend PDF',
      'Stop Stream cleanly shuts down pipeline processes',
    ],
    42,
    { gap: 7.2, size: 11 }
  );
  footer(doc, 7, TOTAL);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, Buffer.from(doc.output('arraybuffer')));
  console.log(`Wrote ${outFile}`);
}

build();

/**
 * Single-slide PPT: app navigation / operator menu flow.
 * Run: node scripts/generate-nav-workflow-pptx.mjs
 * Output: docs/Compliance_Monitoring_Nav_Workflow.pptx
 */

import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import PptxGenJS from 'pptxgenjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const outDir = join(__dirname, '..', 'docs');
const outFile = join(outDir, 'Compliance_Monitoring_Nav_Workflow.pptx');

const items = [
  { title: 'Login', desc: 'Sign in to the application' },
  { title: 'Dashboard', desc: 'Start / Stop pipeline, live cameras' },
  { title: 'Add Stream', desc: 'Manage camera list (UI; backend camera API optional)' },
  { title: 'SOP Workflows', desc: 'Define ordered steps per camera → Start Stream' },
  { title: 'PPE Violation Reports', desc: 'View PPE detections + download PDF' },
  { title: 'SOP Reports', desc: 'View per-person SOP events / alerts' },
  { title: 'Settings', desc: 'Application preferences' },
];

async function build() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.author = 'Compliance Monitoring';
  pptx.title = 'App Navigation Workflow';

  const slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };

  // Top accent bar
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.12,
    fill: { color: '0F4C75' },
    line: { color: '0F4C75' },
  });

  slide.addText('Compliance Monitoring — App Navigation Workflow', {
    x: 0.5,
    y: 0.35,
    w: 12.3,
    h: 0.45,
    fontSize: 26,
    fontFace: 'Calibri',
    bold: true,
    color: '0F172A',
    margin: 0,
  });

  slide.addText('Single-page overview of UI routes after login', {
    x: 0.5,
    y: 0.85,
    w: 12.3,
    h: 0.3,
    fontSize: 13,
    fontFace: 'Calibri',
    color: '64748B',
    margin: 0,
  });

  // Vertical flow cards
  const startY = 1.35;
  const rowH = 0.72;
  const gap = 0.08;

  items.forEach((item, i) => {
    const y = startY + i * (rowH + gap);

    // Card background
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.5,
      y,
      w: 12.3,
      h: rowH,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2E8F0', width: 1 },
      rectRadius: 0.08,
    });

    // Left accent
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0.5,
      y,
      w: 0.1,
      h: rowH,
      fill: { color: '0F4C75' },
      line: { color: '0F4C75' },
    });

    // Step number
    slide.addShape(pptx.shapes.OVAL, {
      x: 0.75,
      y: y + 0.14,
      w: 0.42,
      h: 0.42,
      fill: { color: '0F4C75' },
      line: { color: '0F4C75' },
    });
    slide.addText(String(i + 1), {
      x: 0.75,
      y: y + 0.14,
      w: 0.42,
      h: 0.42,
      fontSize: 12,
      fontFace: 'Calibri',
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    // Title
    slide.addText(item.title, {
      x: 1.4,
      y: y + 0.08,
      w: 4.2,
      h: 0.55,
      fontSize: 15,
      fontFace: 'Calibri',
      bold: true,
      color: '0F4C75',
      valign: 'middle',
      margin: 0,
    });

    // Arrow separator look
    if (i < items.length - 1) {
      // small down cue is implied by numbered list; keep clean
    }

    // Description
    slide.addText(item.desc, {
      x: 5.7,
      y: y + 0.08,
      w: 6.8,
      h: 0.55,
      fontSize: 13,
      fontFace: 'Calibri',
      color: '334155',
      valign: 'middle',
      margin: 0,
    });
  });

  mkdirSync(outDir, { recursive: true });
  await pptx.writeFile({ fileName: outFile });
  console.log(`Wrote ${outFile}`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

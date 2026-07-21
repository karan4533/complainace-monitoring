/**
 * Convert docs/*.md → docs/*.pdf using jsPDF (no Puppeteer required).
 * Run: npm run docs:pdf
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');

const PAGE = { w: 210, h: 297, margin: 14, footer: 287 };
const COLORS = {
  title: [80, 56, 31],
  heading: [45, 45, 45],
  body: [55, 55, 55],
  muted: [120, 120, 120],
  codeBg: [245, 237, 228],
};

function stripMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/, '')
    .replace(/^[-*]\s/, '• ')
    .replace(/^\[[ x]\]\s/, '☐ ')
    .trim();
}

function createRenderer() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = PAGE.margin;
  let inCode = false;
  let codeLines = [];

  const newPage = () => {
    doc.addPage();
    y = PAGE.margin;
  };

  const ensureSpace = (needed) => {
    if (y + needed > PAGE.footer - 8) newPage();
  };

  const writeLines = (text, { size = 9, style = 'normal', color = COLORS.body, indent = 0, lineGap = 4.2 }) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const maxW = PAGE.w - PAGE.margin * 2 - indent;
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureSpace(lineGap);
      doc.text(line, PAGE.margin + indent, y);
      y += lineGap;
    }
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    const block = codeLines.join('\n');
    const lines = doc.splitTextToSize(block, PAGE.w - PAGE.margin * 2 - 6);
    const blockH = lines.length * 3.8 + 4;
    ensureSpace(blockH);
    doc.setFillColor(...COLORS.codeBg);
    doc.rect(PAGE.margin, y - 3, PAGE.w - PAGE.margin * 2, blockH, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    let cy = y;
    for (const line of lines) {
      doc.text(line, PAGE.margin + 3, cy);
      cy += 3.8;
    }
    y = cy + 3;
    codeLines = [];
    inCode = false;
  };

  const renderMarkdown = (md) => {
    const lines = md.replace(/\r\n/g, '\n').split('\n');

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      if (raw.trim().startsWith('```')) {
        if (inCode) flushCode();
        else inCode = true;
        continue;
      }

      if (inCode) {
        codeLines.push(raw);
        continue;
      }

      if (raw.trim() === '---') {
        ensureSpace(6);
        y += 2;
        doc.setDrawColor(220, 204, 184);
        doc.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);
        y += 5;
        continue;
      }

      if (!raw.trim()) {
        y += 2;
        continue;
      }

      if (raw.startsWith('# ')) {
        ensureSpace(12);
        writeLines(stripMd(raw.slice(2)), { size: 16, style: 'bold', color: COLORS.title, lineGap: 7 });
        y += 2;
        continue;
      }

      if (raw.startsWith('## ')) {
        ensureSpace(10);
        y += 2;
        writeLines(stripMd(raw.slice(3)), { size: 12, style: 'bold', color: COLORS.heading, lineGap: 6 });
        y += 1;
        continue;
      }

      if (raw.startsWith('### ')) {
        ensureSpace(8);
        writeLines(stripMd(raw.slice(4)), { size: 10, style: 'bold', color: COLORS.heading, lineGap: 5 });
        continue;
      }

      if (raw.startsWith('|')) {
        const row = raw
          .split('|')
          .slice(1, -1)
          .map((c) => stripMd(c.trim()))
          .join('  |  ');
        if (!row.includes('---')) {
          writeLines(row, { size: 8, color: COLORS.body, lineGap: 4 });
        }
        continue;
      }

      writeLines(stripMd(raw), { size: 9, color: COLORS.body });
    }

    if (inCode) flushCode();
  };

  const addFooters = (title) => {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(`${title} · Page ${p} of ${pages}`, PAGE.w / 2, PAGE.h - 8, { align: 'center' });
      doc.text('Heuristic Labs · Compliance Monitoring', PAGE.w / 2, PAGE.h - 4, { align: 'center' });
    }
  };

  return { doc, renderMarkdown, addFooters };
}

function convertFile(mdPath) {
  const md = readFileSync(mdPath, 'utf8');
  const title = basename(mdPath, '.md').replace(/_/g, ' ');
  const pdfPath = mdPath.replace(/\.md$/i, '.pdf');

  const { doc, renderMarkdown, addFooters } = createRenderer();
  renderMarkdown(md);
  addFooters(title);

  const buffer = Buffer.from(doc.output('arraybuffer'));
  writeFileSync(pdfPath, buffer);
  return pdfPath;
}

const files = readdirSync(docsDir).filter((f) => f.endsWith('.md'));
if (!files.length) {
  console.error('No .md files found in docs/');
  process.exit(1);
}

for (const file of files) {
  const pdf = convertFile(join(docsDir, file));
  console.log(`Generated: ${pdf}`);
}

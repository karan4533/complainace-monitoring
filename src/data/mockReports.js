import { jsPDF } from 'jspdf';

/** Mock PPE violation frames for Reports UI + PDF download fallback. */

export const MOCK_REPORT_ENTRIES = [
  {
    id: 1001,
    timestamp: 'Jul 07, 2026 - 11:25:28 AM',
    label: 'no-mask',
    stream_id: 4,
    confidence: 0.548,
    image_path: 'stored_images/mock_frame_4a.jpg',
    zone: 'Loading Bay',
  },
  {
    id: 1002,
    timestamp: 'Jul 07, 2026 - 11:25:28 AM',
    label: 'no-hardhat',
    stream_id: 4,
    confidence: 0.812,
    image_path: 'stored_images/mock_frame_4a.jpg',
    zone: 'Loading Bay',
  },
  {
    id: 1003,
    timestamp: 'Jul 07, 2026 - 10:14:05 AM',
    label: 'no-mask',
    stream_id: 2,
    confidence: 0.775,
    image_path: 'stored_images/mock_frame_2a.jpg',
    zone: 'Full frame',
  },
  {
    id: 1004,
    timestamp: 'Jul 07, 2026 - 09:48:12 AM',
    label: 'no-hardhat',
    stream_id: 1,
    confidence: 0.834,
    image_path: 'stored_images/mock_frame_1a.jpg',
    zone: 'Entrance',
  },
  {
    id: 1005,
    timestamp: 'Jul 07, 2026 - 09:48:12 AM',
    label: 'no-vest',
    stream_id: 1,
    confidence: 0.923,
    image_path: 'stored_images/mock_frame_1a.jpg',
    zone: 'Entrance',
  },
  {
    id: 1006,
    timestamp: 'Jul 08, 2026 - 02:31:44 PM',
    label: 'no-vest',
    stream_id: 3,
    confidence: 0.691,
    image_path: 'stored_images/mock_frame_3a.jpg',
    zone: 'Warehouse A',
  },
  {
    id: 1007,
    timestamp: 'Jul 08, 2026 - 03:05:19 PM',
    label: 'no-mask',
    stream_id: 5,
    confidence: 0.742,
    image_path: 'stored_images/mock_frame_5a.jpg',
    zone: 'Assembly Line',
  },
  {
    id: 1008,
    timestamp: 'Jul 08, 2026 - 04:22:01 PM',
    label: 'no-hardhat',
    stream_id: 2,
    confidence: 0.888,
    image_path: 'stored_images/mock_frame_2b.jpg',
    zone: 'Full frame',
  },
  {
    id: 1009,
    timestamp: 'Jul 09, 2026 - 08:11:37 AM',
    label: 'no-gloves',
    stream_id: 4,
    confidence: 0.655,
    image_path: 'stored_images/mock_frame_4b.jpg',
    zone: 'Loading Bay',
  },
  {
    id: 1010,
    timestamp: 'Jul 09, 2026 - 11:47:52 AM',
    label: 'no-vest',
    stream_id: 1,
    confidence: 0.791,
    image_path: 'stored_images/mock_frame_1b.jpg',
    zone: 'Entrance',
  },
];

export function getDefaultReportDateRange() {
  return {
    startDate: '2026-07-07',
    endDate: '2026-07-09',
    startTime: '08:00',
    endTime: '18:00',
  };
}

function groupEntriesByFrame(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = `${entry.timestamp}__${entry.stream_id}__${entry.image_path}`;
    if (!map.has(key)) {
      map.set(key, {
        timestamp: entry.timestamp,
        stream_id: entry.stream_id,
        image_path: entry.image_path,
        zone: entry.zone || 'Full frame',
        violations: [],
        no_helmet: 0,
        no_vest: 0,
        no_mask: 0,
      });
    }
    const frame = map.get(key);
    frame.violations.push(entry);
    const label = (entry.label || '').toLowerCase();
    if (label.includes('hardhat')) frame.no_helmet += 1;
    if (label.includes('vest')) frame.no_vest += 1;
    if (label.includes('mask')) frame.no_mask += 1;
  }
  return Array.from(map.values());
}

function buildFrameSummary(frame) {
  return (
    `At ${frame.timestamp} on Stream ${frame.stream_id}, there were ` +
    `${frame.no_helmet} Hard Hat violation(s), ` +
    `${frame.no_vest} Vest violation(s), and ` +
    `${frame.no_mask} Mask violation(s) detected in this frame.`
  );
}

/**
 * Build a properly formatted PPE Violation Report PDF
 * matching backend /api/reports/download-pdf layout.
 */
export function createMockPdfBlob({
  startDate,
  endDate,
  startTime,
  endTime,
  entries = MOCK_REPORT_ENTRIES,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const frames = groupEntriesByFrame(entries);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('Safety & PPE Violation Report', pageWidth / 2, 18, { align: 'center' });

  // Timeframe
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const rangeLabel =
    `Timeframe: ${startDate}${startTime ? `, ${startTime}` : ''}` +
    ` to ${endDate}${endTime ? `, ${endTime}` : ''}`;
  doc.text(rangeLabel, pageWidth / 2, 26, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Heuristic Labs · Compliance Monitoring (Demo Report)', pageWidth / 2, 32, { align: 'center' });

  let y = 40;

  // Table header
  const col = {
    id: margin,
    ts: margin + 12,
    cam: margin + 62,
    det: margin + 82,
  };
  const rowH = 28;
  const usableWidth = pageWidth - margin * 2;

  const drawHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableWidth, 10, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, usableWidth, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('ID', col.id + 2, y + 6.5);
    doc.text('Timestamp', col.ts + 2, y + 6.5);
    doc.text('Camera', col.cam + 2, y + 6.5);
    doc.text('Violation Detection', col.det + 2, y + 6.5);
    y += 10;
  };

  drawHeader();

  if (!frames.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('No violations recorded in this time period.', pageWidth / 2, y + 20, { align: 'center' });
  } else {
    frames.forEach((frame, index) => {
      if (y + rowH > 280) {
        doc.addPage();
        y = 20;
        drawHeader();
      }

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, usableWidth, rowH, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(String(index + 1), col.id + 2, y + 8);
      doc.text(String(frame.timestamp), col.ts + 2, y + 8, { maxWidth: 46 });
      doc.text(String(frame.stream_id), col.cam + 2, y + 8);

      const summary = buildFrameSummary(frame);
      doc.setFontSize(8);
      doc.setTextColor(55, 65, 81);
      const wrapped = doc.splitTextToSize(summary, pageWidth - col.det - margin - 4);
      doc.text(wrapped.slice(0, 5), col.det + 2, y + 7);

      y += rowH;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 287, { align: 'center' });
  }

  return doc.output('blob');
}

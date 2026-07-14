export const frameKey = (report) => `${report.timestamp}__${report.stream_id}__${report.image_path}`;

export function mergeFlatEntriesIntoGroups(flatEntries, existingGroups) {
  const groups = [...existingGroups];
  const indexByKey = new Map(groups.map((group, i) => [frameKey(group), i]));

  for (const entry of flatEntries) {
    const key = `${entry.timestamp}__${entry.stream_id}__${entry.image_path}`;
    const violation = { id: entry.id, label: entry.label, confidence: entry.confidence };

    if (indexByKey.has(key)) {
      const idx = indexByKey.get(key);
      const alreadyExists = groups[idx].violations.some((v) => v.id === violation.id);
      if (!alreadyExists) {
        groups[idx] = {
          ...groups[idx],
          violations: [...groups[idx].violations, violation],
        };
      }
      continue;
    }

    const newGroup = {
      timestamp: entry.timestamp,
      stream_id: entry.stream_id,
      image_path: entry.image_path,
      violations: [violation],
    };
    groups.unshift(newGroup);
    indexByKey.set(key, 0);
    for (const [existingKey, i] of indexByKey) {
      if (existingKey !== key) indexByKey.set(existingKey, i + 1);
    }
  }

  return groups;
}

export function buildSummary(report) {
  const helmetViolations = report.violations.filter((v) =>
    v.label.toLowerCase().includes('hardhat')
  ).length;
  const vestViolations = report.violations.filter((v) =>
    v.label.toLowerCase().includes('vest')
  ).length;
  const maskViolations = report.violations.filter((v) =>
    v.label.toLowerCase().includes('mask')
  ).length;

  return `At ${report.timestamp} on Stream ${report.stream_id}, there were ${helmetViolations} Hard Hat violation(s), ${vestViolations} Vest violation(s), and ${maskViolations} Mask violation(s) detected in this frame.`;
}

export function toBackendDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${month}-${day}-${year}`;
}

const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse report timestamps like:
 * - "Jul 07, 2026 - 11:25:28 AM"
 * - ISO strings
 * Returns Date or null.
 */
export function parseReportTimestamp(value) {
  if (!value) return null;
  const raw = String(value).trim();

  const readable = raw.match(
    /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
  );
  if (readable) {
    const [, mon, day, year, hourRaw, minute, second = '0', meridiem] = readable;
    const month = MONTHS[mon.toLowerCase()];
    if (month == null) return null;
    let hour = Number(hourRaw);
    if (meridiem) {
      const ampm = meridiem.toUpperCase();
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
    }
    const dt = new Date(
      Number(year),
      month,
      Number(day),
      hour,
      Number(minute),
      Number(second)
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const iso = new Date(raw.includes(' ') && !raw.includes('T') ? raw.replace(' ', 'T') : raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export function buildFilterRange({ startDate, endDate, startTime, endTime }) {
  if (!startDate || !endDate) return null;

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const [sh = 0, smin = 0] = (startTime || '00:00').split(':').map(Number);
  const [eh = 23, emin = 59] = (endTime || '23:59').split(':').map(Number);

  const start = new Date(sy, sm - 1, sd, sh, smin, 0, 0);
  const end = new Date(ey, em - 1, ed, eh, emin, endTime ? 59 : 59, endTime ? 999 : 999);
  if (!endTime) {
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

/** Filter grouped frames by date/time range (and optional camera). */
export function filterReportFrames(frames, filters = {}) {
  const range = buildFilterRange(filters);
  const cameraId = filters.cameraId;

  return frames.filter((frame) => {
    if (cameraId && String(frame.stream_id) !== String(cameraId)) return false;

    if (!range) return true;
    const ts = parseReportTimestamp(frame.timestamp);
    if (!ts) return true; // keep unparseable rows visible
    return ts >= range.start && ts <= range.end;
  });
}

/** Filter flat report entries by date/time range. */
export function filterReportEntries(entries, filters = {}) {
  const range = buildFilterRange(filters);
  if (!range) return entries;

  return entries.filter((entry) => {
    const ts = parseReportTimestamp(entry.timestamp);
    if (!ts) return true;
    return ts >= range.start && ts <= range.end;
  });
}

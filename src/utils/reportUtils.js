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

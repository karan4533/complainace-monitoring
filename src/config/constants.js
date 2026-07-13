export const PPE_GEAR_OPTIONS = [
  { id: 'hardhat', label: 'Hard Hat', keyword: 'hardhat' },
  { id: 'vest', label: 'Safety Vest', keyword: 'vest' },
  { id: 'mask', label: 'Face Mask', keyword: 'mask' },
  { id: 'gloves', label: 'Gloves', keyword: 'gloves' },
  { id: 'goggles', label: 'Safety Goggles', keyword: 'goggles' },
  { id: 'boots', label: 'Safety Boots', keyword: 'boots' },
];

export const CAMERA_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  VIOLATION_ACTIVE: 'violation_active',
};

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];

export function severityFromConfidence(confidence) {
  if (confidence >= 0.9) return 'critical';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.55) return 'medium';
  return 'low';
}

export const SEVERITY_COLORS = {
  low: { bg: '#F5EDE4', color: '#6E5234' },
  medium: { bg: '#FFF8E1', color: '#E65100' },
  high: { bg: '#FEEAEA', color: '#C62828' },
  critical: { bg: '#FFCDD2', color: '#B71C1C' },
};

export const PPE_GEAR_OPTIONS = [
  {
    id: 'hardhat',
    label: 'Hard Hat',
    keyword: 'hardhat',
    description: 'Monitor whether workers are wearing a hard hat / helmet.',
    sopStep: 'Detect hard hat / helmet compliance.',
  },
  {
    id: 'vest',
    label: 'Safety Vest',
    keyword: 'vest',
    description: 'Monitor whether workers are wearing a high-visibility safety vest.',
    sopStep: 'Detect safety vest compliance.',
  },
  {
    id: 'mask',
    label: 'Face Mask',
    keyword: 'mask',
    description: 'Monitor whether workers are wearing a required face mask.',
    sopStep: 'Detect face mask compliance.',
  },
  {
    id: 'gloves',
    label: 'Gloves',
    keyword: 'gloves',
    description: 'Monitor whether workers are wearing protective gloves.',
    sopStep: 'Detect protective gloves compliance.',
  },
  {
    id: 'goggles',
    label: 'Safety Goggles',
    keyword: 'goggles',
    description: 'Monitor whether workers are wearing eye protection.',
    sopStep: 'Detect safety goggles compliance.',
  },
  {
    id: 'boots',
    label: 'Safety Boots',
    keyword: 'boots',
    description: 'Monitor whether workers are wearing safety footwear.',
    sopStep: 'Detect safety boots compliance.',
  },
];

/** Default camera streams when backend has no /api/cameras endpoint. */
export const DEFAULT_STREAMS = [
  { id: 1, name: 'Camera 1' },
  { id: 2, name: 'Camera 2' },
  { id: 3, name: 'Camera 3' },
  { id: 4, name: 'Camera 4' },
  { id: 5, name: 'Camera 5' },
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

export const TRACK_OPTIONS = [
  { key: 'mandarin-learning', labelZh: '中文學習', labelEn: 'Mandarin Learning' },
  { key: 'teacher-training', labelZh: '師培課程', labelEn: 'Teacher Training' },
];

export const LEVEL_OPTIONS = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
];

export function getTrackOptionByKey(trackKey) {
  const normalizedKey = String(trackKey || '').trim();

  if (['professional-track', 'business-mandarin'].includes(normalizedKey)) {
    return TRACK_OPTIONS.find((option) => option.key === 'teacher-training') || TRACK_OPTIONS[0];
  }

  if (['mandarin-core', 'tocfl-pathway', 'conversation-lab', 'culture-literacy'].includes(normalizedKey)) {
    return TRACK_OPTIONS.find((option) => option.key === 'mandarin-learning') || TRACK_OPTIONS[0];
  }

  return TRACK_OPTIONS.find((option) => option.key === normalizedKey) || TRACK_OPTIONS[0];
}

export function parseTrackLabels(labelText) {
  if (!labelText) {
    return [];
  }

  return labelText
    .split(/[,\n#]+/)
    .map((label) => label.trim())
    .filter(Boolean);
}

export function buildTrackMetadata(trackKey) {
  const trackOption = getTrackOptionByKey(trackKey);

  return {
    trackKey: trackOption.key,
    trackLabelZh: trackOption.labelZh,
    trackLabelEn: trackOption.labelEn,
  };
}

export function formatDurationLabel(durationHours) {
  const numericHours = Number.parseInt(durationHours, 10);

  if (!Number.isFinite(numericHours) || numericHours <= 0) {
    return 'Self-paced';
  }

  return `${numericHours} hours`;
}

export function normalizeCourseId(rawId, fallbackTitle) {
  const source = String(rawId || fallbackTitle || '')
    .trim()
    .toLowerCase();

  return source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

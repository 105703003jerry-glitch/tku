export const TRACK_OPTIONS = [
  { key: 'mandarin-core', labelZh: '核心華語', labelEn: 'Core Mandarin' },
  { key: 'tocfl-pathway', labelZh: 'TOCFL 路徑', labelEn: 'TOCFL Pathway' },
  { key: 'professional-track', labelZh: '專業華語', labelEn: 'Professional Mandarin' },
  { key: 'conversation-lab', labelZh: '口說實戰', labelEn: 'Conversation Lab' },
  { key: 'business-mandarin', labelZh: '商務華語', labelEn: 'Business Mandarin' },
  { key: 'culture-literacy', labelZh: '文化素養', labelEn: 'Culture Literacy' },
];

export const LEVEL_OPTIONS = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6',
];

export function getTrackOptionByKey(trackKey) {
  return TRACK_OPTIONS.find((option) => option.key === trackKey) || TRACK_OPTIONS[0];
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

export function buildTrackMetadata(trackKey, rawTrackLabels) {
  const trackOption = getTrackOptionByKey(trackKey);
  const parsedLabels = parseTrackLabels(rawTrackLabels);
  const labels = parsedLabels.length > 0 ? parsedLabels : [trackOption.labelZh];

  return {
    trackKey: trackOption.key,
    trackLabelZh: labels.join(', '),
    trackLabelEn: trackOption.labelEn,
    trackLabels: labels,
  };
}

export function formatDurationLabel(durationHours) {
  const numericHours = Number.parseInt(durationHours, 10);

  if (!Number.isFinite(numericHours) || numericHours <= 0) {
    return 'Self-paced';
  }

  return `${numericHours} hours`;
}

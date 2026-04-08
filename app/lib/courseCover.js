import { imageSize } from 'image-size';

export const COURSE_COVER_RECOMMENDED_WIDTH = 1280;
export const COURSE_COVER_RECOMMENDED_HEIGHT = 720;
export const COURSE_COVER_MIN_WIDTH = 960;
export const COURSE_COVER_MIN_HEIGHT = 540;
export const COURSE_COVER_MAX_BYTES = 500 * 1024;
export const COURSE_COVER_ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
const COURSE_COVER_RATIO = 16 / 9;
const COURSE_COVER_RATIO_TOLERANCE = 0.03;

export const COURSE_COVER_PRESETS = [
  { key: 'sunrise-campus', label: 'Sunrise Campus' },
  { key: 'jade-tiles', label: 'Jade Tiles' },
  { key: 'harbor-blue', label: 'Harbor Blue' },
  { key: 'orchid-paper', label: 'Orchid Paper' },
  { key: 'amber-ink', label: 'Amber Ink' },
  { key: 'forest-grid', label: 'Forest Grid' },
];

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePresetKey(value) {
  const normalized = String(value || '').trim();
  return COURSE_COVER_PRESETS.some((preset) => preset.key === normalized) ? normalized : COURSE_COVER_PRESETS[0].key;
}

function buildPresetPalette(key) {
  switch (normalizePresetKey(key)) {
    case 'jade-tiles':
      return {
        backgroundStart: '#0f766e',
        backgroundEnd: '#14b8a6',
        accent: '#134e4a',
        accentSoft: '#99f6e4',
      };
    case 'harbor-blue':
      return {
        backgroundStart: '#0f172a',
        backgroundEnd: '#1d4ed8',
        accent: '#0f172a',
        accentSoft: '#dbeafe',
      };
    case 'orchid-paper':
      return {
        backgroundStart: '#f5d0fe',
        backgroundEnd: '#c026d3',
        accent: '#86198f',
        accentSoft: '#fae8ff',
      };
    case 'amber-ink':
      return {
        backgroundStart: '#f59e0b',
        backgroundEnd: '#78350f',
        accent: '#78350f',
        accentSoft: '#fde68a',
      };
    case 'forest-grid':
      return {
        backgroundStart: '#052e16',
        backgroundEnd: '#15803d',
        accent: '#14532d',
        accentSoft: '#bbf7d0',
      };
    default:
      return {
        backgroundStart: '#f59e0b',
        backgroundEnd: '#7c3aed',
        accent: '#7c2d12',
        accentSoft: '#fde68a',
      };
  }
}

export function getCourseCoverPresetUrl({ presetKey, title, level, trackLabel }) {
  const palette = buildPresetPalette(presetKey);
  const safeTitle = escapeSvgText(title || 'TKUCLCLAB');
  const safeLevel = escapeSvgText(level || 'Course');
  const safeTrackLabel = escapeSvgText(trackLabel || 'Mandarin Program');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${COURSE_COVER_RECOMMENDED_WIDTH}" height="${COURSE_COVER_RECOMMENDED_HEIGHT}" viewBox="0 0 ${COURSE_COVER_RECOMMENDED_WIDTH} ${COURSE_COVER_RECOMMENDED_HEIGHT}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.backgroundStart}"/>
          <stop offset="100%" stop-color="${palette.backgroundEnd}"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="${palette.accentSoft}" />
      <rect width="100%" height="100%" fill="url(#bg)" />
      <g opacity="0.18">
        <circle cx="1030" cy="160" r="180" fill="${palette.accentSoft}" />
        <circle cx="180" cy="580" r="160" fill="${palette.accent}" />
        <rect x="540" y="-40" width="460" height="220" rx="36" fill="${palette.accent}" />
      </g>
      <g opacity="0.22">
        <path d="M70 82H480V128H70zM70 148H380V174H70zM70 520H610V560H70zM70 578H430V604H70z" fill="#ffffff" />
      </g>
      <rect x="70" y="62" width="170" height="40" rx="20" fill="rgba(255,255,255,0.18)" />
      <text x="108" y="88" font-size="20" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">TKUCLCLAB</text>
      <text x="70" y="250" font-size="54" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">${safeTitle}</text>
      <text x="70" y="315" font-size="28" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.92)" font-weight="500">${safeTrackLabel}</text>
      <text x="70" y="365" font-size="22" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.85)">${safeLevel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getCourseCoverImage(course) {
  const coverSource = normalizeCoverSource(course?.coverImageSource);

  if (coverSource === 'upload' && course?.coverImageUrl) {
    return course.coverImageUrl;
  }

  const firstLesson = Array.isArray(course?.lessons) ? course.lessons.find((lesson) => lesson?.thumbnailUrl || lesson?.externalVideoId) : null;

  if (firstLesson?.thumbnailUrl) {
    return firstLesson.thumbnailUrl;
  }

  if (firstLesson?.externalVideoId) {
    return `https://img.youtube.com/vi/${firstLesson.externalVideoId}/maxresdefault.jpg`;
  }

  return getCourseCoverPresetUrl({
    presetKey: course?.coverPresetKey,
    title: course?.title?.['zh-TW'] || course?.title?.en || course?.id,
    level: course?.level,
    trackLabel: course?.trackLabel?.['zh-TW'] || course?.track,
  });
}

export function getCourseCoverSourceLabel(source) {
  if (source === 'upload') {
    return 'Uploaded cover';
  }

  if (source === 'preset') {
    return 'Preset cover';
  }

  return 'YouTube thumbnail fallback';
}

export function readImageMetadata(fileBuffer) {
  const dimensions = imageSize(fileBuffer);
  return {
    width: Number(dimensions.width || 0),
    height: Number(dimensions.height || 0),
    type: dimensions.type || null,
  };
}

export function validateCourseCoverUpload({ file, width, height }) {
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    return { ok: true };
  }

  if (!COURSE_COVER_ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Cover image must be WebP, JPEG, or PNG.' };
  }

  if (file.size > COURSE_COVER_MAX_BYTES) {
    return { ok: false, error: 'Cover image must be 500 KB or smaller.' };
  }

  if (width < COURSE_COVER_MIN_WIDTH || height < COURSE_COVER_MIN_HEIGHT) {
    return { ok: false, error: `Cover image must be at least ${COURSE_COVER_MIN_WIDTH} x ${COURSE_COVER_MIN_HEIGHT}.` };
  }

  const ratio = width / height;
  if (Math.abs(ratio - COURSE_COVER_RATIO) > COURSE_COVER_RATIO_TOLERANCE) {
    return { ok: false, error: 'Cover image must use a 16:9 ratio, such as 1280 x 720.' };
  }

  return { ok: true };
}

export function normalizeCoverSource(value) {
  const source = String(value || 'youtube').trim();
  return ['upload', 'youtube', 'preset'].includes(source) ? source : 'youtube';
}

export function normalizeCoverPresetKey(value) {
  return normalizePresetKey(value);
}

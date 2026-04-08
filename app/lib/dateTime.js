const TAIPEI_TIMEZONE = 'Asia/Taipei';

export function formatTaipeiDate(value) {
  if (!value) {
    return 'Not yet';
  }

  try {
    return new Date(value).toLocaleDateString('zh-TW', {
      timeZone: TAIPEI_TIMEZONE,
    });
  } catch {
    return 'Not yet';
  }
}

export function formatTaipeiDateTime(value) {
  if (!value) {
    return 'Not yet';
  }

  try {
    return new Date(value).toLocaleString('zh-TW', {
      timeZone: TAIPEI_TIMEZONE,
      hour12: false,
    });
  } catch {
    return 'Not yet';
  }
}

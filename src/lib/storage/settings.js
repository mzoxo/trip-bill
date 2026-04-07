const SETTINGS_KEY = 'travel-ledger-settings';

export function getAppSettings() {
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { webAppUrl: '', token: '' };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      webAppUrl: parsed.webAppUrl ?? '',
      token: parsed.token ?? '',
    };
  } catch {
    return { webAppUrl: '', token: '' };
  }
}

export function saveAppSettings(settings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearAppSettings() {
  window.localStorage.removeItem(SETTINGS_KEY);
}

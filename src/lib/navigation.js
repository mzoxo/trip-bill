const BASE = import.meta.env.BASE_URL;

export function appUrl(path) {
  return BASE + path.replace(/^\//, '');
}

export function appNavigate(path) {
  window.location.href = appUrl(path);
}

export const APP_PAGES = new Set(['home', 'expenses', 'income', 'balances', 'chores', 'shopping', 'reports', 'members', 'groups', 'settings']);

export function appPageFromPath(pathname) {
  const candidate = String(pathname || '').split('/')[2] || 'home';
  return APP_PAGES.has(candidate) ? candidate : 'home';
}

export function appPathForPage(page) {
  const target = APP_PAGES.has(page) ? page : 'home';
  return target === 'home' ? '/app' : `/app/${target}`;
}

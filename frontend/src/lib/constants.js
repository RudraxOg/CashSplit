export const C = {
  bg: 'var(--bg)', surface: 'var(--surface)', text: 'var(--text)', textSec: 'var(--text-sec)', border: 'var(--border)',
  accent: 'var(--accent)', accentDark: 'var(--accent-dark)',
  income: '#16A67A', expense: '#EF6A68', chores: '#8B7CF6', shopping: '#F3A34D', info: '#4D8DDB',
  others: '#C7CCD6',
};

export const CATEGORY_COLORS = {
  Rent: C.accent, Groceries: C.info, 'Food & Dining': C.expense,
  Utilities: C.chores, Transport: C.shopping, Others: C.others,
};

export const CHORE_COLOR_CYCLE = [C.shopping, '#F0C36B', C.info, '#9AA4B2'];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'];
export const inr = (n, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n));

export const NAV_MAIN = [
  { id: 'home', label: 'Home' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'balances', label: 'Balances' },
];
export const NAV_HOUSEHOLD = [
  { id: 'groups', label: 'Groups' },
  { id: 'chores', label: 'Chores' },
  { id: 'shopping', label: 'Shopping List' },
  { id: 'reports', label: 'Reports' },
  { id: 'members', label: 'Members' },
];
export const NAV_SYSTEM = [{ id: 'settings', label: 'Settings' }];
export const ALL_NAV = [...NAV_MAIN, ...NAV_HOUSEHOLD, ...NAV_SYSTEM];

export const PRIORITY_META = {
  High: { bg: 'var(--purple-soft)', color: 'var(--purple-text)' },
  Medium: { bg: 'var(--warning-soft)', color: 'var(--warning-text)' },
  Low: { bg: 'var(--info-soft)', color: 'var(--info-text)' },
};

export const ACTIVITY_COLOR = { expense: C.expense, chore: C.chores, income: C.income, settle: C.info };

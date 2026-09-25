const BASE_URL = import.meta.env.VITE_API_URL || '/api';
import { supabase } from './supabaseClient';
const idempotencyKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const groupKey = (value = 'g1') => {
  const id = value && typeof value === 'object' ? value.id : value;
  return (typeof id === 'string' || typeof id === 'number') && String(id).trim() && String(id) !== '[object Object]' ? String(id) : 'g1';
};

async function request(path, options = {}) {
  const { anonymous = false, ...fetchOptions } = options;
  const isMutation = options.method && options.method !== 'GET';
  let sessionToken = null;
  if (supabase && !anonymous) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    sessionToken = data.session?.access_token || null;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(isMutation ? { 'Idempotency-Key': options.idempotencyKey || idempotencyKey() } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      if (body?.requestId) message += ` (request ${body.requestId})`;
    } catch {
      /* ignore non-JSON error body */
    }
    throw new Error(message);
  }

  if (res.status === 204) return true;
  if (options.responseType === 'blob') return res.blob();
  return res.json();
}

export const api = {
  uploadReceipt: (id, file) => request(`/expenses/${id}/receipt`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } }),
  getReceipt: (id) => request(`/expenses/${id}/receipt`, { responseType: 'blob' }),
  deleteReceipt: (id) => request(`/expenses/${id}/receipt`, { method: 'DELETE' }),
  searchExpenses: (groupId, filters = {}) => request(`/expenses?${new URLSearchParams({ groupId: groupKey(groupId), ...filters })}`),
  exportLedger: (groupId) => request(`/reports/export?${new URLSearchParams({ groupId: groupKey(groupId) })}`, { responseType: 'blob' }),
  getExpenseSeries: (groupId) => request(`/expense-series?${new URLSearchParams({ groupId: groupKey(groupId) })}`),
  createExpenseSeries: (data) => request('/expense-series', { method: 'POST', body: JSON.stringify(data) }),
  updateExpenseSeries: (id, data) => request(`/expense-series/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getPreferences: () => request('/account/preferences'),
  updatePreferences: (data) => request('/account/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  getMembers: (groupId = 'g1') => request(`/members?groupId=${encodeURIComponent(groupKey(groupId))}`),

  getExpenses: (groupId = 'g1') => request(`/expenses?groupId=${encodeURIComponent(groupKey(groupId))}`),
  addExpense: (payload, groupId = 'g1') => request('/expenses', { method: 'POST', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  updateExpense: (id, payload, groupId = 'g1') => request(`/expenses/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'PUT', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  deleteExpense: (id, groupId = 'g1') => request(`/expenses/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'DELETE' }),
  getExpenseHistory: (id) => request(`/expenses/${id}/history`),
  getExpenseComments: (id) => request(`/expenses/${id}/comments`),
  addExpenseComment: (id, text) => request(`/expenses/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),

  getIncomes: (groupId = 'g1') => request(`/incomes?groupId=${encodeURIComponent(groupKey(groupId))}`),
  addIncome: (payload, groupId = 'g1') => request('/incomes', { method: 'POST', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  updateIncome: (id, payload, groupId = 'g1') => request(`/incomes/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'PUT', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  deleteIncome: (id, groupId = 'g1') => request(`/incomes/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'DELETE' }),

  getChores: (groupId = 'g1') => request(`/chores?groupId=${encodeURIComponent(groupKey(groupId))}`),
  addChore: (payload, groupId = 'g1') => request('/chores', { method: 'POST', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  updateChore: (id, payload, groupId = 'g1') => request(`/chores/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'PUT', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  toggleChore: (id, groupId = 'g1') => request(`/chores/${id}/toggle?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'PATCH' }),
  deleteChore: (id, groupId = 'g1') => request(`/chores/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'DELETE' }),

  getShopping: (groupId = 'g1') => request(`/shopping?groupId=${encodeURIComponent(groupKey(groupId))}`),
  addShoppingItem: (payload, groupId = 'g1') => request('/shopping', { method: 'POST', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  updateShoppingItem: (id, payload, groupId = 'g1') => request(`/shopping/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'PUT', body: JSON.stringify({ ...payload, groupId: groupKey(groupId) }) }),
  toggleShoppingItem: (id, groupId = 'g1') => request(`/shopping/${id}/toggle?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'PATCH' }),
  purchaseShoppingItem: (id, amount, groupId = 'g1') => request(`/shopping/${id}/purchase`, { method: 'POST', body: JSON.stringify({ amount, groupId: groupKey(groupId) }) }),
  deleteShoppingItem: (id, groupId = 'g1') => request(`/shopping/${id}?groupId=${encodeURIComponent(groupKey(groupId))}`, { method: 'DELETE' }),

  getBalances: (groupId = 'g1', currency = 'INR') => request(`/balances?${new URLSearchParams({ groupId: groupKey(groupId), currency })}`),
  getSimplifiedBalances: (groupId = 'g1') => request(`/balances/${encodeURIComponent(groupKey(groupId))}/simplified`),
  settleBalances: (payload, groupId = 'g1') => request('/settlements', { method: 'POST', body: JSON.stringify({ groupId: groupKey(groupId), ...payload }) }),
  getSettlements: (groupId = 'g1') => request(`/settlements/group/${encodeURIComponent(groupKey(groupId))}`),

  getGroups: () => request('/groups'),
  getGroupsOverview: () => request('/groups/overview'),
  createGroup: (name) => request('/groups', { method: 'POST', body: JSON.stringify({ name }) }),
  addGroupMember: (groupId, email) => request(`/groups/${encodeURIComponent(groupKey(groupId))}/members`, { method: 'POST', body: JSON.stringify({ email }) }),
  createGroupInvite: (groupId, email) => request(`/groups/${encodeURIComponent(groupKey(groupId))}/invites`, { method: 'POST', body: JSON.stringify({ email }) }),
  getGroup: (id = 'g1') => request(`/groups/${encodeURIComponent(groupKey(id))}`),
  updateGroupSettings: (payload, groupId = 'g1') => request(`/groups/${encodeURIComponent(groupKey(groupId))}/settings`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getActivity: (groupId = 'g1') => request(`/activity?groupId=${encodeURIComponent(groupKey(groupId))}`),

  getSummary: (groupId = 'g1') => request(`/reports/summary?groupId=${encodeURIComponent(groupKey(groupId))}`),
  getMonthly: (groupId = 'g1') => request(`/reports/monthly?groupId=${encodeURIComponent(groupKey(groupId))}`),
  joinWaitlist: (email) => request('/waitlist', { method: 'POST', body: JSON.stringify({ email }) }),
  deleteAccount: () => request('/account/delete', { method: 'POST' }),
  getInvitePreview: (token) => request(`/invites/${encodeURIComponent(token)}`, { anonymous: true }),
  acceptInvite: (token) => request(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' }),
  declineInvite: (token) => request(`/invites/${encodeURIComponent(token)}/decline`, { method: 'POST' }),
};

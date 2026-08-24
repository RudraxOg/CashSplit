const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const idempotencyKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

async function request(path, options = {}) {
  const isMutation = options.method && options.method !== 'GET';
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(isMutation ? { 'Idempotency-Key': options.idempotencyKey || idempotencyKey() } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore non-JSON error body */
    }
    throw new Error(message);
  }

  if (res.status === 204) return true;
  return res.json();
}

export const api = {
  getMembers: () => request('/members'),

  getExpenses: () => request('/expenses?groupId=g1'),
  addExpense: (payload) => request('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  updateExpense: (id, payload) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  getExpenseHistory: (id) => request(`/expenses/${id}/history`),
  getExpenseComments: (id) => request(`/expenses/${id}/comments`),
  addExpenseComment: (id, text) => request(`/expenses/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),

  getIncomes: () => request('/incomes'),
  addIncome: (payload) => request('/incomes', { method: 'POST', body: JSON.stringify(payload) }),

  getChores: () => request('/chores'),
  addChore: (payload) => request('/chores', { method: 'POST', body: JSON.stringify(payload) }),
  toggleChore: (id) => request(`/chores/${id}/toggle`, { method: 'PATCH' }),
  deleteChore: (id) => request(`/chores/${id}`, { method: 'DELETE' }),

  getShopping: () => request('/shopping'),
  addShoppingItem: (payload) => request('/shopping', { method: 'POST', body: JSON.stringify(payload) }),
  toggleShoppingItem: (id) => request(`/shopping/${id}/toggle`, { method: 'PATCH' }),
  deleteShoppingItem: (id) => request(`/shopping/${id}`, { method: 'DELETE' }),

  getBalances: () => request('/balances?groupId=g1'),
  getSimplifiedBalances: () => request('/balances/g1/simplified'),
  settleBalances: (payload) => request('/settlements', { method: 'POST', body: JSON.stringify({ groupId: 'g1', ...payload }) }),
  getSettlements: () => request('/settlements/group/g1'),

  getGroups: () => request('/groups'),
  getGroup: (id = 'g1') => request(`/groups/${id}`),
  updateGroupSettings: (payload) => request('/groups/g1/settings', { method: 'PATCH', body: JSON.stringify(payload) }),

  getActivity: () => request('/activity'),

  getSummary: () => request('/reports/summary'),
  getMonthly: () => request('/reports/monthly'),
};

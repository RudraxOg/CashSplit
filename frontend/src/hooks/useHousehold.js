import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

function normalizeGroupId(value) {
  const id = value && typeof value === 'object' ? value.id : value;
  return (typeof id === 'string' || typeof id === 'number') && String(id).trim() && String(id) !== '[object Object]' ? String(id) : '';
}

function readSavedGroupId() {
  const saved = localStorage.getItem('rm-active-group');
  const groupId = normalizeGroupId(saved);
  if (saved && !groupId) localStorage.removeItem('rm-active-group');
  return groupId;
}

/**
 * Owns every piece of server-backed state the app needs and exposes the
 * same mutation functions the original monolithic `App` component had
 * (addExpense, addIncome, toggleChore, ...) — except now each one calls the
 * API instead of mutating local state directly, then reconciles local
 * state from the response.
 */
export function useHousehold() {
  const [groups, setGroups] = useState([]);
  const [groupOverview, setGroupOverview] = useState({ groups: [], combined: { totalExpenses: 0, totalIncome: 0, groupCount: 0 } });
  const [activeGroupId, setActiveGroupId] = useState(readSavedGroupId);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [chores, setChores] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [balances, setBalances] = useState({ currency: 'INR', net: [], pairwise: [], simplified: [], members: [] });
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0, budget: 0, spentPct: 0 });
  const [monthly, setMonthly] = useState([]);
  const [group, setGroup] = useState({ id: 'g1', name: 'My Household', simplifyDebts: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const flash = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const runMutation = useCallback(async (operation, successMessage) => {
    try {
      const result = await operation();
      if (successMessage) flash(successMessage);
      return result;
    } catch (err) {
      flash(err?.message || 'Something went wrong. Please try again.');
      return null;
    }
  }, [flash]);

  const refreshGroups = useCallback(async () => {
    const [nextGroups, nextOverview] = await Promise.all([api.getGroups(), api.getGroupsOverview()]);
    setGroups(nextGroups);
    setGroupOverview(nextOverview);
    if (!nextGroups.length) {
      setActiveGroupId('');
      setLoading(false);
    } else if (!nextGroups.some((groupItem) => groupItem.id === activeGroupId)) {
      setActiveGroupId(nextGroups[0].id);
    }
    return nextGroups;
  }, [activeGroupId]);

  const refreshReports = useCallback(async (groupId = activeGroupId) => {
    const [nextSummary, nextMonthly] = await Promise.all([api.getSummary(groupId), api.getMonthly(groupId)]);
    setSummary(nextSummary);
    setMonthly(nextMonthly);
  }, [activeGroupId]);

  const refreshFinancialState = useCallback(async (groupId = activeGroupId) => {
    const [nextBalances] = await Promise.all([api.getBalances(groupId), refreshReports(groupId), refreshGroups()]);
    setBalances(nextBalances);
  }, [activeGroupId, refreshGroups, refreshReports]);

  const loadAll = useCallback(async (groupId = activeGroupId) => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const [m, e, i, c, s, a, b, sum, mon, household] = await Promise.all([
        api.getMembers(groupId), api.getExpenses(groupId), api.getIncomes(groupId), api.getChores(groupId),
        api.getShopping(groupId), api.getActivity(groupId), api.getBalances(groupId),
        api.getSummary(groupId), api.getMonthly(groupId), api.getGroup(groupId),
      ]);
      setMembers(m); setExpenses(e); setIncomes(i); setChores(c);
      setShoppingItems(s); setActivities(a); setBalances(b);
      setSummary(sum); setMonthly(mon);
      setGroup(household);
    } catch (err) {
      setError(err.message || 'Failed to load household data');
    } finally {
      setLoading(false);
    }
  }, [activeGroupId]);

  useEffect(() => {
    refreshGroups().catch((err) => { setError(err.message || 'Failed to load groups'); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem('rm-active-group', activeGroupId);
      loadAll(activeGroupId);
    }
  }, [activeGroupId, loadAll]);

  const switchGroup = useCallback((group) => {
    const groupId = normalizeGroupId(group);
    if (groupId) setActiveGroupId(groupId);
  }, []);

  const createGroup = useCallback(async (name) => {
    const created = await runMutation(() => api.createGroup(name), 'Group created');
    if (!created) return null;
    await refreshGroups();
    setActiveGroupId(created.id);
    return created;
  }, [refreshGroups, runMutation]);

  const addGroupMember = useCallback(async (email) => {
    const added = await runMutation(() => api.addGroupMember(activeGroupId, email), 'Member connected to group');
    if (!added) return null;
    await Promise.all([refreshGroups(), loadAll(activeGroupId)]);
    return added;
  }, [activeGroupId, loadAll, refreshGroups, runMutation]);

  const createGroupInvite = useCallback(async (email) => {
    return runMutation(() => api.createGroupInvite(activeGroupId, email), 'Invite link created');
  }, [activeGroupId, runMutation]);

  const addExpense = useCallback(async (payload) => {
    if (payload.frequency) {
      const { frequency, timeZone, ...template } = payload;
      const created = await runMutation(() => api.createExpenseSeries({ template: { ...template, groupId: activeGroupId }, frequency, firstDate: template.date, timeZone }), 'Recurring expense scheduled');
      return Boolean(created);
    }
    const created = await runMutation(() => api.addExpense(payload, activeGroupId), 'Expense added');
    if (!created) return false;
    setExpenses((prev) => [created, ...prev]);
    refreshFinancialState(activeGroupId).catch(() => {});
    return true;
  }, [activeGroupId, refreshFinancialState, runMutation]);

  const updateExpense = useCallback(async (id, payload) => {
    const updated = await runMutation(() => api.updateExpense(id, payload, activeGroupId), 'Expense updated');
    if (!updated) return false;
    setExpenses((prev) => prev.map((expense) => (expense.id === id ? updated : expense)));
    refreshFinancialState(activeGroupId).catch(() => {});
    return true;
  }, [activeGroupId, refreshFinancialState, runMutation]);

  const deleteExpense = useCallback(async (id) => {
    const deleted = await runMutation(() => api.deleteExpense(id, activeGroupId), 'Expense deleted');
    if (deleted === null) return false;
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    refreshFinancialState(activeGroupId).catch(() => {});
    return true;
  }, [activeGroupId, refreshFinancialState, runMutation]);

  const addIncome = useCallback(async (payload) => {
    const created = await runMutation(() => api.addIncome(payload, activeGroupId), 'Income added');
    if (!created) return false;
    setIncomes((prev) => [created, ...prev]);
    Promise.all([refreshReports(activeGroupId), refreshGroups()]).catch(() => {});
    return true;
  }, [activeGroupId, refreshGroups, refreshReports, runMutation]);

  const updateIncome = useCallback(async (id, payload) => {
    const updated = await runMutation(() => api.updateIncome(id, payload, activeGroupId), 'Income updated');
    if (!updated) return false;
    setIncomes((prev) => prev.map((income) => (income.id === id ? updated : income)));
    Promise.all([refreshReports(activeGroupId), refreshGroups()]).catch(() => {});
    return true;
  }, [activeGroupId, refreshGroups, refreshReports, runMutation]);

  const deleteIncome = useCallback(async (id) => {
    const deleted = await runMutation(() => api.deleteIncome(id, activeGroupId), 'Income deleted');
    if (deleted === null) return false;
    setIncomes((prev) => prev.filter((income) => income.id !== id));
    Promise.all([refreshReports(activeGroupId), refreshGroups()]).catch(() => {});
    return true;
  }, [activeGroupId, refreshGroups, refreshReports, runMutation]);

  const addChore = useCallback(async (payload) => {
    const created = await runMutation(() => api.addChore(payload, activeGroupId), 'Chore added');
    if (!created) return false;
    setChores((prev) => [created, ...prev]);
    return true;
  }, [activeGroupId, runMutation]);

  const updateChore = useCallback(async (id, payload) => {
    const updated = await runMutation(() => api.updateChore(id, payload, activeGroupId), 'Chore updated');
    if (!updated) return false;
    setChores((prev) => prev.map((chore) => (chore.id === id ? updated : chore)));
    return true;
  }, [activeGroupId, runMutation]);

  const toggleChore = useCallback(async (id) => {
    const updated = await runMutation(() => api.toggleChore(id, activeGroupId));
    if (!updated) return;
    api.getChores(activeGroupId).then(setChores).catch(() => setChores((prev) => prev.map((c) => (c.id === id ? updated : c))));
  }, [activeGroupId, runMutation]);

  const deleteChore = useCallback(async (id) => {
    const deleted = await runMutation(() => api.deleteChore(id, activeGroupId));
    if (deleted === null) return;
    setChores((prev) => prev.filter((c) => c.id !== id));
  }, [activeGroupId, runMutation]);

  const addPurchase = useCallback(async (payload) => {
    const created = await runMutation(() => api.addShoppingItem(payload, activeGroupId), 'Item added to list');
    if (!created) return false;
    setShoppingItems((prev) => [...prev, created]);
    return true;
  }, [activeGroupId, runMutation]);

  const addShoppingQuick = useCallback(async (name) => {
    const created = await runMutation(() => api.addShoppingItem({ name, priority: 'Medium' }, activeGroupId));
    if (!created) return;
    setShoppingItems((prev) => [...prev, created]);
  }, [activeGroupId, runMutation]);

  const toggleShopping = useCallback(async (id) => {
    const updated = await runMutation(() => api.toggleShoppingItem(id, activeGroupId));
    if (!updated) return;
    setShoppingItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, [activeGroupId, runMutation]);

  const purchaseShoppingItem = useCallback(async (id, amount) => {
    const result = await runMutation(() => api.purchaseShoppingItem(id, amount, activeGroupId), 'Purchase added as an equal expense');
    if (!result) return false;
    setShoppingItems((prev) => prev.map((item) => item.id === id ? result.item : item));
    setExpenses((prev) => [result.expense, ...prev]);
    refreshFinancialState(activeGroupId).catch(() => {});
    return true;
  }, [activeGroupId, refreshFinancialState, runMutation]);

  const deleteShopping = useCallback(async (id) => {
    const deleted = await runMutation(() => api.deleteShoppingItem(id, activeGroupId));
    if (deleted === null) return;
    setShoppingItems((prev) => prev.filter((i) => i.id !== id));
  }, [activeGroupId, runMutation]);

  const updateShopping = useCallback(async (id, payload) => {
    const updated = await runMutation(() => api.updateShoppingItem(id, payload, activeGroupId), 'Shopping item updated');
    if (!updated) return false;
    setShoppingItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return true;
  }, [activeGroupId, runMutation]);

  const settleUp = useCallback(async (payload) => {
    const updated = await runMutation(() => api.settleBalances(payload, activeGroupId), 'Settlement recorded');
    if (!updated) return false;
    refreshFinancialState(activeGroupId).catch(() => {});
    return true;
  }, [activeGroupId, refreshFinancialState, runMutation]);

  const updateSimplifyDebts = useCallback(async (simplifyDebts) => {
    const updated = await runMutation(() => api.updateGroupSettings({ simplifyDebts }, activeGroupId), 'Group settings updated');
    if (updated) setGroup(updated);
  }, [activeGroupId, runMutation]);

  const updateDefaultSplit = useCallback(async (defaultSplit) => {
    const updated = await runMutation(() => api.updateGroupSettings({ defaultSplit }, activeGroupId), 'Default split saved');
    if (updated) setGroup(updated);
    return Boolean(updated);
  }, [activeGroupId, runMutation]);

  const updateGroupName = useCallback(async (name) => {
    const updated = await runMutation(() => api.updateGroupSettings({ name }, activeGroupId), 'Household name updated');
    if (!updated) return false;
    setGroup(updated);
    setGroups((current) => current.map((item) => item.id === updated.id ? { ...item, name: updated.name } : item));
    return true;
  }, [activeGroupId, runMutation]);

  const updateMonthlyBudget = useCallback(async (monthlyBudget) => {
    const updated = await runMutation(() => api.updateGroupSettings({ monthlyBudget }, activeGroupId), 'Monthly budget updated');
    if (!updated) return false;
    setGroup(updated);
    setSummary((current) => ({ ...current, budget: updated.monthlyBudget, spentPct: Math.round((current.budgetSpent || 0) / updated.monthlyBudget * 100) }));
    try { await refreshReports(activeGroupId); } catch { flash('Budget saved, but the summary could not refresh'); }
    return true;
  }, [activeGroupId, flash, refreshReports, runMutation]);

  const addExpenseComment = useCallback(async (expenseId, text) => {
    const comment = await runMutation(() => api.addExpenseComment(expenseId, text), 'Comment added');
    if (!comment) return false;
    setExpenses((prev) => prev.map((expense) => expense.id === expenseId ? { ...expense, comments: [comment, ...(expense.comments || [])] } : expense));
    return true;
  }, [runMutation]);

  // Any mutation that writes activity server-side should refresh the feed
  // too — cheap given how small it is, and keeps the bell/notifications
  // panel current without bespoke merge logic per action.
  useEffect(() => {
    if (activeGroupId) api.getActivity(activeGroupId).then(setActivities).catch(() => {});
  }, [activeGroupId, expenses, incomes, chores, shoppingItems, balances]);

  return {
    groups, groupOverview, activeGroupId, members, expenses, incomes, chores, shoppingItems, activities, balances,
    summary, monthly, group, loading, error, toast,
    switchGroup, createGroup, addGroupMember, createGroupInvite,
    addExpense, updateExpense, deleteExpense, addIncome, updateIncome, deleteIncome, addChore, updateChore, toggleChore, deleteChore,
    addPurchase, addShoppingQuick, toggleShopping, updateShopping, purchaseShoppingItem, deleteShopping, settleUp, updateSimplifyDebts, updateGroupName, updateMonthlyBudget, addExpenseComment,
    reload: loadAll, updateDefaultSplit,
  };
}

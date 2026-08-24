import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * Owns every piece of server-backed state the app needs and exposes the
 * same mutation functions the original monolithic `App` component had
 * (addExpense, addIncome, toggleChore, ...) — except now each one calls the
 * API instead of mutating local state directly, then reconciles local
 * state from the response.
 */
export function useHousehold() {
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

  const refreshSummary = useCallback(async () => {
    setSummary(await api.getSummary());
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, e, i, c, s, a, b, sum, mon, household] = await Promise.all([
        api.getMembers(), api.getExpenses(), api.getIncomes(), api.getChores(),
        api.getShopping(), api.getActivity(), api.getBalances(),
        api.getSummary(), api.getMonthly(), api.getGroup('g1'),
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
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addExpense = useCallback(async (payload) => {
    const created = await runMutation(() => api.addExpense(payload), 'Expense added');
    if (!created) return false;
    setExpenses((prev) => [created, ...prev]);
    refreshSummary().catch(() => {});
    return true;
  }, [refreshSummary, runMutation]);

  const addIncome = useCallback(async (payload) => {
    const created = await runMutation(() => api.addIncome(payload), 'Income added');
    if (!created) return false;
    setIncomes((prev) => [created, ...prev]);
    refreshSummary().catch(() => {});
    return true;
  }, [refreshSummary, runMutation]);

  const addChore = useCallback(async (payload) => {
    const created = await runMutation(() => api.addChore(payload), 'Chore added');
    if (!created) return false;
    setChores((prev) => [created, ...prev]);
    return true;
  }, [runMutation]);

  const toggleChore = useCallback(async (id) => {
    const updated = await runMutation(() => api.toggleChore(id));
    if (!updated) return;
    setChores((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, [runMutation]);

  const deleteChore = useCallback(async (id) => {
    const deleted = await runMutation(() => api.deleteChore(id));
    if (deleted === null) return;
    setChores((prev) => prev.filter((c) => c.id !== id));
  }, [runMutation]);

  const addPurchase = useCallback(async (payload) => {
    const created = await runMutation(() => api.addShoppingItem(payload), 'Item added to list');
    if (!created) return false;
    setShoppingItems((prev) => [...prev, created]);
    return true;
  }, [runMutation]);

  const addShoppingQuick = useCallback(async (name) => {
    const created = await runMutation(() => api.addShoppingItem({ name, priority: 'Medium' }));
    if (!created) return;
    setShoppingItems((prev) => [...prev, created]);
  }, [runMutation]);

  const toggleShopping = useCallback(async (id) => {
    const updated = await runMutation(() => api.toggleShoppingItem(id));
    if (!updated) return;
    setShoppingItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, [runMutation]);

  const deleteShopping = useCallback(async (id) => {
    const deleted = await runMutation(() => api.deleteShoppingItem(id));
    if (deleted === null) return;
    setShoppingItems((prev) => prev.filter((i) => i.id !== id));
  }, [runMutation]);

  const settleUp = useCallback(async (payload) => {
    const updated = await runMutation(() => api.settleBalances(payload), 'Settlement recorded');
    if (!updated) return;
    api.getBalances().then(setBalances).catch(() => {});
  }, [runMutation]);

  const updateSimplifyDebts = useCallback(async (simplifyDebts) => {
    const updated = await runMutation(() => api.updateGroupSettings({ simplifyDebts }), 'Group settings updated');
    if (updated) setGroup(updated);
  }, [runMutation]);

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
    api.getActivity().then(setActivities).catch(() => {});
  }, [expenses, incomes, chores, shoppingItems, balances]);

  return {
    members, expenses, incomes, chores, shoppingItems, activities, balances,
    summary, monthly, group, loading, error, toast,
    addExpense, addIncome, addChore, toggleChore, deleteChore,
    addPurchase, addShoppingQuick, toggleShopping, deleteShopping, settleUp, updateSimplifyDebts, addExpenseComment,
    reload: loadAll,
  };
}

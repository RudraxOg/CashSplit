const express = require('express');
const store = require('../data/store');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

router.get('/export', async (req, res, next) => {
  try {
    const { ledgerCsv } = require('../services/expenseQueries');
    const { toExpenseResponse } = require('../services/expenseService');
    const groupId = repository.enabled() ? await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id) : req.query.groupId || 'g1';
    const group = repository.enabled() ? await repository.getGroup(groupId, req.user.id) : store.getGroup(groupId);
    if (!group) return res.status(404).json({ error: 'group not found' });
    const members = repository.enabled() ? group.members : group.memberIds.map((id) => store.MEMBERS.find((m) => m.id === id)).filter(Boolean);
    const settlements = repository.enabled() ? await repository.listSettlements(groupId, req.user.id) : store.getSettlements().filter((s) => s.groupId === groupId);
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="roommate-ledger.csv"');
    const { once } = require('node:events');
    const write = async (line) => { if (!res.write(line)) await once(res, 'drain'); };
    if (repository.enabled()) {
      await write([...ledgerCsv([], [], members)][0]);
      let offset = 0;
      do {
        const batch = await repository.searchExpenses(groupId, req.user.id, {}, { limit: 100, offset });
        let header = true;
        for (const line of ledgerCsv(batch.data, [], members)) { if (header) { header = false; continue; } await write(line); }
        offset = batch.nextOffset;
      } while (offset != null && !res.destroyed);
      let header = true;
      for (const line of ledgerCsv([], settlements, members)) { if (header) { header = false; continue; } await write(line); }
    } else {
      const expenses = store.getExpenses().filter((e) => !e.deletedAt && e.groupId === groupId).map(toExpenseResponse);
      for (const line of ledgerCsv(expenses, settlements, members)) await write(line);
    }
    res.end();
  } catch (error) { if (res.headersSent) res.destroy(error); else next(error); }
});

// The seeded history is useful for showing a six-month trend, but the current
// month must come from the same records used by the rest of the app.  Dates in
// the demo data are display labels ("Aug 1"), while new records use ISO dates,
// so normalize both formats before aggregating.
function monthIndex(value) {
  const text = String(value || '').trim();
  if (/^today$/i.test(text)) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }
  const iso = text.match(/^(\d{4})-(\d{2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) - 1 };

  const match = text.match(/^([A-Za-z]{3,9})/);
  if (!match) return null;
  const month = new Date(`${match[1]} 1, 2000`).getMonth();
  return Number.isNaN(month) ? null : { year: new Date().getFullYear(), month };
}

function currentMonthLabel() {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date());
}

function monthlyReport(groupId = 'g1') {
  const now = new Date();
  const current = { year: now.getFullYear(), month: now.getMonth() };
  const currentLabel = currentMonthLabel();
  const expenses = store.getExpenses().filter((expense) => !expense.deletedAt && (expense.currency || 'INR') === 'INR' && (expense.groupId || 'g1') === groupId);
  const incomes = store.getIncomes().filter((income) => (income.currency || 'INR') === 'INR' && (income.incomeType || 'PERSONAL') === 'HOUSEHOLD' && (income.groupId || 'g1') === groupId);
  const totals = {
    income: incomes.reduce((sum, income) => {
      const date = monthIndex(income.date);
      return date && date.year === current.year && date.month === current.month ? sum + Number(income.amount || 0) : sum;
    }, 0),
    expenses: expenses.reduce((sum, expense) => {
      const date = monthIndex(expense.date);
      return date && date.year === current.year && date.month === current.month ? sum + Number(expense.amount || 0) : sum;
    }, 0),
  };

  return store.MONTHLY.map((entry) => entry.month === currentLabel
    ? { ...entry, income: totals.income, expenses: totals.expenses }
    : entry);
}

// GET /api/reports/summary
// Aggregate totals the Home page cards and Reports page need. Computing
// this on the server keeps the client dumb and keeps the math in one place.
router.get('/summary', async (req, res, next) => {
  if (repository.enabled()) {
    try { const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id); return res.json(await repository.getSummary(groupId, req.user.id)); } catch (error) { return next(error); }
  }
  const expenses = store.getExpenses().filter((expense) => !expense.deletedAt && (expense.currency || 'INR') === 'INR' && (expense.groupId || 'g1') === (req.query.groupId || 'g1'));
  const incomes = store.getIncomes().filter((income) => (income.currency || 'INR') === 'INR' && (income.incomeType || 'PERSONAL') === 'HOUSEHOLD' && (income.groupId || 'g1') === (req.query.groupId || 'g1'));
  const group = store.getGroup(req.query.groupId || 'g1');
  if (!group) return res.status(404).json({ error: 'group not found' });

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpenses;
  const current = { year: new Date().getFullYear(), month: new Date().getMonth() };
  const budgetSpent = expenses.reduce((sum, expense) => { const date = monthIndex(expense.date); return date && date.year === current.year && date.month === current.month ? sum + Number(expense.amount || 0) : sum; }, 0);
  const budget = group.monthlyBudget ?? store.BUDGET;
  const spentPct = Math.max(0, Math.round((budgetSpent / budget) * 100));

  const byCategory = {};
  expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  res.json({
    totalIncome,
    totalExpenses,
    balance,
    budget,
    budgetSpent,
    spentPct,
    byCategory,
  });
});

// GET /api/reports/monthly
router.get('/monthly', async (req, res, next) => {
  if (repository.enabled()) {
    try {
      const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id);
      const [expenses, incomes] = await Promise.all([repository.listExpenses(groupId, req.user.id), repository.listIncomes(groupId, req.user.id)]);
      const months = [];
      const now = new Date();
      for (let offset = 5; offset >= 0; offset -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const year = date.getFullYear(); const month = date.getMonth();
        const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
        const sameMonth = (value) => { const item = new Date(`${value}T00:00:00`); return item.getFullYear() === year && item.getMonth() === month; };
        months.push({ month: label, income: incomes.filter((item) => (item.currency || 'INR') === 'INR' && item.incomeType === 'HOUSEHOLD' && sameMonth(item.date)).reduce((sum, item) => sum + item.amount, 0), expenses: expenses.filter((item) => (item.currency || 'INR') === 'INR' && sameMonth(item.date)).reduce((sum, item) => sum + item.amount, 0) });
      }
      return res.json(months);
    } catch (error) { return next(error); }
  }
  res.json(monthlyReport(req.query.groupId || 'g1'));
});

module.exports = router;

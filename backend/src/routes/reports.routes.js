const express = require('express');
const store = require('../data/store');

const router = express.Router();

// GET /api/reports/summary
// Aggregate totals the Home page cards and Reports page need. Computing
// this on the server keeps the client dumb and keeps the math in one place.
router.get('/summary', (req, res) => {
  const expenses = store.getExpenses().filter((expense) => !expense.deletedAt && (expense.groupId || 'g1') === (req.query.groupId || 'g1'));
  const incomes = store.getIncomes();

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpenses;
  const spentPct = store.BUDGET > 0 ? Math.min(100, Math.max(0, Math.round((totalExpenses / store.BUDGET) * 100))) : 0;

  const byCategory = {};
  expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  res.json({
    totalIncome,
    totalExpenses,
    balance,
    budget: store.BUDGET,
    spentPct,
    byCategory,
  });
});

// GET /api/reports/monthly
router.get('/monthly', (req, res) => {
  res.json(store.MONTHLY);
});

module.exports = router;

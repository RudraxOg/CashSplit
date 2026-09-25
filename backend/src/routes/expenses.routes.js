const express = require('express');
const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { computeSplit, applyReimbursement, ValidationError } = require('../services/splitStrategies');
const { text, positiveAmount, toMinor, integerId, parseBody, expenseSchema } = require('../utils/validation');
const { page } = require('../utils/pagination');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();
const { normalizePayload, normalizeSupabasePayload, toExpenseResponse, createExpense } = require('../services/expenseService');
const { filterExpenses, expenseFilters } = require('../services/expenseQueries');
router.get('/', async (req, res, next) => {
  try {
    const filters = expenseFilters(req.query);
    if (repository.enabled()) {
      const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id);
      return res.json(await repository.searchExpenses(groupId, req.user.id, filters, req.query));
    }
    const groupId = req.query.groupId || 'g1';
    if (!store.getGroup(groupId)) return res.status(404).json({ error: 'group not found' });
    const rows = store.getExpenses().filter((expense) => !expense.deletedAt && (expense.groupId || 'g1') === groupId).map(toExpenseResponse);
    res.json(page(filterExpenses(rows, filters), req.query));
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try { return res.status(201).json(await createExpense(req.body || {}, req.user.id)); } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  if (repository.enabled()) {
    try { const expense = await repository.getExpense(req.params.id, req.user.id); if (!expense) return res.status(404).json({ error: 'expense not found' }); return res.json(expense); } catch (error) { return next(error); }
  }
  const id = integerId(req.params.id);
  const expense = id && store.getExpenseById(id);
  if (!expense || expense.deletedAt) return res.status(404).json({ error: 'expense not found' });
  res.json(toExpenseResponse(expense));
});

router.put('/:id', async (req, res, next) => {
  if (repository.enabled()) {
    try { return res.json(await repository.updateExpense(req.params.id, normalizeSupabasePayload(parseBody(req.body || {}, expenseSchema), req.user.id), req.user.id)); } catch (error) { return next(error); }
  }
  try {
    const id = integerId(req.params.id);
    const existing = id && store.getExpenseById(id);
    if (!existing || existing.deletedAt) return res.status(404).json({ error: 'expense not found' });
    const data = normalizePayload(parseBody(req.body || {}, expenseSchema), existing);
    const updated = store.updateExpense(id, { ...data, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
    store.replaceExpenseLedger(id, data.payers, data.shares, data.items);
    store.addExpenseHistory({ id: store.genId(), expenseId: id, action: 'updated', snapshot: toExpenseResponse(updated), createdAt: new Date().toISOString() });
    pushActivity({ groupId: data.groupId, kind: 'expense', text: 'Updated an expense', detail: `${data.description} · ${data.currency} ${data.totalAmount}` });
    res.json(toExpenseResponse(updated));
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  if (repository.enabled()) {
    try { await repository.deleteExpense(req.params.id, req.user.id); return res.status(204).end(); } catch (error) { return next(error); }
  }
  const id = integerId(req.params.id);
  const expense = id && store.getExpenseById(id);
  if (!expense || expense.deletedAt) return res.status(404).json({ error: 'expense not found' });
  store.updateExpense(id, { deletedAt: new Date().toISOString() });
  store.addExpenseHistory({ id: store.genId(), expenseId: id, action: 'deleted', snapshot: toExpenseResponse(expense), createdAt: new Date().toISOString() });
  pushActivity({ groupId: expense.groupId, kind: 'expense', text: 'Deleted an expense', detail: expense.description });
  res.status(204).end();
});

router.get('/:id/history', (req, res) => {
  if (repository.enabled()) return repository.getExpenseHistory(req.params.id, req.user.id).then((rows) => res.json(rows)).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const id = integerId(req.params.id);
  if (!id || !store.getExpenseById(id)) return res.status(404).json({ error: 'expense not found' });
  res.json(store.getExpenseHistory(id));
});

router.get('/:id/comments', (req, res) => {
  if (repository.enabled()) return repository.getComments(req.params.id, req.user.id).then((rows) => res.json(rows)).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const id = integerId(req.params.id);
  if (!id || !store.getExpenseById(id)) return res.status(404).json({ error: 'expense not found' });
  res.json(store.getComments(id));
});

router.post('/:id/comments', (req, res, next) => {
  if (repository.enabled()) {
    const result = text(req.body?.text, 'text', { max: 500 });
    if (result.error) return res.status(400).json({ error: result.error });
    return repository.addComment(req.params.id, result.value, req.user.id).then((comment) => res.status(201).json({ ...comment, text: comment.body })).catch(next);
  }
  try {
    const id = integerId(req.params.id);
    if (!id || !store.getExpenseById(id)) return res.status(404).json({ error: 'expense not found' });
    const result = text(req.body?.text, 'text', { max: 500 });
    if (result.error) return res.status(400).json({ error: result.error });
    const comment = store.addComment({ id: store.genId(), expenseId: id, userId: req.body.userId || 'krishna', text: result.value, createdAt: new Date().toISOString() });
    pushActivity({ kind: 'comment', text: 'Added a comment to an expense', detail: result.value });
    res.status(201).json(comment);
  } catch (error) { next(error); }
});

module.exports = router;

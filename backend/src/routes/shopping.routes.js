const express = require('express');
const store = require('../data/store');
const { pushActivity } = require('../utils/activity');
const { text, integerId } = require('../utils/validation');
const repository = require('../repositories/supabaseRepository');
const { computeSplit, ValidationError } = require('../services/splitStrategies');
const { toMinor, positiveAmount } = require('../utils/validation');

const router = express.Router();

// GET /api/shopping
router.get('/', async (req, res, next) => {
  if (repository.enabled()) { try { const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id); return res.json(await repository.listShopping(groupId, req.user.id)); } catch (error) { return next(error); } }
  res.json(store.getShopping().filter((item) => (item.groupId || 'g1') === (req.query.groupId || 'g1')));
});

// POST /api/shopping  { name, priority }
router.post('/', async (req, res, next) => {
  if (repository.enabled()) { try { return res.status(201).json(await repository.createShopping(req.body || {}, req.user.id)); } catch (error) { return next(error); } }
  const { name, priority } = req.body;
  const nameResult = text(name, 'name');
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  const validPriorities = ['High', 'Medium', 'Low'];
  if (priority !== undefined && !validPriorities.includes(priority)) return res.status(400).json({ error: 'priority is invalid' });

  const item = store.addShoppingItem({
    id: store.genId(),
    groupId: req.body.groupId || 'g1',
    name: nameResult.value,
    priority: priority || 'Medium',
    purchased: false,
  });
  pushActivity({ groupId: item.groupId, kind: 'shopping', text: 'Added a shopping item', detail: item.name });
  res.status(201).json(item);
});

router.put('/:id', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.updateShopping(req.params.id, req.body || {}, req.user.id)); } catch (error) { return next(error); } }
  const id = integerId(req.params.id); const existing = id && store.getShopping().find((item) => item.id === id);
  if (!existing) return res.status(404).json({ error: 'item not found' });
  const nameResult = text(req.body?.name, 'name'); const validPriorities = ['High', 'Medium', 'Low'];
  if (nameResult.error || !validPriorities.includes(req.body?.priority)) return res.status(400).json({ error: nameResult.error || 'priority is invalid' });
  return res.json(store.updateShoppingItem(id, { name: nameResult.value, priority: req.body.priority, purchased: Boolean(req.body.purchased) }));
});

// POST /api/shopping/:id/purchase { amount }
// Records the purchase as an equally split household expense and only marks
// the shopping item purchased after the expense has been created.
router.post('/:id/purchase', async (req, res, next) => {
  if (repository.enabled()) {
    try { return res.status(201).json(await repository.purchaseShopping(req.params.id, req.body?.amount, req.user.id)); } catch (error) { return next(error); }
  }
  try {
    const id = integerId(req.params.id);
    const item = id && store.getShopping().find((entry) => entry.id === id);
    if (!item) return res.status(404).json({ error: 'item not found' });
    if (item.purchased) return res.status(409).json({ error: 'shopping item is already purchased' });
    const amountResult = positiveAmount(req.body?.amount);
    if (amountResult.error) return res.status(400).json({ error: amountResult.error });
    const participants = store.MEMBERS.map((member) => ({ userId: member.id }));
    const shares = computeSplit('EQUAL', amountResult.value, participants);
    const actor = store.MEMBERS.find((member) => member.id === (req.user?.id || 'krishna')) || store.MEMBERS[0];
    const expense = {
      id: store.genId(), groupId: item.groupId || req.body?.groupId || 'g1', description: item.name, note: item.name,
      totalAmount: amountResult.value, amount: amountResult.value, totalAmountMinor: toMinor(amountResult.value),
      currency: 'INR', category: 'Groceries', categoryId: 'Groceries', splitType: 'EQUAL',
      date: new Date().toISOString().slice(0, 10), createdBy: actor.id, paidBy: actor.name, deletedAt: null,
    };
    store.addExpenseRecord(expense, [{ userId: actor.id, paidAmount: amountResult.value, paidAmountMinor: toMinor(amountResult.value) }], shares.map((share) => ({ ...share, owedAmountMinor: toMinor(share.owedAmount) })));
    const updated = store.updateShoppingItem(id, { purchased: true, purchasedAt: new Date().toISOString(), purchaseAmount: amountResult.value });
    pushActivity({ groupId: expense.groupId, kind: 'expense', text: `${actor.name} bought ${item.name}`, detail: `Added expense · ₹${amountResult.value.toLocaleString('en-IN')}` });
    const expenseResponse = {
      ...expense,
      payers: [{ userId: actor.id, paidAmount: amountResult.value, paidAmountMinor: toMinor(amountResult.value) }],
      shares: shares.map((share) => ({ ...share, owedAmountMinor: toMinor(share.owedAmount) })),
      participants: shares.map((share) => ({ ...share, owedAmountMinor: toMinor(share.owedAmount), name: store.MEMBERS.find((member) => member.id === share.userId)?.name || share.userId })),
      items: [], comments: [],
    };
    return res.status(201).json({ item: updated, expense: expenseResponse });
  } catch (error) { return next(error instanceof ValidationError ? error : error); }
});

// PATCH /api/shopping/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  if (repository.enabled()) return repository.toggleShopping(req.params.id, req.user.id).then((row) => res.json(row)).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  const existing = store.getShopping().find((i) => i.id === id);
  if (!existing) return res.status(404).json({ error: 'item not found' });

  const updated = store.updateShoppingItem(id, { purchased: !existing.purchased });
  pushActivity({ groupId: updated.groupId, kind: 'shopping', text: `${updated.purchased ? 'Bought' : 'Added back'} a shopping item`, detail: updated.name });
  res.json(updated);
});

// DELETE /api/shopping/:id
router.delete('/:id', (req, res) => {
  if (repository.enabled()) return repository.deleteShopping(req.params.id, req.user.id).then(() => res.status(204).end()).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  if (!store.getShopping().some((item) => item.id === id)) return res.status(404).json({ error: 'item not found' });
  store.deleteShoppingItem(id);
  res.status(204).end();
});

module.exports = router;

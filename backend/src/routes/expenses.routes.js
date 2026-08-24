const express = require('express');
const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { computeSplit, applyReimbursement, ValidationError } = require('../services/splitStrategies');
const { text, positiveAmount, toMinor, integerId, parseBody, expenseSchema } = require('../utils/validation');
const { page } = require('../utils/pagination');

const router = express.Router();
const ROUNDING = 0.01;

function memberById(userId) { return store.MEMBERS.find((member) => member.id === userId); }
function validateMemberIds(ids) {
  const unique = [...new Set(ids)];
  if (!unique.length) throw new ValidationError('At least one participant is required');
  if (unique.some((id) => !memberById(id))) throw new ValidationError('All participants must be household members');
  return unique;
}

function toExpenseResponse(expense) {
  const payers = store.getExpensePayers(expense.id);
  const shares = store.getExpenseShares(expense.id);
  return {
    ...expense,
    payers,
    shares,
    participants: shares.map((share) => ({ ...share, name: memberById(share.userId)?.name || share.userId })),
    items: store.getExpenseItems(expense.id),
    comments: store.getComments(expense.id),
  };
}

function normalizePayload(body, existing = null) {
  const totalAmount = body.totalAmount ?? body.amount ?? existing?.totalAmount;
  const amountResult = positiveAmount(totalAmount);
  if (amountResult.error) throw new ValidationError(amountResult.error);
  const descriptionResult = text(body.description ?? body.note ?? existing?.description, 'description', { max: 160 });
  if (descriptionResult.error) throw new ValidationError(descriptionResult.error);
  const groupId = body.groupId || existing?.groupId || 'g1';
  if (!store.getGroup(groupId)) throw new ValidationError('group not found');

  const splitType = String(body.splitType || existing?.splitType || 'EQUAL').toUpperCase();
  const participants = body.participants || (existing ? store.getExpenseShares(existing.id).map((share) => ({ userId: share.userId })) : store.MEMBERS.map((member) => ({ userId: member.id })));
  const participantIds = validateMemberIds(participants.map((participant) => participant.userId));
  const payers = body.payers || (body.paidBy ? [{ userId: store.MEMBERS.find((member) => member.name === body.paidBy)?.id, paidAmount: amountResult.value }] : existing ? store.getExpensePayers(existing.id) : [{ userId: 'krishna', paidAmount: amountResult.value }]);
  if (!Array.isArray(payers) || !payers.length) throw new ValidationError('At least one payer is required');
  if (payers.some((payer) => !memberById(payer.userId))) throw new ValidationError('All payers must be household members');
  const payerTotal = payers.reduce((sum, payer) => sum + Number(payer.paidAmount), 0);
  if (!Number.isFinite(payerTotal) || Math.abs(Math.round(payerTotal * 100) - Math.round(amountResult.value * 100)) > ROUNDING) {
    throw new ValidationError('Payer amounts must add up to the total');
  }

  let shares = splitType === 'ITEMIZED'
    ? computeSplit(splitType, amountResult.value, { items: body.items, tax: body.tax || 0, tip: body.tip || 0, discount: body.discount || 0 })
    : computeSplit(splitType, amountResult.value, participants);
  if (body.reimbursement) shares = applyReimbursement(shares, body.reimbursementPayerId || payers[0].userId);

  return {
    groupId, description: descriptionResult.value, note: descriptionResult.value,
    totalAmount: amountResult.value, amount: amountResult.value,
    currency: body.currency || existing?.currency || 'INR',
    categoryId: body.categoryId || body.category || existing?.categoryId || 'Others',
    category: body.category || body.categoryId || existing?.category || 'Others',
    splitType, date: body.date || existing?.date || new Date().toISOString().slice(0, 10),
    createdBy: body.createdBy || existing?.createdBy || 'krishna',
    paidBy: memberById(payers[0].userId)?.name || 'Krishna',
    reimbursement: Boolean(body.reimbursement),
    payers: payers.map((payer) => ({ userId: payer.userId, paidAmount: Number(payer.paidAmount), paidAmountMinor: toMinor(payer.paidAmount) })),
    shares: shares.map((share) => ({ ...share, owedAmountMinor: toMinor(share.owedAmount) })),
    items: splitType === 'ITEMIZED' ? (body.items || []) : [],
  };
}

router.get('/', (req, res) => {
  const groupId = req.query.groupId || 'g1';
  res.json(page(store.getExpenses().filter((expense) => !expense.deletedAt && (expense.groupId || 'g1') === groupId).map(toExpenseResponse), req.query));
});

router.post('/', (req, res, next) => {
  try {
    const data = normalizePayload(parseBody(req.body || {}, expenseSchema));
    const expense = {
      id: store.genId(), ...data,
      totalAmountMinor: toMinor(data.totalAmount),
      createdAt: new Date().toISOString(), deletedAt: null,
    };
    delete expense.payers;
    delete expense.shares;
    delete expense.items;
    store.addExpenseRecord(expense, data.payers, data.shares, data.items);
    store.addExpenseHistory({ id: store.genId(), expenseId: expense.id, action: 'created', snapshot: toExpenseResponse(expense), createdAt: new Date().toISOString() });
    pushActivity({ kind: 'expense', text: `${actorLabel(memberById(data.createdBy)?.name || 'Krishna')} added an expense`, detail: `${data.description} · ${data.currency} ${data.totalAmount}` });
    res.status(201).json(toExpenseResponse(expense));
  } catch (error) { next(error); }
});

router.get('/:id', (req, res) => {
  const id = integerId(req.params.id);
  const expense = id && store.getExpenseById(id);
  if (!expense || expense.deletedAt) return res.status(404).json({ error: 'expense not found' });
  res.json(toExpenseResponse(expense));
});

router.put('/:id', (req, res, next) => {
  try {
    const id = integerId(req.params.id);
    const existing = id && store.getExpenseById(id);
    if (!existing || existing.deletedAt) return res.status(404).json({ error: 'expense not found' });
    const data = normalizePayload(parseBody(req.body || {}, expenseSchema), existing);
    const updated = store.updateExpense(id, { ...data, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
    store.replaceExpenseLedger(id, data.payers, data.shares, data.items);
    store.addExpenseHistory({ id: store.genId(), expenseId: id, action: 'updated', snapshot: toExpenseResponse(updated), createdAt: new Date().toISOString() });
    pushActivity({ kind: 'expense', text: 'Updated an expense', detail: `${data.description} · ${data.currency} ${data.totalAmount}` });
    res.json(toExpenseResponse(updated));
  } catch (error) { next(error); }
});

router.delete('/:id', (req, res) => {
  const id = integerId(req.params.id);
  const expense = id && store.getExpenseById(id);
  if (!expense || expense.deletedAt) return res.status(404).json({ error: 'expense not found' });
  store.updateExpense(id, { deletedAt: new Date().toISOString() });
  store.addExpenseHistory({ id: store.genId(), expenseId: id, action: 'deleted', snapshot: toExpenseResponse(expense), createdAt: new Date().toISOString() });
  pushActivity({ kind: 'expense', text: 'Deleted an expense', detail: expense.description });
  res.status(204).end();
});

router.get('/:id/history', (req, res) => {
  const id = integerId(req.params.id);
  if (!id || !store.getExpenseById(id)) return res.status(404).json({ error: 'expense not found' });
  res.json(store.getExpenseHistory(id));
});

router.get('/:id/comments', (req, res) => {
  const id = integerId(req.params.id);
  if (!id || !store.getExpenseById(id)) return res.status(404).json({ error: 'expense not found' });
  res.json(store.getComments(id));
});

router.post('/:id/comments', (req, res, next) => {
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

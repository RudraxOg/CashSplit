const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { computeSplit, applyReimbursement, ValidationError } = require('./splitStrategies');
const { text, positiveAmount, toMinor, parseBody, expenseSchema } = require('../utils/validation');
const repository = require('../repositories/supabaseRepository');
const ROUNDING = 0.01;

function memberById(userId) { return store.MEMBERS.find((member) => member.id === userId); }
function validateMemberIds(ids, groupId = 'g1') {
  const unique = [...new Set(ids)];
  if (!unique.length) throw new ValidationError('At least one participant is required');
  const group = store.getGroup(groupId);
  if (unique.some((id) => !memberById(id) || !group?.memberIds.includes(id))) throw new ValidationError('All participants must be household members');
  return unique;
}

function normalizeSupabasePayload(body, actorId) {
  const totalAmount = Number(body.totalAmount ?? body.amount);
  const description = String(body.description ?? body.note ?? '').trim();
  if (!description) throw new ValidationError('description is required');
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new ValidationError('amount must be a positive number');
  const splitType = String(body.splitType || 'EQUAL').toUpperCase();
  const participants = Array.isArray(body.participants) ? body.participants : [{ userId: actorId }];
  const payers = Array.isArray(body.payers) && body.payers.length ? body.payers : [{ userId: actorId, paidAmount: totalAmount }];
  const payerTotal = payers.reduce((sum, payer) => sum + Number(payer.paidAmount), 0);
  if (Math.abs(payerTotal - totalAmount) > 0.01) throw new ValidationError('Payer amounts must add up to the total');
  let shares = splitType === 'ITEMIZED'
    ? computeSplit(splitType, totalAmount, { items: body.items, tax: body.tax || 0, tip: body.tip || 0, discount: body.discount || 0 })
    : computeSplit(splitType, totalAmount, participants);
  if (body.reimbursement) shares = applyReimbursement(shares, body.reimbursementPayerId || payers[0].userId);
  return { ...body, groupId: body.groupId || 'g1', description, totalAmount, amount: totalAmount, splitType, createdBy: actorId, payers, shares, items: body.items || [] };
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
  const participants = body.participants || (existing ? store.getExpenseShares(existing.id).map((share) => ({ userId: share.userId })) : store.getGroup(groupId).memberIds.map((userId) => ({ userId })));
  const participantIds = validateMemberIds(participants.map((participant) => participant.userId), groupId);
  const payers = body.payers || (body.paidBy ? [{ userId: store.MEMBERS.find((member) => member.name === body.paidBy)?.id, paidAmount: amountResult.value }] : existing ? store.getExpensePayers(existing.id) : [{ userId: 'krishna', paidAmount: amountResult.value }]);
  if (!Array.isArray(payers) || !payers.length) throw new ValidationError('At least one payer is required');
  if (payers.some((payer) => !memberById(payer.userId) || !store.getGroup(groupId)?.memberIds.includes(payer.userId))) throw new ValidationError('All payers must be household members');
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


async function createExpense(body, actorId = 'krishna') {
  const parsed = parseBody(body, expenseSchema);
  if (repository.enabled()) return repository.createExpense(normalizeSupabasePayload(parsed, actorId), actorId);
  const data = normalizePayload(parsed);
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
    pushActivity({ groupId: data.groupId, kind: 'expense', text: `${actorLabel(memberById(data.createdBy)?.name || 'Krishna')} added an expense`, detail: `${data.description} · ${data.currency} ${data.totalAmount}` });
  return toExpenseResponse(expense);
}
module.exports = { normalizePayload, normalizeSupabasePayload, toExpenseResponse, createExpense };

const express = require('express');
const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { text, positiveAmount } = require('../utils/validation');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

function migrationAwareError(error) {
  if (/income_type|owner_user_id/i.test(`${error.message || ''} ${error.cause?.message || ''}`)) {
    error.statusCode = 503;
    error.message = 'Income ownership migration is not applied. Apply 20260925170000_separate_personal_income.sql, then retry.';
  }
  return error;
}

function incomeOwnership(body, members) {
  const incomeType = body?.incomeType || 'PERSONAL';
  if (!['PERSONAL', 'HOUSEHOLD'].includes(incomeType)) return { error: 'incomeType must be PERSONAL or HOUSEHOLD' };
  if (incomeType === 'HOUSEHOLD') return { incomeType, ownerUserId: null, ownerName: null };
  const owner = members.find((member) => member.id === body?.ownerUserId || member.name === body?.addedBy);
  if (!owner) return { error: 'Choose a household member for this personal income' };
  return { incomeType, ownerUserId: owner.id, ownerName: owner.name };
}

// GET /api/incomes
router.get('/', async (req, res, next) => {
  if (repository.enabled()) { try { const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id); return res.json(await repository.listIncomes(groupId, req.user.id)); } catch (error) { return next(error); } }
  const groupId = req.query.groupId || 'g1';
  res.json(store.getIncomes().filter((item) => (item.groupId || 'g1') === groupId));
});

// POST /api/incomes  { source, amount, addedBy }
router.post('/', async (req, res, next) => {
  if (repository.enabled()) { try { return res.status(201).json(await repository.createIncome(req.body || {}, req.user.id)); } catch (error) { return next(migrationAwareError(error)); } }
  const { source, amount } = req.body;

  const sourceResult = text(source, 'source', { max: 100 });
  const amountResult = positiveAmount(amount);
  const groupId = req.body.groupId || 'g1';
  const group = store.getGroup(groupId);
  if (!group) return res.status(404).json({ error: 'group not found' });
  const ownership = incomeOwnership(req.body, group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean));
  if (sourceResult.error) return res.status(400).json({ error: sourceResult.error });
  if (amountResult.error) return res.status(400).json({ error: amountResult.error });
  if (ownership.error) return res.status(400).json({ error: ownership.error });

  const income = store.addIncome({
    id: store.genId(),
    groupId,
    source: sourceResult.value,
    amount: amountResult.value,
    incomeType: ownership.incomeType,
    ownerUserId: ownership.ownerUserId,
    ownerName: ownership.ownerName,
    addedBy: ownership.ownerName || 'Household',
    date: 'Today',
  });

  pushActivity({
    groupId: income.groupId,
    kind: 'income',
    text: `${actorLabel(ownership.ownerName || 'Household')} added income`,
    detail: `${sourceResult.value} · ₹${amountResult.value.toLocaleString('en-IN')}`,
  });

  res.status(201).json(income);
});

router.put('/:id', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.updateIncome(req.params.id, req.body || {}, req.user.id)); } catch (error) { return next(migrationAwareError(error)); } }
  const id = Number(req.params.id); const existing = store.getIncomes().find((item) => item.id === id);
  if (!existing) return res.status(404).json({ error: 'income not found' });
  const sourceResult = text(req.body?.source, 'source', { max: 100 }); const amountResult = positiveAmount(req.body?.amount);
  if (sourceResult.error || amountResult.error) return res.status(400).json({ error: sourceResult.error || amountResult.error });
  const group = store.getGroup(existing.groupId || 'g1');
  const ownership = req.body?.incomeType !== undefined || req.body?.ownerUserId !== undefined || req.body?.addedBy !== undefined
    ? incomeOwnership(req.body, group?.memberIds.map((memberId) => store.MEMBERS.find((member) => member.id === memberId)).filter(Boolean) || [])
    : { incomeType: existing.incomeType || 'PERSONAL', ownerUserId: existing.ownerUserId || null, ownerName: existing.ownerName || existing.addedBy };
  if (ownership.error) return res.status(400).json({ error: ownership.error });
  return res.json(store.updateIncome(id, { source: sourceResult.value, amount: amountResult.value, date: req.body?.date || existing.date, ...ownership, addedBy: ownership.ownerName || 'Household' }));
});

router.delete('/:id', async (req, res, next) => {
  if (repository.enabled()) { try { await repository.deleteIncome(req.params.id, req.user.id); return res.status(204).end(); } catch (error) { return next(error); } }
  const id = Number(req.params.id); if (!store.getIncomes().some((item) => item.id === id)) return res.status(404).json({ error: 'income not found' });
  store.deleteIncome(id); return res.status(204).end();
});

module.exports = router;

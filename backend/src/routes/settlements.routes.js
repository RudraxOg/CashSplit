const express = require('express');
const store = require('../data/store');
const { calculate } = require('../services/balances');
const { simplifyDebts } = require('../services/simplifyDebts');
const { pushActivity } = require('../utils/activity');
const { positiveAmount, toMinor, text, parseBody, settlementSchema } = require('../utils/validation');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

router.post('/', async (req, res, next) => {
  if (repository.enabled()) { try { const body = parseBody(req.body || {}, settlementSchema); const balances = await repository.calculateBalances(body.groupId || 'g1', req.user.id, body.currency); const allowed = [...balances.pairwise, ...balances.simplified].find((edge) => edge.fromUserId === body.fromUserId && edge.toUserId === body.toUserId); if (!allowed || body.amount > allowed.amount + 0.01) return res.status(400).json({ error: 'settlement exceeds the outstanding balance' }); const created = await repository.createSettlement(body, req.user.id); return res.status(201).json({ ...created, balances: await repository.calculateBalances(body.groupId || 'g1', req.user.id, body.currency) }); } catch (error) { return next(error); } }
  const { groupId = 'g1', currency = 'INR', fromUserId, toUserId, amount, method = 'cash', note = '' } = parseBody(req.body || {}, settlementSchema);
  if (!store.getGroup(groupId)) return res.status(400).json({ error: 'group not found' });
  if (!store.MEMBERS.some((member) => member.id === fromUserId) || !store.MEMBERS.some((member) => member.id === toUserId)) return res.status(400).json({ error: 'fromUserId and toUserId must be household members' });
  if (fromUserId === toUserId) return res.status(400).json({ error: 'settlement participants must be different' });
  const amountResult = positiveAmount(amount);
  if (amountResult.error) return res.status(400).json({ error: amountResult.error });
  const current = calculate(groupId, currency);
  const allowed = [...current.pairwise, ...simplifyDebts(current.netMap)].find((edge) => edge.fromUserId === fromUserId && edge.toUserId === toUserId);
  if (!allowed) return res.status(400).json({ error: 'no outstanding balance exists between these members' });
  if (amountResult.value > allowed.amount + 0.01) return res.status(400).json({ error: `settlement cannot exceed the outstanding ${allowed.amount}` });
  const noteResult = note ? text(note, 'note', { max: 200 }) : { value: '' };
  if (noteResult.error) return res.status(400).json({ error: noteResult.error });
  const settlement = store.addSettlement({ id: store.genId(), groupId, fromUserId, toUserId, amount: amountResult.value, amountMinor: toMinor(amountResult.value), currency, method, note: noteResult.value, settledAt: new Date().toISOString() });
  const fromName = store.MEMBERS.find((member) => member.id === fromUserId)?.name;
  const toName = store.MEMBERS.find((member) => member.id === toUserId)?.name;
  pushActivity({ groupId, kind: 'settle', text: `${fromName} paid ${toName}`, detail: `₹${amountResult.value}` });
  res.status(201).json({ ...settlement, balances: calculate(groupId, currency) });
});

router.get('/group/:groupId', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.listSettlements(req.params.groupId, req.user.id)); } catch (error) { return next(error); } }
  if (!store.getGroup(req.params.groupId)) return res.status(404).json({ error: 'group not found' });
  res.json(store.getSettlements().filter((settlement) => settlement.groupId === req.params.groupId));
});

module.exports = router;

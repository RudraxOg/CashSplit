const express = require('express');
const store = require('../data/store');
const { calculate } = require('../services/balances');
const { simplifyDebts } = require('../services/simplifyDebts');
const { pushActivity } = require('../utils/activity');
const { positiveAmount, toMinor, text, parseBody, settlementSchema } = require('../utils/validation');

const router = express.Router();

router.post('/', (req, res) => {
  const { groupId = 'g1', fromUserId, toUserId, amount, method = 'cash', note = '' } = parseBody(req.body || {}, settlementSchema);
  if (!store.getGroup(groupId)) return res.status(400).json({ error: 'group not found' });
  if (!store.MEMBERS.some((member) => member.id === fromUserId) || !store.MEMBERS.some((member) => member.id === toUserId)) return res.status(400).json({ error: 'fromUserId and toUserId must be household members' });
  if (fromUserId === toUserId) return res.status(400).json({ error: 'settlement participants must be different' });
  const amountResult = positiveAmount(amount);
  if (amountResult.error) return res.status(400).json({ error: amountResult.error });
  const current = calculate(groupId);
  const allowed = [...current.pairwise, ...simplifyDebts(current.netMap)].find((edge) => edge.fromUserId === fromUserId && edge.toUserId === toUserId);
  if (!allowed) return res.status(400).json({ error: 'no outstanding balance exists between these members' });
  if (amountResult.value > allowed.amount + 0.01) return res.status(400).json({ error: `settlement cannot exceed the outstanding ${allowed.amount}` });
  const noteResult = note ? text(note, 'note', { max: 200 }) : { value: '' };
  if (noteResult.error) return res.status(400).json({ error: noteResult.error });
  const settlement = store.addSettlement({ id: store.genId(), groupId, fromUserId, toUserId, amount: amountResult.value, amountMinor: toMinor(amountResult.value), currency: 'INR', method, note: noteResult.value, settledAt: new Date().toISOString() });
  const fromName = store.MEMBERS.find((member) => member.id === fromUserId)?.name;
  const toName = store.MEMBERS.find((member) => member.id === toUserId)?.name;
  pushActivity({ kind: 'settle', text: `${fromName} paid ${toName}`, detail: `₹${amountResult.value}` });
  res.status(201).json({ ...settlement, balances: calculate(groupId) });
});

router.get('/group/:groupId', (req, res) => {
  if (!store.getGroup(req.params.groupId)) return res.status(404).json({ error: 'group not found' });
  res.json(store.getSettlements().filter((settlement) => settlement.groupId === req.params.groupId));
});

module.exports = router;

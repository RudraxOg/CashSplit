const express = require('express');
const store = require('../data/store');
const { text } = require('../utils/validation');

const router = express.Router();

router.get('/', (req, res) => res.json(store.GROUPS));

router.post('/', (req, res) => {
  const result = text(req.body?.name, 'name', { max: 80 });
  if (result.error) return res.status(400).json({ error: result.error });
  const group = { id: `g${store.genId()}`, name: result.value, simplifyDebts: false, memberIds: ['krishna'], createdAt: new Date().toISOString() };
  store.GROUPS.push(group);
  res.status(201).json(group);
});

router.get('/:id', (req, res) => {
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json({ ...group, members: group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean) });
});

router.patch('/:id/settings', (req, res) => {
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  if (typeof req.body?.simplifyDebts !== 'boolean') return res.status(400).json({ error: 'simplifyDebts must be a boolean' });
  group.simplifyDebts = req.body.simplifyDebts;
  res.json(group);
});

router.get('/:id/members', (req, res) => {
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean));
});

router.get('/:id/expenses', (req, res) => {
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(store.getExpenses().filter((expense) => !expense.deletedAt && (expense.groupId || 'g1') === group.id));
});

module.exports = router;

const express = require('express');
const store = require('../data/store');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

// GET /api/members
router.get('/', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.listMembers(req.query.groupId || 'g1', req.user.id)); } catch (error) { return next(error); } }
  const group = store.getGroup(req.query.groupId || 'g1');
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean));
});

router.get('/:id', (req, res) => {
  const member = store.MEMBERS.find((item) => item.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'member not found' });
  res.json(member);
});

module.exports = router;

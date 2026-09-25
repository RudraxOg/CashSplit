const express = require('express');
const store = require('../data/store');
const { page } = require('../utils/pagination');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

// GET /api/activity
router.get('/', async (req, res, next) => {
  if (repository.enabled()) { try { const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id); return res.json(await repository.listActivities(groupId, req.user.id)); } catch (error) { return next(error); } }
  res.json(page(store.getActivity().filter((item) => (item.groupId || 'g1') === (req.query.groupId || 'g1')), req.query));
});

router.get('/group/:groupId', (req, res) => {
  if (!store.getGroup(req.params.groupId)) return res.status(404).json({ error: 'group not found' });
  res.json(page(store.getActivity().filter((item) => (item.groupId || 'g1') === req.params.groupId), req.query));
});

module.exports = router;

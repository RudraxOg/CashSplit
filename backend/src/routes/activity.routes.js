const express = require('express');
const store = require('../data/store');
const { page } = require('../utils/pagination');

const router = express.Router();

// GET /api/activity
router.get('/', (req, res) => {
  res.json(page(store.getActivity(), req.query));
});

router.get('/group/:groupId', (req, res) => {
  if (!store.getGroup(req.params.groupId)) return res.status(404).json({ error: 'group not found' });
  res.json(page(store.getActivity(), req.query));
});

module.exports = router;

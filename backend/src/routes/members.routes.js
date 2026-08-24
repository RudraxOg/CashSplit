const express = require('express');
const store = require('../data/store');

const router = express.Router();

// GET /api/members
router.get('/', (req, res) => {
  res.json(store.MEMBERS);
});

router.get('/:id', (req, res) => {
  const member = store.MEMBERS.find((item) => item.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'member not found' });
  res.json(member);
});

module.exports = router;

const express = require('express');
const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { text, positiveAmount, memberName } = require('../utils/validation');

const router = express.Router();

// GET /api/incomes
router.get('/', (req, res) => {
  res.json(store.getIncomes());
});

// POST /api/incomes  { source, amount, addedBy }
router.post('/', (req, res) => {
  const { source, amount, addedBy } = req.body;

  const sourceResult = text(source, 'source', { max: 100 });
  const amountResult = positiveAmount(amount);
  const addedByResult = memberName(addedBy, store.MEMBERS);
  if (sourceResult.error) return res.status(400).json({ error: sourceResult.error });
  if (amountResult.error) return res.status(400).json({ error: amountResult.error });
  if (addedByResult.error) return res.status(400).json({ error: addedByResult.error });

  const income = store.addIncome({
    id: store.genId(),
    source: sourceResult.value,
    amount: amountResult.value,
    addedBy: addedByResult.value,
    date: 'Today',
  });

  pushActivity({
    kind: 'income',
    text: `${actorLabel(addedByResult.value)} added income`,
    detail: `${sourceResult.value} · ₹${amountResult.value.toLocaleString('en-IN')}`,
  });

  res.status(201).json(income);
});

module.exports = router;

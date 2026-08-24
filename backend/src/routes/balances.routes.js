const express = require('express');
const store = require('../data/store');
const { calculate } = require('../services/balances');
const { simplifyDebts } = require('../services/simplifyDebts');

const router = express.Router();

function withNames(data) {
  const simplifiedByCurrency = Object.fromEntries(Object.entries(data.netMaps || { INR: data.netMap }).map(([currency, net]) => [currency, simplifyDebts(net).map((entry) => ({ ...entry, currency }))]));
  return {
    ...data,
    simplified: simplifiedByCurrency.INR || [],
    simplifiedByCurrency,
    members: data.net.map((entry) => ({ member: entry.name, label: entry.userId === 'krishna' ? 'You' : undefined, amount: Math.abs(entry.amount), type: entry.type, settled: Math.abs(entry.amount) < 0.01 })),
  };
}

router.get('/', (req, res) => res.json(withNames(calculate(req.query.groupId || 'g1'))));

router.get('/:groupId/simplified', (req, res) => {
  if (!store.getGroup(req.params.groupId)) return res.status(404).json({ error: 'group not found' });
  const data = calculate(req.params.groupId);
  res.json(simplifyDebts(data.netMap));
});

// Legacy compatibility endpoint. New clients should record an explicit settlement.
router.post('/settle', (req, res) => res.json(withNames(calculate(req.body?.groupId || 'g1'))));

module.exports = router;

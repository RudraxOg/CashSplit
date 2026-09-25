const express = require('express');
const store = require('../data/store');
const { calculate } = require('../services/balances');
const { simplifyDebts } = require('../services/simplifyDebts');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

function withNames(data) {
  const simplifiedByCurrency = Object.fromEntries(Object.entries(data.netMaps || { INR: data.netMap }).map(([currency, net]) => [currency, simplifyDebts(net).map((entry) => ({ ...entry, currency }))]));
  return {
    ...data,
    simplified: simplifiedByCurrency[data.currency] || [],
    simplifiedByCurrency,
    members: data.net.map((entry) => ({ member: entry.name, label: entry.userId === 'krishna' ? 'You' : undefined, amount: Math.abs(entry.amount), type: entry.type, settled: Math.abs(entry.amount) < 0.01 })),
  };
}

router.get('/', async (req, res, next) => {
  if (repository.enabled()) { try { const data = await repository.calculateBalances(req.query.groupId || 'g1', req.user.id, req.query.currency || 'INR'); return res.json({ ...data, members: data.net.map((entry) => ({ member: entry.name, label: entry.userId === req.user.id ? 'You' : undefined, amount: Math.abs(entry.amount), type: entry.type, settled: Math.abs(entry.amount) < 0.01 })) }); } catch (error) { return next(error); } }
  try { return res.json(withNames(calculate(req.query.groupId || 'g1', req.query.currency || 'INR'))); } catch (error) { next(error); }
});

router.get('/:groupId/simplified', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json((await repository.calculateBalances(req.params.groupId, req.user.id, req.query.currency || 'INR')).simplified); } catch (error) { return next(error); } }
  if (!store.getGroup(req.params.groupId)) return res.status(404).json({ error: 'group not found' });
  const data = calculate(req.params.groupId, req.query.currency || 'INR');
  res.json(simplifyDebts(data.netMap));
});

// Legacy compatibility endpoint. New clients should record an explicit settlement.
router.post('/settle', (req, res) => res.json(withNames(calculate(req.body?.groupId || 'g1'))));

module.exports = router;

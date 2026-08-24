const express = require('express');
const store = require('../data/store');
const { pushActivity } = require('../utils/activity');
const { text, integerId } = require('../utils/validation');

const router = express.Router();

// GET /api/shopping
router.get('/', (req, res) => {
  res.json(store.getShopping());
});

// POST /api/shopping  { name, priority }
router.post('/', (req, res) => {
  const { name, priority } = req.body;
  const nameResult = text(name, 'name');
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  const validPriorities = ['High', 'Medium', 'Low'];
  if (priority !== undefined && !validPriorities.includes(priority)) return res.status(400).json({ error: 'priority is invalid' });

  const item = store.addShoppingItem({
    id: store.genId(),
    name: nameResult.value,
    priority: priority || 'Medium',
    purchased: false,
  });
  pushActivity({ kind: 'shopping', text: 'Added a shopping item', detail: item.name });
  res.status(201).json(item);
});

// PATCH /api/shopping/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  const existing = store.getShopping().find((i) => i.id === id);
  if (!existing) return res.status(404).json({ error: 'item not found' });

  const updated = store.updateShoppingItem(id, { purchased: !existing.purchased });
  pushActivity({ kind: 'shopping', text: `${updated.purchased ? 'Bought' : 'Added back'} a shopping item`, detail: updated.name });
  res.json(updated);
});

// DELETE /api/shopping/:id
router.delete('/:id', (req, res) => {
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  if (!store.getShopping().some((item) => item.id === id)) return res.status(404).json({ error: 'item not found' });
  store.deleteShoppingItem(id);
  res.status(204).end();
});

module.exports = router;

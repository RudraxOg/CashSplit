const express = require('express');
const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { text, memberName, integerId, parseBody, choreSchema } = require('../utils/validation');

const router = express.Router();

function today() { return new Date().toISOString().slice(0, 10); }
function dateFromLegacy(when) {
  const base = new Date(`${today()}T00:00:00Z`);
  if (when === 'Tomorrow') base.setUTCDate(base.getUTCDate() + 1);
  if (when === 'This Week' || when === 'Friday') base.setUTCDate(base.getUTCDate() + 5);
  return base.toISOString().slice(0, 10);
}
function deriveStatus(dueDate, currentStatus) {
  if (currentStatus === 'completed') return 'completed';
  if (dueDate < today()) return 'overdue';
  if (dueDate === today()) return 'pending';
  return 'upcoming';
}
function present(chore) {
  const dueDate = chore.dueDate || dateFromLegacy(chore.when);
  const offset = Math.round((new Date(`${dueDate}T00:00:00Z`) - new Date(`${today()}T00:00:00Z`)) / 86400000);
  return { ...chore, dueDate, recurrenceRule: chore.recurrenceRule || null, status: deriveStatus(dueDate, chore.status), when: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dueDate };
}

router.get('/', (req, res) => res.json(store.getChores().map(present)));

// POST /api/chores  { name, assignedTo, when, status }
router.post('/', (req, res) => {
  const { name, assignedTo, when, dueDate: suppliedDueDate, recurrenceRule } = parseBody(req.body || {}, choreSchema);
  const dueDate = suppliedDueDate || dateFromLegacy(when || 'Today');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`))) return res.status(400).json({ error: 'dueDate must be a valid ISO date' });
  if (recurrenceRule && !/^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/.test(recurrenceRule)) return res.status(400).json({ error: 'recurrenceRule must start with a supported FREQ' });
  const nameResult = text(name, 'name');
  const assignedToResult = memberName(assignedTo, store.MEMBERS);
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  if (assignedToResult.error) return res.status(400).json({ error: assignedToResult.error });
  const chore = store.addChore({
    id: store.genId(),
    name: nameResult.value,
    assignedTo: assignedToResult.value,
    dueDate,
    recurrenceRule: recurrenceRule || null,
    when: when || 'Today',
    status: deriveStatus(dueDate),
  });

  pushActivity({
    kind: 'chore',
    text: `${actorLabel(assignedToResult.value)} was assigned a chore`,
    detail: nameResult.value,
  });

  res.status(201).json(present(chore));
});

// PATCH /api/chores/:id/toggle  (completed <-> pending)
router.patch('/:id/toggle', (req, res) => {
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  const existing = store.getChores().find((c) => c.id === id);
  if (!existing) return res.status(404).json({ error: 'chore not found' });

  const next = existing.status === 'completed' ? deriveStatus(existing.dueDate || dateFromLegacy(existing.when)) : 'completed';
  const updated = store.updateChore(id, { status: next });

  if (next === 'completed') {
    pushActivity({
      kind: 'chore',
      text: `${actorLabel(existing.assignedTo)} completed a chore`,
      detail: existing.name,
    });
  }

  res.json(present(updated));
});

// DELETE /api/chores/:id
router.delete('/:id', (req, res) => {
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  if (!store.getChores().some((chore) => chore.id === id)) return res.status(404).json({ error: 'chore not found' });
  store.deleteChore(id);
  res.status(204).end();
});

module.exports = router;

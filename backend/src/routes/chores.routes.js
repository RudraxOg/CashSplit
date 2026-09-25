const express = require('express');
const store = require('../data/store');
const { pushActivity, actorLabel } = require('../utils/activity');
const { text, memberName, integerId, parseBody, choreSchema } = require('../utils/validation');
const repository = require('../repositories/supabaseRepository');

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
function nextRecurrenceDate(value, rule) {
  if (!value || !rule) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (rule.startsWith('FREQ=DAILY')) date.setUTCDate(date.getUTCDate() + 1);
  else if (rule.startsWith('FREQ=WEEKLY')) date.setUTCDate(date.getUTCDate() + 7);
  else if (rule.startsWith('FREQ=MONTHLY')) date.setUTCMonth(date.getUTCMonth() + 1);
  else if (rule.startsWith('FREQ=YEARLY')) date.setUTCFullYear(date.getUTCFullYear() + 1);
  else return null;
  return date.toISOString().slice(0, 10);
}
function present(chore) {
  const dueDate = chore.dueDate || dateFromLegacy(chore.when);
  const offset = Math.round((new Date(`${dueDate}T00:00:00Z`) - new Date(`${today()}T00:00:00Z`)) / 86400000);
  return { ...chore, dueDate, startTime: chore.startTime || null, durationMinutes: chore.durationMinutes || null, recurrenceRule: chore.recurrenceRule || null, status: deriveStatus(dueDate, chore.status), when: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dueDate };
}
function presentSupabase(row) {
  const dueDate = row.due_date;
  return {
    ...row,
    assignedTo: row.profiles?.name || row.assigned_to,
    assignedToId: row.assigned_to,
    dueDate,
    startTime: row.start_time?.slice(0, 5) || null,
    durationMinutes: row.duration_minutes || null,
    recurrenceRule: row.recurrence_rule,
    status: deriveStatus(dueDate, row.status),
    when: dueDate === today() ? 'Today' : dueDate,
  };
}

router.get('/', async (req, res, next) => {
  if (repository.enabled()) {
    try { const groupId = await repository.resolveGroupId(req.query.groupId || 'g1', req.user.id); const rows = await repository.listChores(groupId, req.user.id); return res.json(rows.map(presentSupabase)); } catch (error) { return next(error); }
  }
  return res.json(store.getChores().filter((item) => (item.groupId || 'g1') === (req.query.groupId || 'g1')).map(present));
});

// POST /api/chores  { name, assignedTo, when, status }
router.post('/', async (req, res, next) => {
  if (repository.enabled()) {
    try { const body = parseBody(req.body || {}, choreSchema); const dueDate = body.dueDate || dateFromLegacy(body.when || 'Today'); const row = await repository.createChore({ ...body, dueDate }, req.user.id); return res.status(201).json(presentSupabase(row)); } catch (error) { return next(error); }
  }
  let parsed;
  try { parsed = parseBody(req.body || {}, choreSchema); } catch (error) { return next(error); }
  const { name, assignedTo, when, dueDate: suppliedDueDate, recurrenceRule, startTime, durationMinutes } = parsed;
  const dueDate = suppliedDueDate || dateFromLegacy(when || 'Today');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(`${dueDate}T00:00:00Z`))) return res.status(400).json({ error: 'dueDate must be a valid ISO date' });
  if (recurrenceRule && !/^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/.test(recurrenceRule)) return res.status(400).json({ error: 'recurrenceRule must start with a supported FREQ' });
  const nameResult = text(name, 'name');
  const assignedToResult = memberName(assignedTo, store.MEMBERS);
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  if (assignedToResult.error) return res.status(400).json({ error: assignedToResult.error });
  const chore = store.addChore({
    id: store.genId(),
    groupId: req.body.groupId || 'g1',
    name: nameResult.value,
    assignedTo: assignedToResult.value,
    dueDate,
    startTime: startTime || null,
    durationMinutes: durationMinutes || null,
    recurrenceRule: recurrenceRule || null,
    when: when || 'Today',
    status: deriveStatus(dueDate),
  });

  pushActivity({
    groupId: chore.groupId,
    kind: 'chore',
    text: `${actorLabel(assignedToResult.value)} was assigned a chore`,
    detail: nameResult.value,
  });

  res.status(201).json(present(chore));
});

router.put('/:id', async (req, res, next) => {
  if (repository.enabled()) {
    try {
      const body = parseBody(req.body || {}, choreSchema);
      const dueDate = body.dueDate || dateFromLegacy(body.when || 'Today');
      const row = await repository.updateChore(req.params.id, { ...body, dueDate }, req.user.id);
      return res.json(presentSupabase(row));
    } catch (error) { return next(error); }
  }
  const id = integerId(req.params.id);
  const existing = id && store.getChores().find((chore) => chore.id === id);
  if (!existing) return res.status(404).json({ error: 'chore not found' });
  let body;
  try { body = parseBody(req.body || {}, choreSchema); } catch (error) { return next(error); }
  const dueDate = body.dueDate || dateFromLegacy(body.when || 'Today');
  const assignedToResult = memberName(body.assignedTo, store.MEMBERS);
  const nameResult = text(body.name, 'name');
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  if (assignedToResult.error) return res.status(400).json({ error: assignedToResult.error });
  const updated = store.updateChore(id, { name: nameResult.value, assignedTo: assignedToResult.value, dueDate, startTime: body.startTime || null, durationMinutes: body.durationMinutes || null, recurrenceRule: body.recurrenceRule || null });
  return res.json(present(updated));
});

// PATCH /api/chores/:id/toggle  (completed <-> pending)
router.patch('/:id/toggle', (req, res) => {
  if (repository.enabled()) return repository.toggleChore(req.params.id, req.user.id).then((row) => res.json(presentSupabase(row))).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  const existing = store.getChores().find((c) => c.id === id);
  if (!existing) return res.status(404).json({ error: 'chore not found' });

  const next = existing.status === 'completed' ? deriveStatus(existing.dueDate || dateFromLegacy(existing.when)) : 'completed';
  const updated = store.updateChore(id, { status: next });

  if (next === 'completed') {
    const nextDueDate = nextRecurrenceDate(existing.dueDate || dateFromLegacy(existing.when), existing.recurrenceRule);
    if (nextDueDate && !store.getChores().some((item) => item.groupId === existing.groupId && item.name === existing.name && item.assignedTo === existing.assignedTo && item.dueDate === nextDueDate)) store.addChore({ ...existing, id: store.genId(), status: deriveStatus(nextDueDate), dueDate: nextDueDate, when: nextDueDate });
    pushActivity({
      groupId: existing.groupId,
      kind: 'chore',
      text: `${actorLabel(existing.assignedTo)} completed a chore`,
      detail: existing.name,
    });
  }

  res.json(present(updated));
});

// DELETE /api/chores/:id
router.delete('/:id', (req, res) => {
  if (repository.enabled()) return repository.deleteChore(req.params.id, req.user.id).then(() => res.status(204).end()).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const id = integerId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id must be a positive integer' });
  if (!store.getChores().some((chore) => chore.id === id)) return res.status(404).json({ error: 'chore not found' });
  store.deleteChore(id);
  res.status(204).end();
});

module.exports = router;

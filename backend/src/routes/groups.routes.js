const express = require('express');
const store = require('../data/store');
const { text } = require('../utils/validation');
const repository = require('../repositories/supabaseRepository');
const { DEFAULT_MONTHLY_BUDGET, validateMonthlyBudget } = require('../services/monthlyBudget');

const router = express.Router();

router.get('/', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.listGroups(req.user.id)); } catch (error) { return next(error); } }
  return res.json(store.GROUPS);
});

router.get('/overview', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.groupsOverview(req.user.id)); } catch (error) { return next(error); } }
  const groups = store.GROUPS.map((group) => ({
    ...group,
    memberCount: group.memberIds.length,
    totalExpenses: store.getExpenses().filter((item) => !item.deletedAt && (item.currency || 'INR') === 'INR' && (item.groupId || 'g1') === group.id).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    totalIncome: store.getIncomes().filter((item) => (item.currency || 'INR') === 'INR' && (item.incomeType || 'PERSONAL') === 'HOUSEHOLD' && (item.groupId || 'g1') === group.id).reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }));
  return res.json({ groups, combined: { totalExpenses: groups.reduce((sum, group) => sum + group.totalExpenses, 0), totalIncome: groups.reduce((sum, group) => sum + group.totalIncome, 0), groupCount: groups.length } });
});

router.post('/', (req, res) => {
  const result = text(req.body?.name, 'name', { max: 80 });
  if (result.error) return res.status(400).json({ error: result.error });
  if (repository.enabled()) return repository.createGroup(result.value, req.user.id).then((group) => res.status(201).json(group)).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const group = { id: `g${store.genId()}`, name: result.value, simplifyDebts: false, monthlyBudget: DEFAULT_MONTHLY_BUDGET, plan: 'FREE', trialStartedAt: new Date().toISOString(), trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(), maxMembers: 5, memberIds: ['krishna'], createdAt: new Date().toISOString() };
  store.GROUPS.push(group);
  res.status(201).json(group);
});

router.get('/:id', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.getGroup(req.params.id, req.user.id)); } catch (error) { return next(error); } }
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json({ ...group, members: group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean) });
});

router.patch('/:id/settings', async (req, res, next) => {
  let monthlyBudget;
  try { if (req.body?.monthlyBudget !== undefined) monthlyBudget = validateMonthlyBudget(req.body.monthlyBudget); } catch (error) { return next(error); }
  if (repository.enabled()) { try { if (req.body?.simplifyDebts !== undefined && typeof req.body.simplifyDebts !== 'boolean') return res.status(400).json({ error: 'simplifyDebts must be a boolean' }); return res.json(await repository.updateGroupSettings(req.params.id, req.body, req.user.id)); } catch (error) { if (req.body?.monthlyBudget !== undefined && /monthly_budget_minor/i.test(error.message || '')) { error.statusCode = 503; error.message = 'Monthly budget migration is not applied. Apply 20260925190000_monthly_group_budget.sql, then retry.'; } return next(error); } }
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  if (req.body?.defaultSplit !== undefined) {
    try { group.defaultSplit = require('../services/defaultSplits').validateDefaultSplit(req.body.defaultSplit, group.memberIds.map((id) => ({ id }))); } catch (error) { return next(error); }
  }
  if (req.body?.simplifyDebts !== undefined && typeof req.body.simplifyDebts !== 'boolean') return res.status(400).json({ error: 'simplifyDebts must be a boolean' });
  if (monthlyBudget !== undefined) group.monthlyBudget = monthlyBudget;
  if (req.body?.name !== undefined) { const result = text(req.body.name, 'name', { max: 80 }); if (result.error) return res.status(400).json({ error: result.error }); group.name = result.value; }
  if (req.body?.simplifyDebts !== undefined) group.simplifyDebts = req.body.simplifyDebts;
  res.json(group);
});

router.get('/:id/members', async (req, res, next) => {
  if (repository.enabled()) { try { return res.json(await repository.listMembers(req.params.id, req.user.id)); } catch (error) { return next(error); } }
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean));
});

router.post('/:id/members', async (req, res, next) => {
  return res.status(405).json({ error: 'direct member addition is disabled; create an email-bound invitation instead' });
});

router.post('/:id/invites', async (req, res, next) => {
  if (!repository.enabled()) return res.status(501).json({ error: 'group invitations require Supabase' });
  try { return res.status(201).json(await repository.createGroupInvite(req.params.id, req.body?.email, req.user.id, req.get('origin'))); } catch (error) { return next(error); }
});

router.get('/:id/expenses', async (req, res, next) => {
  if (repository.enabled()) { try { const groupId = await repository.resolveGroupId(req.params.id, req.user.id); return res.json(await repository.listExpenses(groupId, req.user.id)); } catch (error) { return next(error); } }
  const group = store.getGroup(req.params.id);
  if (!group) return res.status(404).json({ error: 'group not found' });
  res.json(store.getExpenses().filter((expense) => !expense.deletedAt && (expense.groupId || 'g1') === group.id));
});

module.exports = router;

const express = require('express');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();
const defaults = { newExpenses: true, recurringReminders: true, settlements: true };
const memoryPreferences = new Map();
router.get('/preferences', async (req, res, next) => {
  try {
    const row = repository.enabled() ? await repository.query(repository.supabase.from('profiles').select('notification_preferences').eq('id', req.user.id).single()) : null;
    res.json({ preferences: { ...defaults, ...(row?.notification_preferences || memoryPreferences.get(req.user.id)) }, emailConfigured: Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM) });
  } catch (error) { next(error); }
});
router.patch('/preferences', async (req, res, next) => {
  try {
    const { z } = require('zod');
    const preferences = require('../utils/validation').parseBody(req.body, z.object({ newExpenses: z.boolean(), recurringReminders: z.boolean(), settlements: z.boolean() }));
    if (repository.enabled()) await repository.query(repository.supabase.from('profiles').update({ notification_preferences: preferences }).eq('id', req.user.id));
    else memoryPreferences.set(req.user.id, preferences);
    res.json({ preferences });
  } catch (error) { next(error); }
});

router.post('/delete', async (req, res, next) => {
  if (!repository.enabled() || !repository.supabase || !req.user?.id || req.user.id === 'krishna') return res.status(503).json({ error: 'account deletion requires Supabase authentication' });
  try {
    const { error } = await repository.supabase.auth.admin.deleteUser(req.user.id);
    if (error) { const failure = new Error(error.message); failure.statusCode = 500; throw failure; }
    return res.status(204).end();
  } catch (error) { return next(error); }
});

module.exports = router;

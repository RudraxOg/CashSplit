const express = require('express');
const store = require('../data/store');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req, res, next) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'a valid email is required' });
  try {
    if (repository.enabled()) {
      const { data: existing, error: lookupError } = await repository.supabase.from('waitlist_signups').select('id').eq('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        const { error } = await repository.supabase.from('waitlist_signups').insert({ email, source: 'onboarding' });
        if (error && error.code !== '23505') throw error;
      }
    } else if (!store.getWaitlistSignups().some((signup) => signup.email === email)) {
      store.addWaitlistSignup({ id: store.genId(), email, source: 'onboarding', createdAt: new Date().toISOString() });
    }
    return res.status(201).json({ ok: true });
  } catch (error) { return next(error); }
});

module.exports = router;

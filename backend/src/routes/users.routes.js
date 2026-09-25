const express = require('express');
const store = require('../data/store');
const repository = require('../repositories/supabaseRepository');

const router = express.Router();

router.get('/me', (req, res) => {
  if (repository.enabled() && req.user?.id) return repository.query(repository.supabase.from('profiles').select('*').eq('id', req.user.id).maybeSingle(), 'profile lookup failed').then((profile) => res.json(profile || req.user)).catch((error) => res.status(error.statusCode || 500).json({ error: error.message }));
  const user = store.MEMBERS.find((member) => member.id === 'krishna');
  res.json({ ...user, email: 'krishna@roommate.local', avatarUrl: null });
});

module.exports = router;

const express = require('express');
const repository = require('../repositories/supabaseRepository');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:token', async (req, res, next) => {
  if (!repository.enabled()) return res.status(501).json({ error: 'group invitations require Supabase' });
  try { return res.json(await repository.previewGroupInvite(req.params.token)); } catch (error) { return next(error); }
});

router.post('/:token/accept', requireAuth, async (req, res, next) => {
  if (!repository.enabled()) return res.status(501).json({ error: 'group invitations require Supabase' });
  try { return res.json(await repository.acceptGroupInvite(req.params.token, req.user.id, req.user.email)); } catch (error) { return next(error); }
});

router.post('/:token/decline', requireAuth, async (req, res, next) => {
  if (!repository.enabled()) return res.status(501).json({ error: 'group invitations require Supabase' });
  try { return res.json(await repository.declineGroupInvite(req.params.token, req.user.email)); } catch (error) { return next(error); }
});

module.exports = router;

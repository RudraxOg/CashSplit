const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const config = require('../config');

const supabase = config.SUPABASE_ENABLED
  ? createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket },
  })
  : null;

async function optionalAuth(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ') || !supabase) {
    if (supabase) return res.status(401).json({ error: 'authentication required' });
    req.user = { id: 'krishna', name: 'Krishna' };
    return next();
  }
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data.user) return res.status(401).json({ error: 'invalid authentication token' });
  req.user = { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || data.user.email };
  next();
}

function requireAuth(req, res, next) {
  if (!config.AUTH_REQUIRED && !supabase) return optionalAuth(req, res, next);
  if (!supabase) return res.status(503).json({ error: 'authentication service is not configured' });
  if (!req.get('authorization')?.startsWith('Bearer ')) return res.status(401).json({ error: 'authentication required' });
  return optionalAuth(req, res, next);
}

module.exports = { optionalAuth, requireAuth };

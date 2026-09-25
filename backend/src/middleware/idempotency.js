const crypto = require('node:crypto');
const { supabase } = require('../services/supabase');
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;

function pruneCache() {
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [key, value] of cache) if (value.createdAt < cutoff) cache.delete(key);
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

async function idempotency(req, res, next) {
  try {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
    const key = req.get('idempotency-key');
    if (!key) return next();
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
    if (supabase && req.user?.id) {
      const { data: previous, error } = await supabase.from('idempotency_keys').select('*').eq('user_id', req.user.id).eq('key', key).maybeSingle();
      if (error) return next(error);
      if (previous) {
        if (previous.request_hash !== requestHash) return res.status(409).json({ error: 'idempotency key was reused with a different request' });
        return res.status(previous.response_status).json(previous.response_body);
      }
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 500) supabase.from('idempotency_keys').insert({ user_id: req.user.id, key, request_hash: requestHash, response_status: res.statusCode, response_body: body }).then(() => {}).catch(() => {});
        return originalJson(body);
      };
      return next();
    }
    pruneCache();
    const cacheKey = `${req.method}:${req.originalUrl}:${key}`;
    const previous = cache.get(cacheKey);
    if (previous) {
      if (previous.requestHash !== requestHash) return res.status(409).json({ error: 'idempotency key was reused with a different request' });
      return res.status(previous.status).json(previous.body);
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) cache.set(cacheKey, { status: res.statusCode, body, requestHash, createdAt: Date.now() });
      return originalJson(body);
    };
    return next();
  } catch (error) { return next(error); }
}

module.exports = { idempotency };

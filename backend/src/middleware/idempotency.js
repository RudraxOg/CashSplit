const cache = new Map();

function idempotency(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  const key = req.get('idempotency-key');
  if (!key) return next();
  const cacheKey = `${req.method}:${req.originalUrl}:${key}`;
  const previous = cache.get(cacheKey);
  if (previous) return res.status(previous.status).json(previous.body);

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 500) cache.set(cacheKey, { status: res.statusCode, body });
    return originalJson(body);
  };
  next();
}

module.exports = { idempotency };

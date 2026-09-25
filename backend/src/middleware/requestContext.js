
const crypto = require('node:crypto');
const config = require('../config');

function requestContext(req, res, next) {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(JSON.stringify({ requestId, method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Math.round(durationMs * 100) / 100 }));
  });
  next();
}

function corsOptions(request) {
  const allowedOrigins = new Set(config.CORS_ORIGINS.map((origin) => origin.replace(/\/$/, '')));
  const isLocalOrigin = (origin) => {
    try {
      const url = new URL(origin);
      return ['localhost', '127.0.0.1', '::1'].includes(url.hostname) && url.protocol === 'http:';
    } catch {
      return false;
    }
  };

  return {
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, '');
      const developmentOrigin = config.NODE_ENV !== 'production' && normalizedOrigin && isLocalOrigin(normalizedOrigin);
      let sameHost = false;
      try { sameHost = Boolean(request && normalizedOrigin && new URL(normalizedOrigin).host === request.get('host')); } catch { /* invalid origin */ }
      if (!origin || sameHost || developmentOrigin || allowedOrigins.has(normalizedOrigin)) return callback(null, true);
      return callback(new Error('CORS origin is not allowed'));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    optionsSuccessStatus: 204,
  };
}

module.exports = { requestContext, corsOptions };

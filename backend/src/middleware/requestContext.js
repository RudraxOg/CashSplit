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

function corsOptions() {
  return {
    origin(origin, callback) {
      if (!origin || (config.NODE_ENV !== 'production' && !config.CORS_ORIGINS.length) || config.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin is not allowed'));
    },
  };
}

module.exports = { requestContext, corsOptions };

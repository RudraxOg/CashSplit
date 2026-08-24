const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const { requestContext, corsOptions } = require('./src/middleware/requestContext');
const { idempotency } = require('./src/middleware/idempotency');
const { requireAuth } = require('./src/middleware/auth');
const { health: supabaseHealth } = require('./src/services/supabase');

const membersRoutes = require('./src/routes/members.routes');
const expensesRoutes = require('./src/routes/expenses.routes');
const incomesRoutes = require('./src/routes/incomes.routes');
const choresRoutes = require('./src/routes/chores.routes');
const shoppingRoutes = require('./src/routes/shopping.routes');
const balancesRoutes = require('./src/routes/balances.routes');
const activityRoutes = require('./src/routes/activity.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const groupsRoutes = require('./src/routes/groups.routes');
const settlementsRoutes = require('./src/routes/settlements.routes');
const usersRoutes = require('./src/routes/users.routes');

const app = express();
const PORT = config.PORT;
const HOST = config.HOST;

app.use(cors(corsOptions()));
app.use(express.json({ limit: '100kb' }));
app.use(requestContext);
app.use(idempotency);

app.use((req, res, next) => {
  if (req.headers['content-type'] && req.is('json') === false && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return res.status(415).json({ error: 'content-type must be application/json' });
  }
  next();
});

app.get('/api/health', async (req, res) => res.json({ ok: true, environment: config.NODE_ENV, persistence: await supabaseHealth() }));
app.use('/api', requireAuth);

app.use('/api/members', membersRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/incomes', incomesRoutes);
app.use('/api/chores', choresRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/balances', balancesRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/users', usersRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'not found' }));

// central error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'request body must contain valid JSON' });
  }
  console.error(JSON.stringify({ requestId: req.requestId, error: err.message, stack: config.NODE_ENV === 'development' ? err.stack : undefined }));
  const status = err.message === 'CORS origin is not allowed' ? 403 : (err.statusCode || 500);
  res.status(status).json({ error: status === 500 ? 'internal server error' : err.message, requestId: req.requestId });
});

if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`RoomMate API listening on http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down RoomMate API`);
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;

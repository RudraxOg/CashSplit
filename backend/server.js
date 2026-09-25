const express = require('express');
const crypto = require('node:crypto');
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
const waitlistRoutes = require('./src/routes/waitlist.routes');
const accountRoutes = require('./src/routes/account.routes');
const invitesRoutes = require('./src/routes/invites.routes');

const app = express();
const PORT = config.PORT;
const HOST = config.HOST;

app.use((req, res, next) => cors(corsOptions(req))(req, res, next));
app.use(express.json({ limit: '100kb' }));
app.use(requestContext);

app.use((req, res, next) => {
  if (req.headers['content-type'] && req.is('json') === false && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!/^\/api\/expenses\/[^/]+\/receipt$/.test(req.path)) return res.status(415).json({ error: 'content-type must be application/json' });
  }
  next();
});

app.get('/api/health', async (req, res) => {
  const persistence = await supabaseHealth();
  const ok = persistence.mode === 'memory' || persistence.connected;
  return res.status(ok ? 200 : 503).json({ ok, environment: config.NODE_ENV, persistence });
});
// Vercel's scheduled GET invokes this route. Keep it outside user auth, but
// require the deployment-only secret before touching scheduled work.
app.get('/api/internal/jobs', async (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const supplied = req.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (!secret || suppliedBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(suppliedBytes, expectedBytes)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try { return res.json(await require('./scripts/run-jobs').runJobs()); } catch (error) { return next(error); }
});
// Public onboarding signup; visitors can join before creating an account.
app.use('/api/waitlist', waitlistRoutes);
// Invite previews are public by token; acceptance/decline applies its own auth guard.
app.use('/api/invites', invitesRoutes);
app.use('/api', requireAuth);
app.use('/api/expenses', require('./src/routes/receipts.routes'));
app.use('/api', idempotency);
app.use('/api/account', accountRoutes);

app.use('/api/members', membersRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/expense-series', require('./src/routes/expenseSeries.routes'));
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
  console.error(JSON.stringify({
    requestId: req.requestId,
    error: err.message,
    code: err.cause?.code || err.code,
    details: err.cause?.details,
    hint: err.cause?.hint,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  }));
  const status = err.message === 'CORS origin is not allowed' ? 403 : (err.statusCode || 500);
  res.status(status).json({
    error: status === 500 && config.NODE_ENV !== 'development' ? 'internal server error' : err.message,
    requestId: req.requestId,
  });
});

if (require.main === module) {
  const runRecurring = () => require('./src/services/expenseSeries').runDue().catch((error) => console.error('Recurring expenses:', error.message));
  const jobTimer = setInterval(runRecurring, 60000);
  jobTimer.unref();
  runRecurring();
  const server = app.listen(PORT, HOST, () => {
    console.log(`RoomMate API listening on http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    clearInterval(jobTimer);
    console.log(`${signal} received, shutting down RoomMate API`);
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;

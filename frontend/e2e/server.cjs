process.env.NODE_ENV = 'test';
const app = require('../../backend/server');
const server = app.listen(4399, '127.0.0.1');
process.on('SIGTERM', () => server.close());

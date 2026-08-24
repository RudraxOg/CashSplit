const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

test('health endpoint reports a healthy API', async () => {
  const { response, body } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.persistence);
});

test('invalid expense input returns a useful 400 response', async () => {
  const { response, body } = await request('/api/expenses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ category: 'Food', amount: -1, paidBy: 'Unknown' }),
  });
  assert.equal(response.status, 400);
  assert.match(body.error, /amount must be a positive number/);
});

test('missing resources return 404 instead of false success', async () => {
  const { response, body } = await request('/api/shopping/999999', { method: 'DELETE' });
  assert.equal(response.status, 404);
  assert.deepEqual(body, { error: 'item not found' });
});

test('rich percentage expense persists payers and computed shares', async () => {
  const { response, body } = await request('/api/expenses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      groupId: 'g1', description: 'Team dinner', totalAmount: 1200, categoryId: 'Food & Dining',
      splitType: 'PERCENT',
      payers: [{ userId: 'krishna', paidAmount: 800 }, { userId: 'aman', paidAmount: 400 }],
      participants: [{ userId: 'krishna', percent: 40 }, { userId: 'aman', percent: 20 }, { userId: 'neha', percent: 20 }, { userId: 'rohit', percent: 20 }],
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.payers.length, 2);
  assert.deepEqual(body.shares.map((share) => share.owedAmount), [480, 240, 240, 240]);
});

test('balances expose net totals and simplified transfers', async () => {
  const { response, body } = await request('/api/balances?groupId=g1');
  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.net), true);
  assert.equal(Array.isArray(body.simplified), true);
  assert.equal(Array.isArray(body.pairwise), true);
});

test('expense idempotency key returns the original response', async () => {
  const payload = { description: 'Idempotent coffee', totalAmount: 100, category: 'Others', splitType: 'EQUAL', payers: [{ userId: 'krishna', paidAmount: 100 }], participants: [{ userId: 'krishna' }] };
  const options = { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'coffee-test-1' }, body: JSON.stringify(payload) };
  const first = await request('/api/expenses', options);
  const second = await request('/api/expenses', options);
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 201);
  assert.equal(second.body.id, first.body.id);
});

test('chores use an ISO due date and derive their status server-side', async () => {
  const { response, body } = await request('/api/chores', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Water plants', assignedTo: 'Krishna', dueDate: '2099-01-01', recurrenceRule: 'FREQ=WEEKLY' }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.dueDate, '2099-01-01');
  assert.equal(body.status, 'upcoming');
  assert.equal(body.recurrenceRule, 'FREQ=WEEKLY');
});

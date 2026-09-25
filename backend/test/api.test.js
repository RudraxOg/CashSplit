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

test('monthly budget is saved per household and reflected in its summary', async () => {
  const created = await request('/api/groups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Budget test home' }) });
  assert.equal(created.response.status, 201);
  const groupId = created.body.id;
  const changed = await request(`/api/groups/${groupId}/settings`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ monthlyBudget: 4200.50 }) });
  assert.equal(changed.response.status, 200);
  assert.equal(changed.body.monthlyBudget, 4200.50);
  const expense = await request('/api/expenses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
    groupId, description: 'Budget test expense', totalAmount: 42, categoryId: 'Groceries', splitType: 'EQUAL',
    date: new Date().toISOString().slice(0, 10), payers: [{ userId: 'krishna', paidAmount: 42 }], participants: [{ userId: 'krishna' }],
  }) });
  assert.equal(expense.response.status, 201);
  const summary = await request(`/api/reports/summary?groupId=${groupId}`);
  assert.equal(summary.response.status, 200);
  assert.equal(summary.body.budget, 4200.50);
  assert.equal(summary.body.budgetSpent, 42);
  assert.equal(summary.body.spentPct, 1);
  const invalid = await request(`/api/groups/${groupId}/settings`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ monthlyBudget: -5 }) });
  assert.equal(invalid.response.status, 400);
  const unchanged = await request(`/api/groups/${groupId}`);
  assert.equal(unchanged.body.monthlyBudget, 4200.50);
});

test('public onboarding waitlist accepts and de-duplicates valid emails', async () => {
  const first = await request('/api/waitlist', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'onboarding@example.com' }),
  });
  const second = await request('/api/waitlist', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'ONBOARDING@example.com' }),
  });
  assert.equal(first.response.status, 201);
  assert.equal(second.response.status, 201);
  assert.deepEqual(first.body, { ok: true });
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

test('purchasing a shopping item creates an equal expense and marks it purchased', async () => {
  const added = await request('/api/shopping', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Dish soap', priority: 'Medium' }),
  });
  assert.equal(added.response.status, 201);

  const purchased = await request(`/api/shopping/${added.body.id}/purchase`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount: 400 }),
  });
  assert.equal(purchased.response.status, 201);
  assert.equal(purchased.body.item.purchased, true);
  assert.equal(purchased.body.expense.amount, 400);
  assert.equal(purchased.body.expense.payers[0].paidAmount, 400);
  assert.deepEqual(purchased.body.expense.shares.map((share) => share.owedAmount), [100, 100, 100, 100]);
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

test('memory groups isolate income and support income editing and deletion', async () => {
  const createdGroup = await request('/api/groups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Isolated test group' }) });
  assert.equal(createdGroup.response.status, 201);
  const groupId = createdGroup.body.id;
  const createdIncome = await request('/api/incomes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ groupId, source: 'Refund', amount: 250, addedBy: 'Krishna' }) });
  assert.equal(createdIncome.response.status, 201);
  const [groupIncome, defaultIncome] = await Promise.all([request(`/api/incomes?groupId=${groupId}`), request('/api/incomes?groupId=g1')]);
  assert.equal(groupIncome.body.some((item) => item.source === 'Refund'), true);
  assert.equal(defaultIncome.body.some((item) => item.source === 'Refund'), false);
  const overview = await request('/api/groups/overview');
  assert.equal(overview.body.groups.find((item) => item.id === groupId).totalIncome, 0, 'personal member income is not household income');
  const sharedIncome = await request('/api/incomes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ groupId, source: 'Shared fund', amount: 100, incomeType: 'HOUSEHOLD' }) });
  assert.equal(sharedIncome.response.status, 201);
  assert.equal((await request('/api/groups/overview')).body.groups.find((item) => item.id === groupId).totalIncome, 100);
  const updated = await request(`/api/incomes/${createdIncome.body.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: 'Returned deposit', amount: 275, date: '2026-09-24' }) });
  assert.equal(updated.body.source, 'Returned deposit');
  const deleted = await request(`/api/incomes/${createdIncome.body.id}`, { method: 'DELETE' });
  assert.equal(deleted.response.status, 204);
});

test('a new household can create an expense with its default member split', async () => {
  const group = await request('/api/groups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Expense test group' }) });
  assert.equal(group.response.status, 201);
  const created = await request('/api/expenses', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ groupId: group.body.id, description: 'First purchase', amount: 25 }),
  });
  assert.equal(created.response.status, 201);
  assert.deepEqual(created.body.shares.map(({ userId, owedAmount }) => [userId, owedAmount]), [['krishna', 25]]);
});

test('memory shopping items support editing and remain group scoped', async () => {
  const group = await request('/api/groups', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Shopping test group' }) });
  const created = await request('/api/shopping', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ groupId: group.body.id, name: 'Soap', priority: 'Low' }) });
  const updated = await request(`/api/shopping/${created.body.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Hand soap', priority: 'High', purchased: false }) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.name, 'Hand soap');
  const defaultItems = await request('/api/shopping?groupId=g1');
  assert.equal(defaultItems.body.some((item) => item.id === created.body.id), false);
});

test('completing a recurring chore schedules its next occurrence', async () => {
  const created = await request('/api/chores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ groupId: 'g1', name: 'Recurring test chore', assignedTo: 'Krishna', dueDate: '2026-09-24', recurrenceRule: 'FREQ=WEEKLY' }) });
  assert.equal(created.response.status, 201);
  const toggled = await request(`/api/chores/${created.body.id}/toggle?groupId=g1`, { method: 'PATCH' });
  assert.equal(toggled.body.status, 'completed');
  const chores = await request('/api/chores?groupId=g1');
  assert.equal(chores.body.some((item) => item.name === 'Recurring test chore' && item.id !== created.body.id && item.dueDate === '2026-10-01'), true);
});

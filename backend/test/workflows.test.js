const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
const { nextDate, runDue } = require('../src/services/expenseSeries');
const { ledgerCsv } = require('../src/services/expenseQueries');
let server, base;
test.before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}/api`; });
test.after(() => new Promise((r) => server.close(r)));
async function call(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: response.status === 204 ? null : response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text() };
}
test('expense search filters before pagination and rejects invalid ranges', async () => {
  const group = (await call('/groups', 'POST', { name: 'Search household' })).body;
  for (const amount of [10, 20, 30]) assert.equal((await call('/expenses', 'POST', { groupId: group.id, description: `Rent ${amount}`, amount, date: '2026-09-01' })).status, 201);
  const result = await call(`/expenses?groupId=${group.id}&q=rent&min=15&limit=1`);
  assert.equal(result.status, 200); assert.equal(result.body.data.length, 1); assert.equal(result.body.nextOffset, 1);
  const next = await call(`/expenses?groupId=${group.id}&q=rent&min=15&limit=1&offset=1`);
  assert.equal(next.body.nextOffset, null); assert.notEqual(next.body.data[0].id, result.body.data[0].id);
  assert.equal((await call(`/expenses?groupId=${group.id}&min=50&max=10`)).status, 400);
  assert.equal((await call(`/expenses?groupId=${group.id}&payer=aman`)).body.length, 0);
});
test('CSV includes balance impacts, escapes untrusted formulas and omits deleted expenses', async () => {
  const csv = [...ledgerCsv([{ id: 'one', description: '=HYPERLINK("bad")', date: '2026-09-25', currency: 'INR', totalAmount: 100, payers: [{ userId: 'a', paidAmount: 100 }], shares: [{ userId: 'a', owedAmount: 40 }, { userId: 'b', owedAmount: 60 }] }], [{ id: 'two', fromUserId: 'b', toUserId: 'a', amount: 20 }], [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])].join('');
  assert.match(csv, /'=HYPERLINK/); assert.match(csv, /"60","-60"/); assert.match(csv, /"-20","20"/);
  const group = (await call('/groups', 'POST', { name: 'Export household' })).body;
  const expense = (await call('/expenses', 'POST', { groupId: group.id, description: 'Deleted export row', amount: 10 })).body;
  await call(`/expenses/${expense.id}`, 'DELETE');
  const exported = await call(`/reports/export?groupId=${group.id}`);
  assert.equal(exported.status, 200); assert.doesNotMatch(exported.body, /Deleted export row/);
});
test('default splits validate membership and survive reload', async () => {
  const group = (await call('/groups', 'POST', { name: 'Defaults household' })).body;
  assert.equal((await call(`/groups/${group.id}/settings`, 'PATCH', { defaultSplit: { splitType: 'PERCENT', participants: [{ userId: 'aman', percent: 100 }] } })).status, 400);
  const defaultSplit = { splitType: 'PERCENT', participants: [{ userId: 'krishna', percent: 100 }] };
  assert.equal((await call(`/groups/${group.id}/settings`, 'PATCH', { defaultSplit })).status, 200);
  assert.deepEqual((await call(`/groups/${group.id}`)).body.defaultSplit, defaultSplit);
});
test('recurring expenses post once per period and pause without changing history', async () => {
  const group = (await call('/groups', 'POST', { name: 'Recurring household' })).body;
  const created = await call('/expense-series', 'POST', { template: { groupId: group.id, description: 'Monthly rent', amount: 100, payers: [{ userId: 'krishna', paidAmount: 100 }], participants: [{ userId: 'krishna' }] }, frequency: 'MONTHLY', firstDate: '2026-01-31', timeZone: 'Asia/Kolkata' });
  assert.equal(created.status, 201);
  await Promise.all([runDue(new Date('2026-01-31T12:00:00Z')), runDue(new Date('2026-01-31T12:00:00Z'))]);
  await runDue(new Date('2026-01-31T12:00:00Z'));
  assert.equal((await call(`/expenses?groupId=${group.id}`)).body.length, 1);
  let row = (await call(`/expense-series?groupId=${group.id}`)).body[0]; assert.equal(row.next_date, '2026-02-28');
  const updated = await call(`/expense-series/${row.id}`, 'PATCH', { version: row.version, template: { ...row.template, description: 'Updated rent' } });
  assert.equal(updated.status, 200);
  assert.equal((await call(`/expense-series/${row.id}`, 'PATCH', { version: row.version, active: false })).status, 409);
  await runDue(new Date('2026-02-28T12:00:00Z'));
  const expenses = (await call(`/expenses?groupId=${group.id}`)).body;
  assert.equal(expenses.length, 2); assert.equal(expenses.find((e) => e.date === '2026-01-31').description, 'Monthly rent');
  row = (await call(`/expense-series?groupId=${group.id}`)).body[0]; assert.equal(row.next_date, '2026-03-31');
  await call(`/expense-series/${row.id}`, 'PATCH', { version: row.version, active: false });
  await runDue(new Date('2026-04-01T12:00:00Z'));
  assert.equal((await call(`/expenses?groupId=${group.id}`)).body.length, 2);
});
test('calendar recurrence retains month anchors and leap days', () => {
  assert.equal(nextDate('2026-01-31', 'MONTHLY', 31), '2026-02-28');
  assert.equal(nextDate('2026-02-28', 'MONTHLY', 31), '2026-03-31');
  assert.equal(nextDate('2023-02-28', 'YEARLY', 29), '2024-02-29');
});
test('notification preferences persist', async () => {
  const preferences = { newExpenses: false, settlements: false, recurringReminders: true };
  assert.equal((await call('/account/preferences', 'PATCH', preferences)).status, 200);
  assert.deepEqual((await call('/account/preferences')).body.preferences, preferences);
});

test('personal income stays grouped by owner and out of household totals', async () => {
  const personal = await call('/incomes', 'POST', { groupId: 'g1', source: 'Aman salary', amount: 42000, incomeType: 'PERSONAL', ownerUserId: 'aman' });
  assert.equal(personal.status, 201); assert.equal(personal.body.ownerUserId, 'aman');
  assert.equal(personal.body.incomeType, 'PERSONAL');
  assert.equal((await call('/incomes', 'POST', { groupId: 'g1', source: 'Outside member', amount: 1, incomeType: 'PERSONAL', ownerUserId: 'not-a-member' })).status, 400);
  const shared = await call('/incomes', 'POST', { groupId: 'g1', source: 'Shared household fund', amount: 1250, incomeType: 'HOUSEHOLD' });
  assert.equal(shared.status, 201);
  assert.equal((await call('/reports/summary?groupId=g1')).body.totalIncome, 1250);
  assert.equal((await call('/groups/overview')).body.groups.find((group) => group.id === 'g1').totalIncome, 1250);
});

test('currencies stay separate in balances, reports, and settlements', async () => {
  const created = await call('/expenses', 'POST', { groupId: 'g1', description: 'Foreign dinner', amount: 100, currency: 'USD', payers: [{ userId: 'krishna', paidAmount: 100 }], participants: [{ userId: 'aman' }] });
  assert.equal(created.status, 201);
  const balances = (await call('/balances?groupId=g1&currency=USD')).body;
  assert.equal(balances.currency, 'USD'); assert.equal(balances.pairwise.length, 1); assert.equal(balances.pairwise[0].amount, 100);
  const settlement = await call('/settlements', 'POST', { groupId: 'g1', currency: 'USD', fromUserId: 'aman', toUserId: 'krishna', amount: 100 });
  assert.equal(settlement.status, 201);
  assert.equal((await call('/balances?groupId=g1&currency=USD')).body.pairwise.length, 0);
  assert.equal((await call('/balances?groupId=g1&currency=XYZ')).status, 400);
  assert.equal((await call('/expenses', 'POST', { description: 'Bad currency', amount: 10, currency: 'XYZ' })).status, 400);
});

test('receipts validate file contents and are inaccessible after deleting the expense', async () => {
  const expense = (await call('/expenses', 'POST', { description: 'Receipt test', amount: 10 })).body;
  const file = Buffer.from('%PDF-1.4\nTest receipt\n%%EOF');
  const upload = await fetch(`${base}/expenses/${expense.id}/receipt`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
  assert.equal(upload.status, 200);
  const downloaded = await fetch(`${base}/expenses/${expense.id}/receipt`); assert.equal(downloaded.status, 200); assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), file);
  const invalid = await fetch(`${base}/expenses/${expense.id}/receipt`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: 'not an image' }); assert.equal(invalid.status, 400);
  await call(`/expenses/${expense.id}`, 'DELETE');
  assert.equal((await fetch(`${base}/expenses/${expense.id}/receipt`)).status, 404);
});

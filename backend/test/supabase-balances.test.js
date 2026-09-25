const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBalancesFromRows } = require('../src/repositories/supabaseRepository');

const group = { members: [{ id: 'payer', name: 'Payer' }, { id: 'debtor', name: 'Debtor' }] };
const expense = {
  payers: [{ userId: 'payer', paidAmount: 100, paidAmountMinor: 10000 }],
  shares: [{ userId: 'payer', owedAmount: 50 }, { userId: 'debtor', owedAmount: 50 }],
};

test('Supabase expense DTOs produce balances and a settleable pair', () => {
  const result = calculateBalancesFromRows(group, [expense], []);
  assert.deepEqual(result.net.map(({ userId, amount }) => [userId, amount]), [['payer', 50], ['debtor', -50]]);
  assert.deepEqual(result.pairwise.map(({ fromUserId, toUserId, amount }) => [fromUserId, toUserId, amount]), [['debtor', 'payer', 50]]);
  assert.deepEqual(result.simplified.map(({ fromUserId, toUserId, amount }) => [fromUserId, toUserId, amount]), [['debtor', 'payer', 50]]);
});

test('Supabase settlements reduce both net and pairwise balances', () => {
  const result = calculateBalancesFromRows(group, [expense], [{ from_user_id: 'debtor', to_user_id: 'payer', amount_minor: 3000 }]);
  assert.deepEqual(result.net.map(({ userId, amount }) => [userId, amount]), [['payer', 20], ['debtor', -20]]);
  assert.equal(result.pairwise[0].amount, 20);
});

test('reimbursement shares reverse the debt direction', () => {
  const reimbursement = {
    payers: [{ userId: 'payer', paidAmount: 100 }],
    shares: [{ userId: 'payer', owedAmount: 150 }, { userId: 'debtor', owedAmount: -50 }],
  };
  const result = calculateBalancesFromRows(group, [reimbursement], []);
  assert.deepEqual(result.pairwise.map(({ fromUserId, toUserId, amount }) => [fromUserId, toUserId, amount]), [['payer', 'debtor', 50]]);
});

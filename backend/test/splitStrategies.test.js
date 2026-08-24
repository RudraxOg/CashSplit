const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSplit, ValidationError } = require('../src/services/splitStrategies');
const { simplifyDebts } = require('../src/services/simplifyDebts');

const sum = (shares) => Math.round(shares.reduce((total, share) => total + share.owedAmount, 0) * 100) / 100;

test('split strategies preserve the total to the cent', () => {
  const cases = [
    ['EQUAL', [{ userId: 'a' }, { userId: 'b' }, { userId: 'c' }]],
    ['SHARES', [{ userId: 'a', shares: 1 }, { userId: 'b', shares: 2 }]],
    ['PERCENT', [{ userId: 'a', percent: 40 }, { userId: 'b', percent: 60 }]],
    ['EXACT', [{ userId: 'a', amount: 33.33 }, { userId: 'b', amount: 66.67 }]],
    ['ADJUSTMENT', [{ userId: 'a', adjustment: 10 }, { userId: 'b', adjustment: -10 }]],
  ];
  cases.forEach(([type, participants]) => assert.equal(sum(computeSplit(type, 100, participants)), 100));
});

test('invalid percentage and exact splits are rejected', () => {
  assert.throws(() => computeSplit('PERCENT', 100, [{ userId: 'a', percent: 20 }]), ValidationError);
  assert.throws(() => computeSplit('EXACT', 100, [{ userId: 'a', amount: 1 }]), ValidationError);
});

test('debt simplification keeps the creditor/debtor totals', () => {
  const result = simplifyDebts({ a: 80, b: -30, c: -50 });
  assert.deepEqual(result, [{ fromUserId: 'c', toUserId: 'a', amount: 50, currency: 'INR' }, { fromUserId: 'b', toUserId: 'a', amount: 30, currency: 'INR' }]);
});

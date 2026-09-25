import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeTemplate } from '../src/lib/expenseTemplates.js';
test('editing future exact splits preserves pennies and original history template', () => {
  const template = { amount: 100, splitType: 'EXACT', payers: [{ userId: 'a', paidAmount: 60 }, { userId: 'b', paidAmount: 40 }], participants: [{ userId: 'a', amount: 33.33 }, { userId: 'b', amount: 66.67 }] };
  const updated = resizeTemplate(template, 71.11);
  assert.equal(Math.round(updated.payers.reduce((sum, p) => sum + p.paidAmount, 0) * 100), 7111);
  assert.equal(Math.round(updated.participants.reduce((sum, p) => sum + p.amount, 0) * 100), 7111);
  assert.equal(template.amount, 100);
});

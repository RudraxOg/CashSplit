import test from 'node:test';
import assert from 'node:assert/strict';
import { appPageFromPath, appPathForPage } from '../src/lib/routes.js';

test('app pages have stable deep links', () => {
  assert.equal(appPageFromPath('/app/expenses'), 'expenses');
  assert.equal(appPathForPage('expenses'), '/app/expenses');
  assert.equal(appPathForPage('home'), '/app');
});

test('unknown app paths safely fall back to home', () => {
  assert.equal(appPageFromPath('/app/not-a-page'), 'home');
  assert.equal(appPathForPage('not-a-page'), '/app');
});

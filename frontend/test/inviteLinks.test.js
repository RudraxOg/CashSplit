import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalInviteLink, shareableInviteUrl } from '../src/lib/inviteLinks.js';

test('invite links use the current app origin when the API returns localhost', () => {
  assert.equal(shareableInviteUrl({ invitePath: '/join/abc', inviteUrl: 'http://localhost:5173/join/abc' }, 'https://roommate.example'), 'https://roommate.example/join/abc');
  assert.equal(shareableInviteUrl({ inviteUrl: 'http://localhost:5173/join/abc' }, 'http://127.0.0.1:5199'), 'http://127.0.0.1:5199/join/abc');
  assert.equal(isLocalInviteLink('http://127.0.0.1:5199/join/abc'), true);
});

test('configured public app URL takes priority over a local browser', () => {
  assert.equal(shareableInviteUrl({ invitePath: '/join/abc', inviteUrl: 'https://app.example.com/join/abc' }, 'http://localhost:5173'), 'https://app.example.com/join/abc');
  assert.equal(isLocalInviteLink('https://app.example.com/join/abc'), false);
});

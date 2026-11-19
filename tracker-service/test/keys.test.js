import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newKey, hashKey, sameSecret, isKeyShape } from '../src/keys.js';

test('a new key is 32 hex characters', () => {
  assert.match(newKey(), /^[0-9a-f]{32}$/);
});

test('two new keys differ', () => {
  assert.notEqual(newKey(), newKey());
});

test('the same text hashes the same, different text differently', async () => {
  assert.equal(await hashKey('abc'), await hashKey('abc'));
  assert.notEqual(await hashKey('abc'), await hashKey('abd'));
  assert.equal(await hashKey('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('sameSecret is true only for equal text', async () => {
  assert.equal(await sameSecret('harbour-light-42', 'harbour-light-42'), true);
  assert.equal(await sameSecret('harbour-light-42', 'harbour-light-43'), false);
  assert.equal(await sameSecret('harbour-light-42', ''), false);
});

test('key shape check', () => {
  assert.equal(isKeyShape(newKey()), true);
  assert.equal(isKeyShape('ABCDEF0123456789abcdef0123456789'), false);
  assert.equal(isKeyShape('abc'), false);
  assert.equal(isKeyShape(42), false);
});

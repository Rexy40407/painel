import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');
const root = 'https://vozen.org/panel/helper/';
const safeHash = /^#\/(?:config\/[a-z0-9]+(?:[._-][a-z0-9]+)*|quick-setup|features|activity|rank-card)?$/i;

function redirectDestination(hash) {
  return safeHash.test(hash) ? `${root}${hash}` : root;
}

test('the legacy panel is a noindex compatibility shell for the Vozen origin', () => {
  assert.match(index, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(index, /<meta name="referrer" content="no-referrer"/);
  assert.match(index, /<link rel="canonical" href="https:\/\/vozen\.org\/panel\/helper\/"/);
  assert.match(index, /const root = 'https:\/\/vozen\.org\/panel\/helper\/';/);
  assert.doesNotMatch(index, /assets\/index-[^"']+\.js/);
  assert.doesNotMatch(index, /#session=/);
});

test('only recognised Helper hashes survive the compatibility redirect', () => {
  assert.equal(redirectDestination('#/config/protection.antispam'), `${root}#/config/protection.antispam`);
  assert.equal(redirectDestination('#/quick-setup'), `${root}#/quick-setup`);
  assert.equal(redirectDestination('#/features'), `${root}#/features`);
  assert.equal(redirectDestination('#/activity'), `${root}#/activity`);
  assert.equal(redirectDestination('#/rank-card'), `${root}#/rank-card`);
});

test('tokens, unknown routes and non-router fragments are discarded', () => {
  for (const hash of [
    '#session=secret',
    '#/config/../../account',
    '#/unknown',
    '#access_token=secret',
    '#/config/protection.antispam?session=secret',
    '#/config/protection.antispam/extra',
    '#not-a-route',
  ]) {
    assert.equal(redirectDestination(hash), root, hash);
  }
});


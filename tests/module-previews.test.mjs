import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');

test('the private panel root is the protected Helper tracker', () => {
  assert.match(index, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(index, /const PRIVATE_SESSION_KEY = 'vozen_helper_private_session';/);
  assert.match(index, /\/api\/admin\/private-tracker\/session/);
  assert.match(index, /Servidores do Helper/);
  assert.match(index, /Atividade recente/);
  assert.doesNotMatch(index, /https:\/\/vozen\.org\/panel\/helper\//);
});

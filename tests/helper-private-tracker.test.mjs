import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('site/vozen.html', root), 'utf8');

test('the private Vozen panel sends the Helper tab to its own private tracker', () => {
  assert.match(page, /href="\.\/"[^>]*aria-label="Abrir Helper tracker"/);
  assert.match(page, /const SCOPE = 'identify guilds';/);
  assert.match(page, /vozen_panel_oauth_target/);
});

test('the private Helper tracker exchanges an owner OAuth token for a scoped API session', async () => {
  const helper = await readFile(new URL('site/index.html', root), 'utf8');
  assert.match(helper, /const PRIVATE_SESSION_KEY = 'vozen_helper_private_session';/);
  assert.match(helper, /\/api\/admin\/private-tracker\/session/);
  assert.match(helper, /const SCOPE = 'identify guilds';/);
  assert.match(helper, /vozen_panel_oauth_target/);
  assert.match(helper, /Servidores do Helper/);
  assert.match(helper, /Atividade recente/);
});

test('the old private Helper path only forwards to the private tracker root', async () => {
  const legacy = await readFile(new URL('site/helper.html', root), 'utf8');
  assert.match(legacy, /location\.replace\('\.\/'\)/);
  assert.doesNotMatch(legacy, /PRIVATE_SESSION_KEY/);
});

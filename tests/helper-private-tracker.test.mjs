import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('site/vozen.html', root), 'utf8');

test('the private Vozen panel opens the private Helper tracker variant', () => {
  assert.match(page, /href="vozen\.html\?product=helper"\s+id="helperPanelLink"/);
  assert.match(page, /product=helper/);
  assert.match(page, /const SCOPE = 'identify guilds';/);
  assert.match(page, /\/api\/admin\/private-tracker\/session/);
  assert.match(page, /\/api\/guilds/);
  assert.match(page, /helperPanelLink/);
  assert.match(page, /id="guildsTitle"/);
  assert.match(page, /Servidores do Helper/);
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

test('the legacy private Helper path remains a compatibility redirect', async () => {
  const legacy = await readFile(new URL('site/helper.html', root), 'utf8');
  assert.match(legacy, /location\.replace\('\.\/vozen\.html\?product=helper'\)/);
  assert.doesNotMatch(legacy, /PRIVATE_SESSION_KEY/);
});

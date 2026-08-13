import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../site/vozen.html', import.meta.url), 'utf8');

test('the private tracker keeps both product routes in the same panel', () => {
  assert.match(page, /id="helperPanelLink"/);
  assert.match(page, /id="ttsPanelLink"[^>]*>TTS<\/a>/);
  assert.match(page, /product=helper/);
});

test('switching to Helper stays on the private panel and uses its private session', () => {
  assert.match(
    page,
    /<a href="vozen\.html\?product=helper" id="helperPanelLink">Helper<\/a>/,
  );
  assert.match(page, /vozen_helper_private_session/);
  assert.match(page, /\/api\/admin\/private-tracker\/session/);
  assert.match(page, /\/api\/guilds/);
  assert.doesNotMatch(page, /https:\/\/vozen\.org\/panel\/helper-tracker\//);
});

test('the Helper URL never contains or receives a Discord token', () => {
  assert.doesNotMatch(page, /helper-tracker\/[^'"`\s]*access_token/);
  assert.doesNotMatch(page, /input\.name = 'token'/);
  assert.doesNotMatch(page, /vozen_admin_oauth/);
});

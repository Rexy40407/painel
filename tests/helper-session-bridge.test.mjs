import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../site/vozen.html', import.meta.url), 'utf8');

test('the private tracker identifies its active product as TTS', () => {
  assert.match(page, /<span class="is-active" aria-current="page">TTS<\/span>/);
});

test('switching to Helper follows the official account route directly', () => {
  assert.match(
    page,
    /<a href="https:\/\/vozen\.org\/panel\/helper-tracker\/" id="helperPanelLink">Helper<\/a>/,
  );
  assert.doesNotMatch(page, /helperPanelLink'\)\.addEventListener/);
  assert.doesNotMatch(page, /HELPER_HANDOFF_URL/);
  assert.doesNotMatch(page, /submitHelperHandoff/);
  assert.doesNotMatch(page, /event\.preventDefault\(\)/);
});

test('the Helper URL never contains or receives a Discord token', () => {
  assert.doesNotMatch(page, /helper-tracker\/[^'"`\s]*access_token/);
  assert.doesNotMatch(page, /input\.name = 'token'/);
  assert.doesNotMatch(page, /vozen_admin_oauth/);
});

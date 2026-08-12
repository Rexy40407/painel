import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../site/vozen.html', import.meta.url), 'utf8');

test('the private tracker identifies its active product as TTS', () => {
  assert.match(page, /<span class="is-active" aria-current="page">TTS<\/span>/);
});

test('switching to Helper uses the existing Discord session through the secure bridge', () => {
  assert.match(page, /id="helperPanelLink"/);
  assert.match(page, /const HELPER_SESSION_URL = 'https:\/\/api\.vozen\.org\/rust\/api\/admin\/private-tracker\/session'/);
  assert.match(page, /credentials:\s*'include'/);
  assert.match(page, /body:\s*JSON\.stringify\(\{ token: oauthToken \}\)/);
  assert.match(page, /https:\/\/api\.vozen\.org\/rust\/api\/admin\/private-tracker\/handoff/);
  assert.match(page, /form\.method = 'post'/);
  assert.match(page, /form\.action = HELPER_HANDOFF_URL/);
  assert.match(page, /input\.name = 'token'/);
  assert.match(page, /form\.submit\(\)/);
});

test('Helper handoff falls back to a first-party form when the preflight is blocked', () => {
  assert.match(page, /function submitHelperHandoff\(oauthToken\)/);
  assert.match(page, /catch \(_e\) \{\s*\/\/ CORS\/preflight failures[\s\S]*?submitHelperHandoff\(oauthToken\);/);
  assert.match(page, /if \(response\.status === 401 \|\| response\.status === 403\)/);
  assert.match(page, /setTimeout\(\(\) => preflightController\.abort\(\), 2000\)/);
  assert.match(page, /signal: preflightController\.signal/);
});

test('the handoff never appends a Discord token to the Helper URL', () => {
  assert.match(page, /const HELPER_PANEL_URL = 'https:\/\/vozen\.org\/panel\/helper-tracker\/'/);
  assert.doesNotMatch(page, /helper-tracker\/[^'"`\s]*access_token/);
  assert.doesNotMatch(page, /HELPER_PANEL_URL\s*\+\s*[^;]*token/);
});

test('a one-time OAuth renewal requests guild access and resumes the Helper handoff', () => {
  assert.match(page, /const SCOPE = 'identify guilds'/);
  assert.match(page, /const HELPER_RETURN_KEY = 'vozen_admin_helper_return'/);
  assert.match(page, /sessionStorage\.setItem\(HELPER_RETURN_KEY, '1'\)/);
  assert.match(page, /if \(consumeHelperReturn\(\)\)\s*\{\s*await openHelperPanel\(\);/);
  assert.match(page, /if \(await renewHelperLoginOnce\(\)\) return;/);
});

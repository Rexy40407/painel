import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('site/vozen.html', root), 'utf8');

test('TTS requests bypass stale browser caches and recover from an unavailable API mount', () => {
  assert.match(page, /const bases = \[API_BASE, \.\.\.API_BASES\.filter/);
  assert.match(page, /cache: opts\.cache \|\| 'no-store'/);
  assert.match(page, /lastResponse/);
  assert.match(page, /\[404, 405, 502, 503, 504\]/);
  assert.match(page, /if \(r\.status === 401 \|\| r\.status === 403\) return logoutStale\(\)/);
});

test('Helper session exchange starts on the Rust mount and keeps optional reads optional', () => {
  assert.match(page, /for \(const base of HELPER_API_BASES\)/);
  assert.match(page, /Promise\.allSettled\(\[/);
  assert.match(page, /const requiredFailure = results\.slice\(0, 2\)/);
  assert.match(page, /const authFailure = results\.find/);
});

test('Helper activity normalizes API aliases and does not describe voice calls', () => {
  assert.match(page, /item\.user_id \|\| item\.userId \|\| item\.user_tag/);
  assert.match(page, /item\.count \?\? item\.messages \?\? item\.messageCount/);
  assert.match(page, /O Helper não reporta chamadas de voz/);
  assert.match(page, /operações Helper ativas agora/);
});

test('Optional API nulls stay unavailable instead of becoming fake zero values', () => {
  assert.match(page, /function finiteNumber\(value\)/);
  assert.match(page, /if \(value === null \|\| value === undefined \|\| value === ''\) return NaN/);
  assert.match(page, /const activeSessionsValue = finiteNumber\(stats\.activeSessions\)/);
  assert.match(page, /const outboxReadable = outbox && Number\.isFinite\(outboxRows\)/);
});

test('Guild icons work with either CDN URLs or Discord icon hashes', () => {
  assert.match(page, /function guildIconUrl\(guild\)/);
  assert.match(page, /cdn\.discordapp\.com\/icons/);
  assert.match(page, /icon: guildIconUrl\(guild\)/);
  assert.match(page, /guild\.botPresent !== false && guild\.bot_installed !== false/);
  assert.match(page, /ic\.addEventListener\('error'/);
});

test('Expired sessions are handled centrally without masking temporary outages', () => {
  assert.match(page, /if \(response\.status === 401 \|\| response\.status === 403\) \{/);
  assert.match(page, /if \(error\.status !== 401 && error\.status !== 403\) return true/);
});

test('OAuth retries the existing Discord token and can recover a split API mount', () => {
  assert.match(page, /let authInProgress = false/);
  assert.match(page, /if \(discordToken\) \{\s*showSect\('sLoading'\);\s*doLogin\(\);/s);
  assert.match(page, /let authResponse = null/);
  assert.match(page, /authResponse \|\|= response/);
  assert.match(page, /if \(authResponse\) return authResponse/);
  assert.match(page, /cache: 'no-store'/);
  assert.match(page, /Tentar validar novamente/);
});

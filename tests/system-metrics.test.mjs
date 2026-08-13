import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../site/vozen.html', import.meta.url), 'utf8');

test('Supabase has the same expandable seven-day statistics surface as SQLite', () => {
  assert.match(page, /id="supabaseAverage"/);
  assert.match(page, /id="supabaseHistory"/);
  assert.match(page, /function renderSupabaseHistory\(samples\)/);
  assert.match(page, /renderSupabaseHistory\(supabase && supabase\.history\)/);
});

test('metrics use accessible disclosure controls, including active server names', () => {
  assert.match(page, /\.ops__sidebar\s*\{\s*display: grid; align-self: stretch; align-content: start;/);
  assert.match(page, /\.ops__live\s*\{\s*display: flex; flex-direction: column; justify-content: flex-start;/);
  assert.match(page, /id="activeServers"/);
  assert.match(page, /id="databaseDetails"/);
  assert.match(page, /id="supabaseDetails"/);
  assert.match(page, /id="activeServersDetails"/);
  assert.match(page, /<summary>/);
  assert.match(page, /function renderActiveServers\(servers\)/);
  assert.match(page, /renderActiveServers\(metrics\.activeVoiceServers\)/);
});

test('Helper metrics consume real storage fields and bot guild icons', () => {
  assert.match(page, /stats\.storage/);
  assert.match(page, /storage\.productBytes/);
  assert.match(page, /Armazenamento do Vozen Helper/);
  assert.match(page, /Armazenamento do Vozen TTS/);
  assert.match(page, /formatBytes\(displayedBytes\)/);
  assert.match(page, /guild\.iconUrl \|\| guild\.icon/);
  assert.match(page, /stats\.activeSessions/);
});

test('Helper metrics prefer the Rust runtime over the legacy root API', () => {
  assert.match(page, /const HELPER_API_BASES = \['https:\/\/api\.vozen\.org\/rust', 'https:\/\/api\.vozen\.org'\]/);
  assert.match(page, /let helperApiBase = HELPER_API_BASES\[0\]/);
  assert.match(page, /const bases = \[helperApiBase, \.\.\.HELPER_API_BASES\.filter/);
  assert.match(page, /helperApiBase = HELPER_API_BASES\[0\];/);
});

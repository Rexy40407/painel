import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const utilitySource = await readFile(new URL('../site/server-history.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../site/vozen.html', import.meta.url), 'utf8');

function loadUtility() {
  const context = {};
  context.globalThis = context;
  vm.runInNewContext(utilitySource, context, { filename: 'server-history.js' });
  return context.VozenServerHistory;
}

test('server growth history counts joins in the supplied seven UTC days', () => {
  const { buildServerJoinHistory } = loadUtility();
  const days = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'];
  const history = buildServerJoinHistory([
    { joinedTimestamp: Date.parse('2026-08-23T00:00:00Z') },
    { joinedTimestamp: Math.floor(Date.parse('2026-08-23T12:00:00Z') / 1000) },
    { joinedAt: '2026-08-21T23:59:59Z' },
    { joined_at: '2026-08-18T08:00:00Z' },
    { joinedTimestamp: 'not-a-date' },
    { joinedTimestamp: Date.parse('2026-08-16T23:59:59Z') },
  ], days);

  assert.deepEqual(JSON.parse(JSON.stringify(history)), [
    { day: '2026-08-17', count: 0 },
    { day: '2026-08-18', count: 1 },
    { day: '2026-08-19', count: 0 },
    { day: '2026-08-20', count: 0 },
    { day: '2026-08-21', count: 1 },
    { day: '2026-08-22', count: 0 },
    { day: '2026-08-23', count: 2 },
  ]);
});

test('server growth history ignores malformed timestamps and never mutates input', () => {
  const { buildServerJoinHistory } = loadUtility();
  const guilds = [{ joinedTimestamp: 0 }, { joinedTimestamp: null }, { joinedTimestamp: -1 }];
  const snapshot = JSON.stringify(guilds);
  assert.deepEqual(JSON.parse(JSON.stringify(buildServerJoinHistory(guilds, ['2026-08-23']))), [{ day: '2026-08-23', count: 0 }]);
  assert.equal(JSON.stringify(guilds), snapshot);
});

test('server growth history accepts ISO timestamps and unix seconds without leaking invalid days', () => {
  const { utcDayKey, countServerJoinsToday } = loadUtility();
  assert.equal(utcDayKey('2026-08-23T23:59:59Z'), '2026-08-23');
  assert.equal(utcDayKey(Math.floor(Date.parse('2026-08-23T12:00:00Z') / 1000)), '2026-08-23');
  assert.equal(countServerJoinsToday([{ joined_timestamp: '2026-08-23T01:00:00Z' }], ['2026-08-22', '2026-08-23']), 1);
  assert.equal(countServerJoinsToday([{ joinedTimestamp: '2026-08-24T01:00:00Z' }], ['2026-08-22', '2026-08-23']), 0);
});

test('servers panel exposes today count and a seven-day disclosure', () => {
  assert.match(page, /<script src="server-history\.js"><\/script>/);
  assert.match(page, /id="newGuildsToday"[^>]*aria-live="polite"/);
  assert.match(page, /id="newGuildsHistory"/);
  assert.match(page, /function renderServerGrowth\(guilds\)/);
  assert.match(page, /renderServerGrowth\(guilds\)/);
  assert.match(page, /buildServerJoinHistory/);
});

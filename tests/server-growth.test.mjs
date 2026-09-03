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

test('private panel renders each product growth from its authenticated aggregate endpoint', () => {
  assert.match(page, /id="growthDashboard"/);
  assert.match(page, /data-growth-range="7"/);
  assert.match(page, /data-growth-range="30"/);
  assert.match(page, /data-growth-range="90"/);
  assert.match(page, /function loadGrowthMetrics\(\)/);
  assert.match(page, /product=' \+ \(isHelperProduct \? 'helper' : 'tts'\)/);
  assert.match(page, /isHelperProduct \? helperJson\(path\) : adminJson\(path\)/);
  assert.match(page, /Sem IDs de servidores ou utilizadores/);
  assert.match(page, /growthTopggPanel'\)\.hidden = false/);
  assert.match(page, /function loadWebAnalytics\(\)/);
  assert.match(page, /adminJson\('\/api\/admin\/web-analytics\?from='/);
  assert.match(page, /A configuração e o token continuam apenas no servidor/);
});

test('conversion funnel joins product traffic to install, setup and first value', () => {
  const { buildProductConversionFunnel } = loadUtility();
  const tts = buildProductConversionFunnel(
    { joins: 7, setupCompleted: 3, firstValue: 2 },
    { productVisits: { tts: 41, helper: 9 } },
    'tts',
  );
  assert.equal(tts.denominator, 41);
  assert.deepEqual(JSON.parse(JSON.stringify(tts.rows)), [
    { label: 'Visitas às páginas do produto', value: 41 },
    { label: 'Instalações concluídas', value: 7 },
    { label: 'Setup concluído', value: 3 },
    { label: 'Primeiro valor', value: 2 },
  ]);

  const helper = buildProductConversionFunnel(
    { joins: 4, setupCompleted: 2, firstValue: 1 },
    { productVisits: { tts: 41, helper: 9 } },
    'helper',
  );
  assert.equal(helper.denominator, 9);
  assert.equal(helper.rows[0].value, 9);
});

test('conversion funnel stays honest while product traffic is unavailable', () => {
  const { buildProductConversionFunnel } = loadUtility();
  const funnel = buildProductConversionFunnel(
    { joins: 5, setupCompleted: 2, firstValue: 1 },
    null,
    'tts',
  );
  assert.equal(funnel.denominator, 5);
  assert.equal(funnel.rows[0].value, null);
  assert.equal(funnel.rows[1].value, 5);
  assert.match(page, /Visita → instalação → setup → primeiro valor/);
  assert.match(page, /\$\('webAnalyticsDashboard'\)\.hidden = false/);
});

test('private panel distinguishes current ready servers from newly tracked setup events', () => {
  assert.match(page, /Servidores prontos/);
  assert.match(page, /configuredGuilds/);
  assert.match(page, /configurações novas/);
  assert.match(page, /Servidores com uso/);
  assert.match(page, /usedGuilds/);
  assert.match(page, /com reprodução registada/);
  assert.match(page, /source !== 'baseline'/);
});

test('growth period note explains when every selector contains the full measured history', () => {
  const { buildGrowthPeriodNote } = loadUtility();
  const note = buildGrowthPeriodNote({ measurementStartedOn: '2026-08-28' }, 90, '2026-08-29');
  assert.equal(note.historyDays, 2);
  assert.equal(note.includesFullHistory, true);
  assert.match(note.message, /Histórico medido: 2 dias/);
  assert.match(note.message, /7, 30 e 90 dias abrangem os mesmos dados/);
  assert.match(note.message, /valores grandes mostram o estado atual/);
});

test('growth period note keeps a partial window distinct after more than seven measured days', () => {
  const { buildGrowthPeriodNote } = loadUtility();
  const recent = buildGrowthPeriodNote({ measurementStartedOn: '2026-08-01' }, 7, '2026-08-29');
  assert.equal(recent.historyDays, 29);
  assert.equal(recent.includesFullHistory, false);
  assert.match(recent.message, /A janela de 7 dias contém apenas parte/);
  assert.doesNotMatch(recent.message, /abrangem os mesmos dados/);

  const full = buildGrowthPeriodNote({ measurementStartedOn: '2026-08-01' }, 30, '2026-08-29');
  assert.equal(full.includesFullHistory, true);
  assert.match(full.message, /Os 30 dias selecionados abrangem todo o histórico medido/);
});

test('growth period note handles one day and unavailable coverage without inventing dates', () => {
  const { buildGrowthPeriodNote } = loadUtility();
  const firstDay = buildGrowthPeriodNote({ measurementStartedOn: '2026-08-29' }, 7, '2026-08-29');
  assert.match(firstDay.message, /Histórico medido: 1 dia\./);
  const invalid = buildGrowthPeriodNote({ measurementStartedOn: '2026-02-30' }, 90, '2026-08-29');
  assert.equal(invalid.historyDays, null);
  assert.equal(invalid.includesFullHistory, false);
  assert.match(invalid.message, /início da medição está indisponível/);
  assert.doesNotMatch(invalid.message, /Histórico medido:/);
});

test('private panel presents the period explanation beside the range controls', () => {
  assert.match(page, /id="growthPeriodNote"[^>]*aria-live="polite"/);
  assert.match(page, /buildGrowthPeriodNote/);
  assert.match(page, /\$\('growthPeriodNote'\)\.textContent = periodNote\.message/);
  assert.match(page, /valores grandes mostram o estado atual/);
});

test('ninety-day summary keeps total inventory separate from measured growth', () => {
  const { buildGrowthInventorySummary } = loadUtility();
  const summary = buildGrowthInventorySummary({
    currentGuilds: 172,
    baselineGuilds: 168,
    measurementStartedOn: '2026-08-28',
    joins: 7,
    leaves: 3,
    net: 4,
  }, 90);
  assert.equal(summary.current, '172');
  assert.equal(summary.detail, '+4 líquido medido · 7 entradas · 3 saídas');
  assert.equal(summary.coverage, '90 dias selecionados · Medição desde 28/08/2026 · Base inicial: 168 servidores, sem datas históricas de entrada');
  assert.match(page, /growth-card__label">Servidores atuais/);
  assert.match(page, /id="growthCoverage"/);
  assert.match(page, /Instalações concluídas/);
  assert.doesNotMatch(page, /growth-card__label">Entradas líquidas/);
});

test('short windows do not change current inventory or invent measurement coverage', () => {
  const { buildGrowthInventorySummary } = loadUtility();
  const recent = buildGrowthInventorySummary({ currentGuilds: 172, joins: 2, leaves: 1, net: 999 }, 7);
  assert.equal(recent.current, '172');
  assert.equal(recent.detail, '+1 líquido medido · 2 entradas · 1 saídas');
  assert.equal(recent.coverage, '7 dias selecionados · Início da medição indisponível');
  const invalid = buildGrowthInventorySummary({ measurementStartedOn: '2026-02-30' }, 90);
  assert.equal(invalid.current, '0');
  assert.doesNotMatch(invalid.coverage, /Medição desde/);
});

test('private panel surfaces a sanitized Top.gg configuration diagnosis', () => {
  assert.match(page, /function formatTopggDetail\(detail\)/);
  assert.match(page, /Token Top\.gg não configurado/);
  assert.match(page, /Token v1 inválido, expirado ou legacy/);
  assert.match(page, /\['Votos válidos', String\(Math\.max\(0, Number\(data\.votes\) \|\| 0\)\)\]/);
  assert.match(page, /\['Diagnóstico', formatTopggDetail\(topgg\.lastDetail\)\]/);
});

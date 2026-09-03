import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../site/vozen.html', import.meta.url), 'utf8');

function createLoaderHarness(kind, helper = false) {
  const name = kind === 'growth' ? 'loadGrowthMetrics' : 'loadWebAnalytics';
  const end = kind === 'growth' ? '      function compactMetric' : "      document.querySelectorAll('[data-growth-range]')";
  const start = page.indexOf('      async function ' + name + '()');
  const finish = page.indexOf(end, start);
  assert.ok(start > 0 && finish > start, 'analytics loader exists');
  const pending = [];
  const rendered = [];
  const failures = [];
  const dashboard = { dataset: {} };
  const request = (path) => new Promise((resolve, reject) => pending.push({ path, resolve, reject }));
  const context = {
    growthDays: 7,
    growthRequestId: 0,
    webAnalyticsRequestId: 0,
    session: {},
    helperSession: { token: 'test-only' },
    isHelperProduct: helper,
    $: () => dashboard,
    growthDateRange: (days) => ['window-' + days, 'today'],
    adminJson: request,
    helperJson: request,
    renderGrowthMetrics: (data, days) => rendered.push({ data, days }),
    renderWebAnalytics: (data, days) => rendered.push({ data, days }),
    renderGrowthUnavailable: () => failures.push('growth'),
    renderWebAnalyticsUnavailable: () => failures.push('traffic'),
    isAuthFailure: (error) => error.status === 401,
    logoutStale: () => failures.push('logout'),
  };
  vm.runInNewContext(page.slice(start, finish), context, { filename: 'vozen-analytics-loaders.js' });
  return { context, pending, rendered, failures, load: context[name] };
}

for (const [kind, helper] of [['growth', false], ['growth', true], ['traffic', false], ['traffic', true]]) {
  const label = kind + (helper ? ' helper' : ' tts');
  test(label + ' ignores a late response for the previous date range', async () => {
    const h = createLoaderHarness(kind, helper);
    const oldRequest = h.load();
    h.context.growthDays = 90;
    const currentRequest = h.load();
    assert.match(h.pending[0].path, /from=window-7/);
    assert.match(h.pending[1].path, /from=window-90/);
    h.pending[1].resolve({ period: 90 });
    await currentRequest;
    h.pending[0].resolve({ period: 7 });
    await oldRequest;
    assert.deepEqual(h.rendered.map((item) => item.data.period), [90]);
    assert.equal(h.rendered[0].days, 90);
  });

  test(label + ' ignores stale errors without clearing data or logging out', async () => {
    const h = createLoaderHarness(kind, helper);
    const oldRequest = h.load();
    h.context.growthDays = 90;
    const currentRequest = h.load();
    h.pending[1].resolve({ period: 90 });
    await currentRequest;
    h.pending[0].reject({ status: 401 });
    await oldRequest;
    assert.deepEqual(h.failures, []);
    assert.deepEqual(h.rendered.map((item) => item.data.period), [90]);
  });

  test(label + ' still reports errors from the active request', async () => {
    const h = createLoaderHarness(kind, helper);
    const request = h.load();
    h.pending[0].reject({ status: 500 });
    await request;
    assert.deepEqual(h.failures, [kind]);
  });

  test(label + ' still logs out when the active session expires', async () => {
    const h = createLoaderHarness(kind, helper);
    const request = h.load();
    h.pending[0].reject({ status: 401 });
    await request;
    assert.deepEqual(h.failures, ['logout']);
  });

  test(label + ' invalidates pending data when a reload has no session', async () => {
    const h = createLoaderHarness(kind, helper);
    const oldRequest = h.load();
    h.context.session = null;
    h.context.helperSession = null;
    await h.load();
    assert.equal(h.pending.length, 1);
    h.pending[0].resolve({ period: 7 });
    await oldRequest;
    assert.deepEqual(h.rendered, []);
  });
}

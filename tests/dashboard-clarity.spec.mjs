import { test, expect } from '@playwright/test';

// Synthetic fixtures are confined to tests, never embedded in the dashboard.
const fixture = {
  currentGuilds: 192, configuredGuilds: 94, usedGuilds: 95,
  baselineGuilds: 168, measurementStartedOn: '2026-08-28',
  joins: 10, leaves: 2, setupCompleted: 3, firstValue: 2,
  retainedW7: null, eligibleW7: 0, retainedW30: null, eligibleW30: 0,
  daily: [{ day: '2026-09-05', source: 'unknown', joins: 10, leaves: 2 }],
  topgg: { healthy: false, alert: false, lastDetail: 'unconfigured' },
};

async function openPanel(page, product = 'tts') {
  await page.route('https://api.vozen.org/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"guilds":[],"users":[]}' }));
  await page.goto('/site/vozen.html?product=' + product);
  await page.evaluate(data => {
    document.body.classList.add('has-panel');
    document.querySelector('#auth').style.display = 'none';
    document.querySelector('#panel').classList.add('show');
    window.renderGrowthMetrics(data, 30);
  }, fixture);
}

for (const product of ['tts', 'helper']) {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`${product}: clear summary and navigation at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await openPanel(page, product);
      await expect(page.getByRole('tab', { name: 'Resumo', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#growthDashboard')).toBeVisible();
      await expect(page.locator('#paneGrants')).toBeHidden();
      await expect(page.locator('#systemDashboard')).toBeHidden();
      await expect(page.locator('#growthNet')).toHaveText('192');
      await expect(page.locator('#growthSetupDetail')).toContainText('94 de 192');
      await expect(page.locator('#periodNet')).toHaveText('+8');
      await expect(page.locator('#periodJoins')).toHaveText('10');
      await expect(page.locator('#topggSummary')).toContainText('Não configurado');
      await expect(page.locator('#growthRetentionDetail')).toContainText('Sem servidores elegíveis');
      await page.getByRole('tab', { name: 'Site', exact: true }).click();
      await expect(page.locator('#webAnalyticsDashboard')).toBeVisible();
      await expect(page.locator('#growthDashboard')).toBeHidden();
      await expect(page.locator('#analyticsToolbar')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('tab', { name: 'Sistema', exact: true }).click();
      await expect(page.locator('#systemDashboard')).toBeVisible();
      await expect(page.locator('#analyticsToolbar')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('tab', { name: 'Passes', exact: true }).click();
      await expect(page.locator('#paneGrants')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('tab', { name: 'Servidores', exact: true }).click();
      await expect(page.locator('#paneServers')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
      await expect(page.locator('#growthNet')).toHaveText('192');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (product === 'tts' && [375, 1440].includes(width)) {
        await page.screenshot({ path: test.info().outputPath(`summary-${width}.png`), fullPage: true });
      }
      expect(errors).toEqual([]);
    });
  }
}

test('unavailable vitals and errors never look like perfect zero measurements', async ({ page }) => {
  await openPanel(page);
  await page.getByRole('tab', { name: 'Site', exact: true }).click();
  await page.evaluate(() => window.renderWebAnalytics({ visits: 0, pageViews: 0, coreWebVitals: { lcpP75Ms: null, inpP75Ms: null, clsP75: null, sampleCount: 0 } }));
  await expect(page.locator('#webAnalyticsLcp')).toHaveText('—');
  await expect(page.locator('#webAnalyticsInpCls')).toHaveText('— / —');
  await expect(page.locator('#webAnalyticsVisits')).toHaveText('0');
  await page.evaluate(() => window.renderWebAnalyticsUnavailable());
  await expect(page.locator('#webAnalyticsPages')).toContainText('Dados indisponíveis');
  await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
  await page.evaluate(() => window.renderGrowthUnavailable());
  await expect(page.locator('#periodNet')).toHaveText('—');
  await expect(page.locator('#topggSummary')).toContainText('Indisponível');
});

test('tabs support arrow-key navigation without moving focus into hidden content', async ({ page }) => {
  await openPanel(page);
  const summary = page.getByRole('tab', { name: 'Resumo', exact: true });
  await summary.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Site', exact: true })).toBeFocused();
  await expect(page.locator('#webAnalyticsDashboard')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(summary).toBeFocused();
  await expect(page.locator('#growthDashboard')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Passes', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(summary).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Passes', exact: true })).toBeFocused();
});

test('date filters update measured movement and site traffic, not current inventory', async ({ page }) => {
  await openPanel(page);
  await page.evaluate(data => {
    session = {};
    adminJson = async path => {
      const url = new URL(path, location.origin);
      const days = Math.round((Date.parse(url.searchParams.get('to')) - Date.parse(url.searchParams.get('from'))) / 86400000) + 1;
      if (url.pathname.includes('web-analytics')) return { visits: days, pageViews: days * 2 };
      return { ...data, joins: days, leaves: 2 };
    };
  }, fixture);
  for (const days of [7, 90, 30]) {
    await page.getByRole('button', { name: `${days} dias`, exact: true }).click();
    await expect(page.locator('#periodJoins')).toHaveText(String(days));
    await expect(page.locator('#periodNet')).toHaveText('+' + (days - 2));
    await expect(page.locator('#growthNet')).toHaveText('192');
    await expect(page.locator('#growthSetupDetail')).toContainText('94 de 192');
    await expect(page.getByRole('button', { name: `${days} dias`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('tab', { name: 'Site', exact: true }).click();
    await expect(page.locator('#webAnalyticsVisits')).toHaveText(String(days));
    await expect(page.locator('#analyticsRangeLabel')).toContainText(String(days));
    await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.locator('#periodJoins')).toHaveText('30');
  await page.locator('#topggSummary').click();
  await expect(page.getByRole('tab', { name: 'Sistema', exact: true })).toBeFocused();
  await expect(page.locator('#growthTopgg')).toBeVisible();
});

test('private data remains behind authentication and controls never submit management actions on navigation', async ({ page }) => {
  const writes = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/site/vozen.html');
  await expect(page.locator('#panel')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Entrar com Discord', exact: true })).toBeVisible();
  await openPanel(page);
  for (const name of ['Passes', 'Sistema', 'Site', 'Resumo']) await page.getByRole('tab', { name, exact: true }).click();
  expect(writes).toEqual([]);
});

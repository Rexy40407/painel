import { test, expect } from '@playwright/test';

const growth = {
  currentGuilds: 172,
  baselineGuilds: 168,
  measurementStartedOn: '2026-08-28',
  configuredGuilds: 120,
  usedGuilds: 94,
  joins: 7,
  leaves: 3,
  setupCompleted: 1,
  firstValue: 0,
  retainedW7: null,
  retainedW30: null,
  sources: [{ source: 'unknown', joins: 7 }],
  topgg: {
    healthy: true,
    alert: false,
    lastDetail: 'delivered',
    lastStatus: 204,
    consecutiveFailures: 0,
    lastServerCount: 172,
    driftPercent: 0,
  },
};

async function showGrowthPanel(page, days) {
  await page.goto('/site/vozen.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ data, selectedDays }) => {
    document.body.classList.add('has-panel');
    document.querySelector('#auth').style.display = 'none';
    const panel = document.querySelector('#panel');
    panel.classList.add('show');
    const dashboard = document.querySelector('#growthDashboard');
    for (const child of panel.children) if (child !== dashboard) child.style.display = 'none';
    window.renderGrowthMetrics(data, selectedDays);
  }, { data: growth, selectedDays: days });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`a explicação dos períodos permanece legível em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await showGrowthPanel(page, 90);

    const note = page.locator('#growthPeriodNote');
    await expect(note).toBeVisible();
    await expect(note).toContainText(/Histórico medido: [1-7] dias?/);
    await expect(note).toContainText('7, 30 e 90 dias abrangem os mesmos dados');
    await expect(page.locator('#growthNet')).toHaveText('172');

    const geometry = await page.evaluate(() => {
      const dashboard = document.querySelector('#growthDashboard').getBoundingClientRect();
      const note = document.querySelector('#growthPeriodNote').getBoundingClientRect();
      const cards = [...document.querySelectorAll('#growthDashboard .growth-card')].map((card) => card.getBoundingClientRect());
      return {
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        noteInside: note.left >= dashboard.left && note.right <= dashboard.right && note.height > 0,
        cardsInside: cards.every((card) => card.left >= dashboard.left && card.right <= dashboard.right),
      };
    });
    expect(geometry).toEqual({ horizontalOverflow: false, noteInside: true, cardsInside: true });
    expect(errors).toEqual([]);
  });
}

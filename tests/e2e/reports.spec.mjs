import { test, expect } from '@playwright/test';

test.describe('Relatórios: gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.click('button.nav-btn:has-text("Movimentações")');
    for (const [date, desc, cat, val] of [
      ['05/08', 'Aluguel', 'moradia', '1200'],
      ['06/08', 'Mercado', 'mercado', '450'],
    ]) {
      await page.fill('#trans-date', date);
      await page.fill('#trans-desc', desc);
      await page.selectOption('#trans-category', cat);
      await page.selectOption('#trans-type', 'variavel');
      await page.fill('#trans-value', val);
      await page.click('#trans-form button[type=submit]');
    }
    await page.click('button.nav-btn:has-text("Relatórios")');
  });

  test('renders the category pie chart, ranking bar chart and status pie chart with data', async ({ page }) => {
    await expect(page.locator('#category-pie-chart')).toBeVisible();
    await expect(page.locator('#category-pie-legend')).toContainText('Moradia');
    await expect(page.locator('#category-pie-legend')).toContainText('Mercado');

    await expect(page.locator('#category-ranking-chart')).toBeVisible();
    await expect(page.locator('#category-ranking-empty')).toBeHidden();

    await expect(page.locator('#status-pie-chart')).toBeVisible();
    await expect(page.locator('#status-pie-legend')).toContainText('Pago');
  });

  test('hovering the category ranking chart shows a tooltip with the category value', async ({ page }) => {
    const hit = await page.evaluate(() => {
      const canvas = document.getElementById('category-ranking-chart');
      const rect = canvas.getBoundingClientRect();
      const fn = chartTooltipState['category-ranking-chart'];
      return fn(rect.width * 0.5, 18);
    });
    expect(hit).not.toBeNull();
    expect(hit.html).toContain('Moradia');
    expect(hit.html).toContain('R$ 1.200,00');
  });

  test('shows an empty state when there is no data for the selected month', async ({ page }) => {
    await page.selectOption('#month-select', '0');
    await page.selectOption('#year-select', '2020');
    await expect(page.locator('#category-ranking-empty')).toBeVisible();
    await expect(page.locator('#category-pie-legend')).toContainText('Sem gastos registrados');
  });
});

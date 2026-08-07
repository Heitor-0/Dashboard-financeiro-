import { test, expect } from '@playwright/test';

test.describe('Gastos fixos recorrentes', () => {
  test('a recurring "Fixo" transaction projects into future months and can be stopped', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('/index.html');
    await page.selectOption('#month-select', '0'); // Janeiro
    await page.selectOption('#year-select', '2026');
    await page.click('button.nav-btn:has-text("Movimentações")');

    await page.selectOption('#trans-type', 'fixo');
    await expect(page.locator('#recurring-section')).toBeVisible();

    await page.fill('#trans-date', '05/01');
    await page.fill('#trans-desc', 'Aluguel');
    await page.selectOption('#trans-category', 'moradia');
    await page.fill('#trans-value', '1500');
    await page.check('#trans-recurring');
    await page.click('#trans-form button[type=submit]');

    await expect(page.locator('#trans-list tr', { hasText: 'Aluguel' })).toBeVisible();

    // April: should also show the projected occurrence
    await page.selectOption('#month-select', '3');
    await expect(page.locator('#trans-list tr', { hasText: 'Aluguel' })).toContainText('R$ 1.500,00');

    // Editing April's occurrence only changes April
    await page.locator('#trans-list tr', { hasText: 'Aluguel' }).locator('.edit-btn').click();
    await expect(page.locator('#recurring-section')).toBeHidden();
    await page.fill('#trans-value', '1600');
    await page.click('#trans-form button[type=submit]');
    await expect(page.locator('#trans-list tr', { hasText: 'Aluguel' })).toContainText('R$ 1.600,00');

    await page.selectOption('#month-select', '0');
    await expect(page.locator('#trans-list tr', { hasText: 'Aluguel' })).toContainText('R$ 1.500,00');
  });
});

test.describe('Alertas de orçamento no Radar Financeiro', () => {
  test('shows a danger alert when a category exceeds its monthly limit', async ({ page }) => {
    await page.goto('/index.html');

    await page.click('button.nav-btn:has-text("Config")');
    const limitInput = page.locator('.category-config-row', {
      has: page.locator('input.cat-name-input[value="Lazer"]'),
    }).locator('.cat-limit-input');
    await limitInput.fill('200');
    await limitInput.dispatchEvent('change');

    await page.click('button.nav-btn:has-text("Movimentações")');
    await page.fill('#trans-date', '06/08');
    await page.fill('#trans-desc', 'Cinema e jantar');
    await page.selectOption('#trans-category', 'lazer');
    await page.selectOption('#trans-type', 'variavel');
    await page.fill('#trans-value', '250');
    await page.click('#trans-form button[type=submit]');

    await page.click('button.nav-btn:has-text("Dashboard")');
    const alert = page.locator('.radar-item.severity-danger', { hasText: 'Lazer' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('estourou o limite');
  });

  test('shows no category alert when spending is well within the limit', async ({ page }) => {
    await page.goto('/index.html');

    await page.click('button.nav-btn:has-text("Config")');
    const limitInput = page.locator('.category-config-row', {
      has: page.locator('input.cat-name-input[value="Lazer"]'),
    }).locator('.cat-limit-input');
    await limitInput.fill('1000');
    await limitInput.dispatchEvent('change');

    await page.click('button.nav-btn:has-text("Movimentações")');
    await page.fill('#trans-date', '06/08');
    await page.fill('#trans-desc', 'Cinema');
    await page.selectOption('#trans-category', 'lazer');
    await page.selectOption('#trans-type', 'variavel');
    await page.fill('#trans-value', '50');
    await page.click('#trans-form button[type=submit]');

    await page.click('button.nav-btn:has-text("Dashboard")');
    await expect(page.locator('.radar-item', { hasText: 'Lazer' })).toHaveCount(0);
  });
});

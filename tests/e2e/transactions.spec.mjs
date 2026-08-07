import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Movimentações: add / edit / delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.click('button.nav-btn:has-text("Movimentações")');
  });

  test('adding a transaction shows it in the table', async ({ page }) => {
    await page.fill('#trans-date', '05/08');
    await page.fill('#trans-desc', 'Mercado Semanal');
    await page.selectOption('#trans-category', 'mercado');
    await page.selectOption('#trans-type', 'variavel');
    await page.fill('#trans-value', '200');
    await page.click('#trans-form button[type=submit]');

    const row = page.locator('#trans-list tr', { hasText: 'Mercado Semanal' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('R$ 200,00');
  });

  test('editing a transaction updates it in place without duplicating the row', async ({ page }) => {
    await page.fill('#trans-date', '05/08');
    await page.fill('#trans-desc', 'Farmacia');
    await page.selectOption('#trans-category', 'farmacia');
    await page.selectOption('#trans-type', 'variavel');
    await page.fill('#trans-value', '50');
    await page.click('#trans-form button[type=submit]');

    await page.locator('#trans-list tr', { hasText: 'Farmacia' }).locator('.edit-btn').click();
    await expect(page.locator('#trans-edit-banner')).toBeVisible();
    await page.fill('#trans-value', '75');
    await page.selectOption('#trans-status', 'pendente');
    await page.click('#trans-form button[type=submit]');

    const rows = page.locator('#trans-list tr', { hasText: 'Farmacia' });
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('R$ 75,00');
    await expect(rows).toContainText('pendente');
    await expect(page.locator('#trans-edit-banner')).toBeHidden();
  });

  test('deleting a transaction removes it', async ({ page }) => {
    await page.fill('#trans-date', '05/08');
    await page.fill('#trans-desc', 'Assinatura Temporaria');
    await page.selectOption('#trans-category', 'assinaturas');
    await page.selectOption('#trans-type', 'variavel');
    await page.fill('#trans-value', '30');
    await page.click('#trans-form button[type=submit]');

    const row = page.locator('#trans-list tr', { hasText: 'Assinatura Temporaria' });
    await expect(row).toBeVisible();
    await row.locator('.delete-btn').click();
    await expect(page.locator('#trans-list tr', { hasText: 'Assinatura Temporaria' })).toHaveCount(0);
  });
});

test.describe('Importar Extrato Bancário', () => {
  test('importing the real Banco Inter fixture produces correct rows and totals', async ({ page }) => {
    await page.goto('/index.html');
    // The fixture's transactions are all dated March/2026; each row is routed to its
    // own month regardless of what's selected here, so switch to March to see them.
    await page.selectOption('#month-select', '2');
    await page.selectOption('#year-select', '2026');
    await page.click('button.nav-btn:has-text("Movimentações")');

    await page.setInputFiles('#import-file-input', path.join(__dirname, '..', 'fixtures', 'extrato-banco-inter.csv'));

    await expect(page.locator('#import-summary')).toContainText('32 movimentações encontradas');

    page.on('dialog', (d) => d.accept());
    await page.click('button:has-text("Confirmar Importação")');

    await expect(page.locator('#trans-list tr')).toHaveCount(32);

    await page.click('button.nav-btn:has-text("Dashboard")');
    await expect(page.locator('#total-income')).toContainText('5.306,69');
    await expect(page.locator('#total-spent')).toContainText('5.846,84');
  });

  test('re-importing the same file flags every row as a likely duplicate', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('button.nav-btn:has-text("Movimentações")');
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'extrato-banco-inter.csv');

    page.on('dialog', (d) => d.accept());
    await page.setInputFiles('#import-file-input', fixturePath);
    await page.click('button:has-text("Confirmar Importação")');

    await page.setInputFiles('#import-file-input', fixturePath);
    await expect(page.locator('#import-summary')).toContainText('0 selecionada');
    await expect(page.locator('#import-summary')).toContainText('32 possível');
  });
});

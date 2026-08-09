import { test, expect } from '@playwright/test';

function formatDDMM(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

test.describe('Assinaturas: cobrança futura não conta como paga no mês atual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('assinatura no crédito com próxima cobrança em mês futuro não aparece como paga no mês atual', async ({ page }) => {
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + 40); // guaranteed to land in a later month

    await page.click('button.nav-btn:has-text("Cartão")');
    await page.fill('#card-name', 'Nubank');
    await page.fill('#card-new-limit', '5000');
    await page.selectOption('#card-color', '#3B82F6');
    await page.fill('#card-new-open', '10');
    await page.fill('#card-new-close', '17');
    await page.click('button:has-text("Adicionar Cartão")');

    await page.click('button.nav-btn:has-text("Assinaturas")');
    await page.fill('#sub-name', 'Netflix');
    await page.fill('#sub-value', '55.90');
    await page.selectOption('#sub-frequency', 'mensal');
    await page.selectOption('#sub-category', 'assinaturas');
    await page.fill('#sub-next-charge', formatDDMM(future));
    await page.selectOption('#sub-payment', 'credito');
    await page.selectOption('#sub-card', { label: 'Nubank' });
    await page.click('button:has-text("Adicionar Assinatura")');

    await page.click('button.nav-btn:has-text("Movimentações")');
    await page.selectOption('#month-select', String(today.getMonth()));
    await page.selectOption('#year-select', String(today.getFullYear()));
    await expect(page.locator('#trans-list tr', { hasText: 'Netflix' })).toHaveCount(0);

    await page.selectOption('#month-select', String(future.getMonth()));
    await page.selectOption('#year-select', String(future.getFullYear()));
    const row = page.locator('#trans-list tr', { hasText: 'Netflix' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('pendente');
    await expect(row).toContainText('Crédito (Nubank)');
  });

  test('assinatura já cobrada neste mês aparece como paga no mês atual', async ({ page }) => {
    const today = new Date();

    await page.click('button.nav-btn:has-text("Assinaturas")');
    await page.fill('#sub-name', 'Spotify');
    await page.fill('#sub-value', '21.90');
    await page.selectOption('#sub-frequency', 'mensal');
    await page.selectOption('#sub-category', 'assinaturas');
    await page.fill('#sub-next-charge', formatDDMM(today));
    await page.selectOption('#sub-payment', 'debito');
    await page.click('button:has-text("Adicionar Assinatura")');

    await page.click('button.nav-btn:has-text("Movimentações")');
    await page.selectOption('#month-select', String(today.getMonth()));
    await page.selectOption('#year-select', String(today.getFullYear()));
    const row = page.locator('#trans-list tr', { hasText: 'Spotify' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('pago');
  });

  test('assinatura anual com data já passada rola para o próximo ano, não para o próximo mês', async ({ page }) => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 5); // guaranteed already-passed date this year

    await page.click('button.nav-btn:has-text("Assinaturas")');
    await page.fill('#sub-name', 'Amazon Prime Anual');
    await page.fill('#sub-value', '14.90');
    await page.selectOption('#sub-frequency', 'anual');
    await page.selectOption('#sub-category', 'assinaturas');
    await page.fill('#sub-next-charge', formatDDMM(past));
    await page.selectOption('#sub-payment', 'debito');
    await page.click('button:has-text("Adicionar Assinatura")');

    await page.click('button.nav-btn:has-text("Movimentações")');
    await page.selectOption('#month-select', String(past.getMonth()));
    await page.selectOption('#year-select', String(past.getFullYear()));
    await expect(page.locator('#trans-list tr', { hasText: 'Amazon Prime' })).toHaveCount(0);

    await page.selectOption('#month-select', String(past.getMonth()));
    await page.selectOption('#year-select', String(past.getFullYear() + 1));
    await expect(page.locator('#trans-list tr', { hasText: 'Amazon Prime' })).toHaveCount(1);
  });
});

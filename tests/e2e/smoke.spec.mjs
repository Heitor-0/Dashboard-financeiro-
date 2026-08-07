import { test, expect } from '@playwright/test';

test.describe('App loads cleanly', () => {
  test('no 404s and no console errors on first load', async ({ page }) => {
    const consoleErrors = [];
    const notFound = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('response', (res) => { if (res.status() === 404) notFound.push(res.url()); });

    await page.goto('/index.html');
    await page.waitForTimeout(300);

    expect(notFound).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('manifest.json is linked, fetchable and lists both icons', async ({ page }) => {
    await page.goto('/index.html');
    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const res = await fetch(link.href);
      return res.json();
    });
    expect(manifest.icons.map((i) => i.src)).toEqual(expect.arrayContaining(['icon-192.png', 'icon-512.png']));
  });

  test('service worker registers and activates', async ({ page }) => {
    await page.goto('/index.html');
    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return { active: !!reg.active };
    });
    expect(state.active).toBe(true);
  });

  test('default categories include Farmácia, PIX, Delivery and Uber/99', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('button.nav-btn:has-text("Movimentações")');
    const options = await page.locator('#trans-category option').allTextContents();
    const text = options.join(' | ');
    for (const label of ['Farmácia', 'PIX', 'Delivery', 'Uber/99']) {
      expect(text).toContain(label);
    }
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');

describe('PWA files referenced by index.html actually exist', () => {
  // Regression guard: index.html referenced manifest.json/icon-192.png/sw.js for a long
  // time before those files existed, causing 404s on every load. This test would have
  // caught that without needing a browser.
  for (const file of ['manifest.json', 'icon-192.png', 'icon-512.png', 'sw.js']) {
    test(`${file} exists at the repo root`, () => {
      assert.ok(fs.existsSync(path.join(REPO_ROOT, file)), `${file} is missing`);
    });
  }

  test('manifest.json is valid JSON and lists both icons', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifest.json'), 'utf-8'));
    const srcs = manifest.icons.map((i) => i.src);
    assert.ok(srcs.includes('icon-192.png'));
    assert.ok(srcs.includes('icon-512.png'));
  });
});

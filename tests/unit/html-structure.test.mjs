import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadIndexHtmlRaw } from '../helpers/load-app.mjs';

function countTag(html, tag) {
  const open = html.match(new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')) || [];
  const close = html.match(new RegExp(`</${tag}>`, 'gi')) || [];
  return { open: open.length, close: close.length };
}

describe('index.html structural sanity', () => {
  const html = loadIndexHtmlRaw();

  test('inline <script> has valid JavaScript syntax', () => {
    const match = html.match(/<script>([\s\S]*)<\/script>/);
    assert.ok(match, 'expected an inline <script> block');
    // Throws a SyntaxError if the script is malformed — that's the assertion.
    assert.doesNotThrow(() => new vm.Script(match[1]));
  });

  test('common block tags are balanced (open === close)', () => {
    for (const tag of ['div', 'form', 'table', 'select', 'button']) {
      const { open, close } = countTag(html, tag);
      assert.equal(open, close, `<${tag}> open (${open}) !== close (${close})`);
    }
  });

  test('references manifest.json, icon files and sw.js that must exist alongside index.html', () => {
    assert.match(html, /<link rel="manifest" href="manifest\.json">/);
    assert.match(html, /icon-192\.png/);
    assert.match(html, /register\('sw\.js'\)/);
  });
});

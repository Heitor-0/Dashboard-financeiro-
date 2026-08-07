import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = path.join(__dirname, '..', '..', 'index.html');

function extractScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error('Could not find <script> block in index.html');
  return match[1];
}

function makeStubElement() {
  const el = {
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() { return false; },
      contains() { return false; },
    },
    children: [],
    options: [],
    value: '',
    innerHTML: '',
    textContent: '',
    appendChild(child) { el.children.push(child); },
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    reset() {},
    scrollIntoView() {},
  };
  return el;
}

/**
 * Loads the inline <script> from index.html into a sandboxed vm context with
 * minimal DOM/localStorage stubs, so pure functions (parsers, calculations)
 * can be unit tested without a real browser or extra dependencies.
 *
 * Only suitable for functions that don't need real DOM query results
 * (e.g. parseImportCSV, parseImportValue, calculateCategorySpent-style helpers).
 * Full UI flows belong in tests/e2e instead.
 */
export function loadAppContext() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
  const script = extractScript(html);

  const localStorageStore = new Map();
  const localStorage = {
    getItem: (k) => (localStorageStore.has(k) ? localStorageStore.get(k) : null),
    setItem: (k, v) => localStorageStore.set(k, String(v)),
    removeItem: (k) => localStorageStore.delete(k),
    clear: () => localStorageStore.clear(),
  };

  const document = {
    addEventListener() {},
    getElementById() { return makeStubElement(); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return makeStubElement(); },
    documentElement: { setAttribute() {}, getAttribute() { return null; } },
  };

  const sandbox = {
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1 },
    navigator: {},
    document,
    localStorage,
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    parseFloat,
    parseInt,
    isNaN,
    RegExp,
  };

  vm.createContext(sandbox);
  vm.runInContext(script, sandbox, { filename: 'index.html-inline-script.js' });

  return sandbox;
}

export function loadIndexHtmlRaw() {
  return fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
}

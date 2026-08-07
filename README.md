# Dashboard-financeiro-

Dashboard financeiro pessoal: PWA de página única (`index.html`), sem backend — os dados ficam no `localStorage` do navegador.

## Testes

```bash
npm install
npm run test:unit   # node:test — parsers de importação, estrutura do HTML
npx playwright install --with-deps chromium   # só na primeira vez
npm run test:e2e    # Playwright — fluxos de ponta a ponta no navegador
npm test            # roda os dois
```

O CI (`.github/workflows/ci.yml`) roda essa mesma suíte em todo push/PR para `main`.

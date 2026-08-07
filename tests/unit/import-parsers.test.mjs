import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppContext } from '../helpers/load-app.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf-8');

describe('parseImportValue', () => {
  const { parseImportValue } = loadAppContext();

  test('parses simple decimal-comma values', () => {
    assert.equal(parseImportValue('72,00'), 72);
    assert.equal(parseImportValue('1.200,00'), 1200);
    assert.equal(parseImportValue('-52,80'), -52.8);
  });

  test('parses values with R$ prefix and parentheses-negative', () => {
    assert.equal(parseImportValue('R$ 45,50'), 45.5);
    assert.equal(parseImportValue('(45,50)'), -45.5);
  });

  test('rejects text that merely starts with digits (regression: bank counterparty names)', () => {
    // This is the exact real-world bug: a Pix key / merchant code embedded in a
    // name column ("53 171 192 Giovana De Lima E Silva") must NOT be read as R$ 53 million.
    assert.ok(Number.isNaN(parseImportValue('53 171 192 Giovana De Lima E Silva')));
    assert.ok(Number.isNaN(parseImportValue('59683214nathalia       Londrina      Bra')));
  });

  test('rejects empty or non-numeric input', () => {
    assert.ok(Number.isNaN(parseImportValue('')));
    assert.ok(Number.isNaN(parseImportValue('Mercado Livre')));
  });
});

describe('parseImportDate', () => {
  const { parseImportDate } = loadAppContext();

  test('parses DD/MM/YYYY', () => {
    const d = parseImportDate('31/03/2026');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 2);
    assert.equal(d.getDate(), 31);
  });

  test('parses ISO YYYY-MM-DD', () => {
    const d = parseImportDate('2026-08-05');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 7);
    assert.equal(d.getDate(), 5);
  });

  test('parses OFX-style YYYYMMDDHHMMSS', () => {
    const d = parseImportDate('20260801120000');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 7);
    assert.equal(d.getDate(), 1);
  });

  test('returns null for garbage input', () => {
    assert.equal(parseImportDate('not a date'), null);
  });
});

describe('parseImportCSV — real bank statement with preamble + wrong-column regression', () => {
  const { parseImportCSV, formatValue } = loadAppContext();

  test('parses all 32 transactions from a Banco Inter export with metadata lines before the header', () => {
    const rows = parseImportCSV(fixture('extrato-banco-inter.csv'));
    assert.equal(rows.length, 32);
  });

  test('reads the Valor column, not the Descrição column, for the two rows with digit-leading names', () => {
    const rows = parseImportCSV(fixture('extrato-banco-inter.csv'));

    const pixRow = rows.find((r) => r.description.includes('53 171 192'));
    assert.ok(pixRow, 'expected to find the "53 171 192 Giovana..." row');
    assert.equal(pixRow.value, -695);

    const debitoRow = rows.find((r) => r.description.includes('59683214'));
    assert.ok(debitoRow, 'expected to find the "59683214nathalia..." row');
    assert.equal(debitoRow.value, -72);
  });

  test('income and expense totals reconcile with a manual sum of the raw file', () => {
    const rows = parseImportCSV(fixture('extrato-banco-inter.csv'));
    const income = rows.filter((r) => r.value > 0).reduce((s, r) => s + r.value, 0);
    const expense = rows.filter((r) => r.value < 0).reduce((s, r) => s + Math.abs(r.value), 0);

    assert.equal(Math.round(income * 100), 530669); // R$ 5.306,69
    assert.equal(Math.round(expense * 100), 584684); // R$ 5.846,84
  });

  test('joins the remaining text columns (Histórico + Descrição) into the description, excluding Saldo', () => {
    const rows = parseImportCSV(fixture('extrato-banco-inter.csv'));
    const aplicacao = rows.find((r) => r.value === -250);
    assert.ok(aplicacao);
    assert.equal(aplicacao.description, 'Aplicação - Cdb Porq Obj Banco Inter Sa');
  });
});

describe('parseImportCSV — simple formats without metadata preamble', () => {
  const { parseImportCSV } = loadAppContext();

  test('Nubank-style CSV: comma delimiter, ISO dates, header row', () => {
    const csv = 'date,title,amount\n2026-08-03,Mercado Livre,-89.90\n2026-08-05,Salario,3500.00\n';
    const rows = parseImportCSV(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].value, -89.9);
    assert.equal(rows[1].value, 3500);
  });

  test('semicolon CSV with no recognizable header falls back to content sniffing', () => {
    const csv = '02/08/2026;Uber Viagem;-25,90\n04/08/2026;Farmacia Popular;-63,40\n';
    const rows = parseImportCSV(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].value, -25.9);
    assert.equal(rows[1].description, 'Farmacia Popular');
  });

  test('empty input returns an empty array instead of throwing', () => {
    // Arrays created inside the vm sandbox belong to a different realm, so compare
    // by length/emptiness rather than deepStrictEqual against a literal [].
    assert.equal(parseImportCSV('').length, 0);
    assert.equal(parseImportCSV('\n\n\n').length, 0);
  });
});

describe('parseImportOFX', () => {
  const { parseImportOFX } = loadAppContext();

  test('extracts STMTTRN blocks with DTPOSTED, TRNAMT and MEMO', () => {
    const ofx = `
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260801120000
<TRNAMT>-120.00
<MEMO>Supermercado Extra
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260802120000
<TRNAMT>2500.00
<MEMO>Pagamento Freelance
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;
    const rows = parseImportOFX(ofx);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].value, -120);
    assert.equal(rows[0].description, 'Supermercado Extra');
    assert.equal(rows[1].value, 2500);
  });
});

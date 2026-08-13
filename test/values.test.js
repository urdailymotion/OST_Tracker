'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode, plain } = require('./helpers/load-code');
const { row } = require('./helpers/fixtures');

const app = loadCode();
const COL = app.COL;

describe('number_', () => {
  it('keeps finite numbers and zeroes non finite ones', () => {
    assert.equal(app.number_(12.5), 12.5);
    assert.equal(app.number_(0), 0);
    assert.equal(app.number_(Infinity), 0);
    assert.equal(app.number_(NaN), 0);
  });

  it('strips thousand separators and currency noise from text', () => {
    assert.equal(app.number_('Rp 1.250'), 1.25);
    assert.equal(app.number_('1250'), 1250);
    assert.equal(app.number_('-42'), -42);
    assert.equal(app.number_('12,5'), 125);
  });

  it('returns 0 for blank or unparsable text', () => {
    assert.equal(app.number_(''), 0);
    assert.equal(app.number_(null), 0);
    assert.equal(app.number_(undefined), 0);
    assert.equal(app.number_('abc'), 0);
  });
});

describe('valueText_', () => {
  it('returns empty string for null-ish values', () => {
    assert.equal(app.valueText_(null), '');
    assert.equal(app.valueText_(undefined), '');
  });

  it('renders dates as yyyy-MM-dd and everything else as text', () => {
    assert.equal(app.valueText_(new Date(Date.UTC(2026, 0, 2, 4))), '2026-01-02');
    assert.equal(app.valueText_(7), '7');
    assert.equal(app.valueText_(false), 'false');
    assert.equal(app.valueText_('  teks  '), '  teks  ');
  });
});

describe('toBoolean_', () => {
  it('accepts the truthy spellings used in the sheet', () => {
    ['TRUE', 'true', '1', 'YA', 'ya'].forEach((value) => {
      assert.equal(app.toBoolean_(value), true, String(value));
    });
    assert.equal(app.toBoolean_(true), true);
  });

  it('rejects everything else', () => {
    ['FALSE', '0', '', 'TIDAK', null, undefined, 2].forEach((value) => {
      assert.equal(app.toBoolean_(value), false, String(value));
    });
  });
});

describe('row/header utilities', () => {
  it('indexMap_ maps header text to column index', () => {
    assert.deepEqual(plain(app.indexMap_(['A', 'B', 'C'])), { A: 0, B: 1, C: 2 });
  });

  it('objectFromRow_ zips headers with values', () => {
    assert.deepEqual(plain(app.objectFromRow_(['A', 'B'], [1, 2])), { A: 1, B: 2 });
    assert.deepEqual(plain(app.objectFromRow_(['A', 'B'], [1])), { A: 1, B: undefined });
  });

  it('uniqueSorted_ drops blanks and sorts the remaining values', () => {
    assert.deepEqual(plain(app.uniqueSorted_(['b', 'a', 'b', '', null, undefined, 'c'])), ['a', 'b', 'c']);
    assert.deepEqual(plain(app.uniqueSorted_([])), []);
  });

  it('objectEntriesSorted_ returns label/value pairs ordered by value desc', () => {
    assert.deepEqual(plain(app.objectEntriesSorted_({ a: 1, b: 5, c: 3 })), [
      { label: 'b', value: 5 },
      { label: 'c', value: 3 },
      { label: 'a', value: 1 }
    ]);
  });
});

describe('summarizeValues_', () => {
  it('uses the fallback when there is nothing to summarise', () => {
    assert.equal(app.summarizeValues_([], 'KOSONG'), 'KOSONG');
    assert.equal(app.summarizeValues_([]), '');
  });

  it('returns the single value untouched', () => {
    assert.equal(app.summarizeValues_(['PCS'], '-'), 'PCS');
  });

  it('summarises multiple values and truncates after three', () => {
    assert.equal(app.summarizeValues_(['A', 'B'], '-'), 'MULTIPLE (2): A, B');
    assert.equal(app.summarizeValues_(['A', 'B', 'C', 'D'], '-'), 'MULTIPLE (4): A, B, C, ...');
  });
});

describe('uniqueTextValues_', () => {
  it('collects distinct trimmed values sorted alphabetically', () => {
    const children = [row({ [COL.SLOC]: ' A ' }), row({ [COL.SLOC]: 'B' }), row({ [COL.SLOC]: 'A' }), row({ [COL.SLOC]: '' })];
    assert.deepEqual(plain(app.uniqueTextValues_(children, COL.SLOC)), ['A', 'B']);
  });

  it('normalises ETD values through etdText_', () => {
    const children = [row({ [COL.ETD]: new Date(Date.UTC(2026, 7, 20, 16)) }), row({ [COL.ETD]: '2026-08-21' })];
    assert.deepEqual(plain(app.uniqueTextValues_(children, COL.ETD)), ['21/08/2026']);
  });
});

describe('aggregation helpers', () => {
  const children = [
    row({ [COL.DOC_DATE]: '2026-01-10', [COL.QTY_OS]: '5', [COL.TARGET_SUPPLY]: '-' }),
    row({ [COL.DOC_DATE]: '2026-01-05', [COL.QTY_OS]: 12, [COL.TARGET_SUPPLY]: '2026-02-01' }),
    row({ [COL.DOC_DATE]: 'kosong', [COL.QTY_OS]: '', [COL.TARGET_SUPPLY]: '735' })
  ];

  it('minDateFromChildren_ picks the earliest parsable date', () => {
    assert.equal(app.toClientDate_(app.minDateFromChildren_(children, COL.DOC_DATE)), '2026-01-05');
  });

  it('maxDateFromChildren_ picks the latest parsable date', () => {
    assert.equal(app.toClientDate_(app.maxDateFromChildren_(children, COL.DOC_DATE)), '2026-01-10');
  });

  it('maxOperationalDateFromChildren_ skips placeholder dates', () => {
    assert.equal(app.toClientDate_(app.maxOperationalDateFromChildren_(children, COL.TARGET_SUPPLY)), '2026-02-01');
  });

  it('maxNumberFromChildren_ returns the largest numeric value', () => {
    assert.equal(app.maxNumberFromChildren_(children, COL.QTY_OS), 12);
  });

  it('returns empty string when no child has a usable date', () => {
    const blank = [row({ [COL.DOC_DATE]: '' })];
    assert.equal(app.minDateFromChildren_(blank, COL.DOC_DATE), '');
    assert.equal(app.maxDateFromChildren_(blank, COL.DOC_DATE), '');
    assert.equal(app.maxOperationalDateFromChildren_(blank, COL.DOC_DATE), '');
    assert.equal(app.maxNumberFromChildren_(blank, COL.QTY_OS), 0);
  });
});

describe('latestUpdatedChild_', () => {
  it('ignores children without any update trace', () => {
    assert.equal(app.latestUpdatedChild_([row({ [COL.ID]: 'A' })]), null);
  });

  it('returns the child with the newest LAST_UPDATE', () => {
    const older = row({ [COL.ID]: 'A', [COL.LAST_UPDATE]: new Date(2026, 0, 1) });
    const newer = row({ [COL.ID]: 'B', [COL.LAST_UPDATE]: new Date(2026, 0, 2) });
    assert.equal(app.latestUpdatedChild_([older, newer]).obj[COL.ID], 'B');
    assert.equal(app.latestUpdatedChild_([newer, older]).obj[COL.ID], 'B');
  });

  it('accepts legacy rows that only carry UPDATED_BY or REVISION', () => {
    assert.equal(app.latestUpdatedChild_([row({ [COL.ID]: 'A', [COL.UPDATED_BY]: 'vendor' })]).obj[COL.ID], 'A');
    assert.equal(app.latestUpdatedChild_([row({ [COL.ID]: 'B', [COL.REVISION]: 3 })]).obj[COL.ID], 'B');
  });
});

describe('row grouping helpers', () => {
  it('contiguousRowGroups_ merges consecutive rows and sorts input', () => {
    assert.deepEqual(plain(app.contiguousRowGroups_([5, 2, 3, 9])), [
      { start: 2, end: 3 },
      { start: 5, end: 5 },
      { start: 9, end: 9 }
    ]);
    assert.deepEqual(plain(app.contiguousRowGroups_([])), []);
    assert.deepEqual(plain(app.contiguousRowGroups_(null)), []);
  });

  it('repeatedRows_ clones the template row n times', () => {
    const template = ['a', 'b'];
    const rows = app.repeatedRows_(2, template);
    assert.deepEqual(plain(rows), [['a', 'b'], ['a', 'b']]);
    rows[0][0] = 'changed';
    assert.equal(template[0], 'a');
    assert.deepEqual(plain(app.repeatedRows_(0, template)), []);
    assert.deepEqual(plain(app.repeatedRows_(-3, template)), []);
  });
});

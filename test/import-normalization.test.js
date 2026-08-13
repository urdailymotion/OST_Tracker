'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode, plain } = require('./helpers/load-code');

const app = loadCode();
const COL = app.COL;

describe('normalizeHeader_', () => {
  it('upper-cases and removes spaces and separators', () => {
    assert.equal(app.normalizeHeader_(' part_number '), 'PARTNUMBER');
    assert.equal(app.normalizeHeader_('Order Quantity'), 'ORDERQUANTITY');
    assert.equal(app.normalizeHeader_('net-price'), 'NETPRICE');
    assert.equal(app.normalizeHeader_('net.value'), 'NETVALUE');
  });

  it('returns empty string for blank input', () => {
    assert.equal(app.normalizeHeader_(''), '');
    assert.equal(app.normalizeHeader_(null), '');
  });
});

describe('canonicalHeader_', () => {
  it('maps every canonical database header to itself', () => {
    app.CONFIG.DB_HEADERS.forEach((header) => {
      assert.equal(app.canonicalHeader_(header), header, header);
    });
  });

  it('maps known aliases to the canonical header', () => {
    const cases = {
      'AGING DAYS': COL.AGING,
      'PO FULL RELEASE DATE': COL.FULL_RELEASE_DATE,
      'Full Release Date': COL.FULL_RELEASE_DATE,
      'target supply date': COL.TARGET_SUPPLY,
      'Document Date': COL.DOC_DATE,
      'PART NO': COL.PART,
      'Short Text': COL.DESC,
      'ORDER QTY': COL.ORDER_QTY,
      'Qty Outstanding': COL.QTY_OS,
      'Net Price': COL.NET_PRICE,
      'net value': COL.NET_VALUE,
      'Source Stock': COL.SOURCE
    };
    Object.keys(cases).forEach((alias) => {
      assert.equal(app.canonicalHeader_(alias), cases[alias], alias);
    });
  });

  it('recognises the multiline ETD header and its indonesian description', () => {
    assert.equal(app.canonicalHeader_('KET/ETD\n (Estimasi Barang dikirim)'), COL.ETD);
    assert.equal(app.canonicalHeader_('KET/ETD'), COL.ETD);
    assert.equal(app.canonicalHeader_('Estimasi Barang Dikirim'), COL.ETD);
  });

  it('returns empty string for unknown or blank headers', () => {
    assert.equal(app.canonicalHeader_('KOLOM TIDAK DIKENAL'), '');
    assert.equal(app.canonicalHeader_(''), '');
  });
});

describe('normalizeImportValue_', () => {
  it('converts empty-ish values to empty string', () => {
    assert.equal(app.normalizeImportValue_(COL.PO, null), '');
    assert.equal(app.normalizeImportValue_(COL.PO, undefined), '');
  });

  it('converts excel serials to dates for date columns only', () => {
    const converted = app.normalizeImportValue_(COL.DOC_DATE, 45000);
    assert.ok(converted instanceof Date);
    assert.equal(app.normalizeImportValue_(COL.PO, 45000), 45000);
    assert.equal(app.normalizeImportValue_(COL.DOC_DATE, 10), 10);
  });

  it('normalises the ETD column to dd/MM/yyyy text', () => {
    assert.equal(app.normalizeImportValue_(COL.ETD, '2026-08-21'), '21/08/2026');
    assert.equal(app.normalizeImportValue_(COL.ETD, 'Menunggu kapal'), 'Menunggu kapal');
  });

  it('passes other values through unchanged', () => {
    assert.equal(app.normalizeImportValue_(COL.PART, 'PN-1'), 'PN-1');
    assert.equal(app.normalizeImportValue_(COL.QTY_OS, 5), 5);
  });
});

describe('parseVendor_', () => {
  it('splits a leading vendor code from the vendor name', () => {
    assert.deepEqual(plain(app.parseVendor_('100123 PT Maju Jaya')), { code: '100123', name: 'PT Maju Jaya' });
    assert.deepEqual(plain(app.parseVendor_('  100123   PT Maju  ')), { code: '100123', name: 'PT Maju' });
  });

  it('falls back to the code when no name follows', () => {
    assert.deepEqual(plain(app.parseVendor_('100123')), { code: '100123', name: '100123' });
  });

  it('uses the whole text for both fields when there is no leading code', () => {
    assert.deepEqual(plain(app.parseVendor_('PT Maju Jaya')), { code: 'PT Maju Jaya', name: 'PT Maju Jaya' });
  });

  it('returns empty fields for blank input', () => {
    assert.deepEqual(plain(app.parseVendor_('')), { code: '', name: '' });
    assert.deepEqual(plain(app.parseVendor_(null)), { code: '', name: '' });
  });
});

describe('recordKey_ and makeRecordId_', () => {
  const record = { [COL.PO]: ' 4500 ', [COL.ITEM]: '10', [COL.PART]: 'PN-1', [COL.VENDOR_CODE]: '100123' };

  it('recordKey_ trims and joins the identifying columns', () => {
    assert.equal(app.recordKey_(record), '4500|10|PN-1|100123');
    assert.equal(app.recordKey_({}), '|||');
  });

  it('makeRecordId_ is a stable 24 char hex id', () => {
    const id = app.makeRecordId_(record, 1);
    assert.match(id, /^[0-9A-F]{24}$/);
    assert.equal(id, app.makeRecordId_(record, 1));
  });

  it('makeRecordId_ separates duplicate occurrences and defaults to the first', () => {
    assert.notEqual(app.makeRecordId_(record, 1), app.makeRecordId_(record, 2));
    assert.equal(app.makeRecordId_(record), app.makeRecordId_(record, 1));
  });

  it('makeRecordId_ changes when any key column changes', () => {
    const other = Object.assign({}, record, { [COL.ITEM]: '20' });
    assert.notEqual(app.makeRecordId_(record, 1), app.makeRecordId_(other, 1));
  });
});

describe('makeParentPoId_', () => {
  it('prefixes the hash with PO- and is stable per PO/vendor pair', () => {
    const id = app.makeParentPoId_('4500', '100123', 'PT Maju');
    assert.match(id, /^PO-[0-9A-F]{20}$/);
    assert.equal(id, app.makeParentPoId_(' 4500 ', '100123', 'PT Lain'));
  });

  it('falls back to the upper-cased vendor name when the code is missing', () => {
    assert.equal(app.makeParentPoId_('4500', '', 'pt maju'), app.makeParentPoId_('4500', '', 'PT MAJU'));
    assert.notEqual(app.makeParentPoId_('4500', '', 'PT MAJU'), app.makeParentPoId_('4500', '100123', 'PT MAJU'));
  });

  it('separates different POs', () => {
    assert.notEqual(app.makeParentPoId_('4500', '1', 'v'), app.makeParentPoId_('4501', '1', 'v'));
  });
});

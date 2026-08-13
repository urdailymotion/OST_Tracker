'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode, plain } = require('./helpers/load-code');
const { ADMIN_SESSION, row, vendorSession } = require('./helpers/fixtures');

const app = loadCode();
const COL = app.COL;
const PCOL = app.PCOL;

const VENDOR = vendorSession('100123', 'PT Maju');

function daysFromToday(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function item(overrides) {
  return row(Object.assign({
    [COL.ID]: 'R1',
    [COL.PO]: '4500001',
    [COL.ITEM]: '10',
    [COL.PART]: 'PN-1',
    [COL.DESC]: 'BEARING',
    [COL.VENDOR]: '100123 PT Maju',
    [COL.VENDOR_CODE]: '100123',
    [COL.VENDOR_NAME]: 'PT Maju',
    [COL.RELEASE]: 'FULL RELEASE'
  }, overrides || {}));
}

function ids(rows) {
  return plain(rows.map(function (r) { return r.obj[COL.ID]; }));
}

describe('canAccessRow_ / canAccessParent_', () => {
  it('lets admins through and restricts vendors to their own code', () => {
    assert.equal(app.canAccessRow_(ADMIN_SESSION, {}), true);
    assert.equal(app.canAccessRow_(VENDOR, { [COL.VENDOR_CODE]: '100123' }), true);
    assert.equal(app.canAccessRow_(VENDOR, { [COL.VENDOR_CODE]: '100999' }), false);
    assert.equal(app.canAccessRow_(VENDOR, {}), false);

    assert.equal(app.canAccessParent_(ADMIN_SESSION, {}), true);
    assert.equal(app.canAccessParent_(VENDOR, { [PCOL.VENDOR_CODE]: '100123' }), true);
    assert.equal(app.canAccessParent_(VENDOR, { [PCOL.VENDOR_CODE]: '100999' }), false);
  });
});

describe('filterRows_', () => {
  it('returns every accessible row when no filter is given', () => {
    const rows = [item(), item({ [COL.ID]: 'R2', [COL.VENDOR_CODE]: '100999' })];
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION)), ['R1', 'R2']);
    assert.deepEqual(ids(app.filterRows_(rows, VENDOR, {})), ['R1']);
  });

  it('ignores the vendor filter for vendor sessions and honours it for admins', () => {
    const rows = [item(), item({ [COL.ID]: 'R2', [COL.VENDOR_CODE]: '100999' })];
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { vendor: '100999' })), ['R2']);
    assert.deepEqual(ids(app.filterRows_(rows, VENDOR, { vendor: '100999' })), ['R1']);
  });

  it('filters by status label and source stock', () => {
    const rows = [
      item({ [COL.ID]: 'R1', [COL.STATUS]: 'ON PROCESS', [COL.LAST_UPDATE]: new Date(), [COL.SOURCE]: 'LOCAL' }),
      item({ [COL.ID]: 'R2', [COL.STATUS]: 'ON PROCESS', [COL.SOURCE]: 'IMPORT' })
    ];
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { status: 'ON PROCESS' })), ['R1']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { status: 'Need Update' })), ['R2']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { source: 'IMPORT' })), ['R2']);
  });

  it('filters by document date range and drops rows without a document date', () => {
    const rows = [
      item({ [COL.ID]: 'R1', [COL.DOC_DATE]: new Date(2026, 0, 10) }),
      item({ [COL.ID]: 'R2', [COL.DOC_DATE]: new Date(2026, 1, 20) }),
      item({ [COL.ID]: 'R3' })
    ];
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { dateFrom: '2026-01-15' })), ['R2']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { dateTo: '2026-01-15' })), ['R1']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { dateFrom: '2026-01-01', dateTo: '2026-03-01' })), ['R1', 'R2']);
  });

  it('searches across po, item, part, description, vendor, etd and status', () => {
    const rows = [
      item({ [COL.ID]: 'R1', [COL.DESC]: 'BEARING SKF' }),
      item({ [COL.ID]: 'R2', [COL.DESC]: 'SEAL', [COL.STATUS]: 'DELIVERED' })
    ];
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { search: 'bearing' })), ['R1']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { search: ' DELIVERED ' })), ['R2']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { search: '4500001' })), ['R1', 'R2']);
    assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { search: 'tidak ada' })), []);
  });

  describe('etaState', () => {
    it('only considers released rows', () => {
      const rows = [item({ [COL.ID]: 'R1', [COL.RELEASE]: 'NOT YET RELEASE' })];
      assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { etaState: 'NO_ETA' })), []);
    });

    it('splits PENDING_UPDATE and UPDATED by the last update stamp', () => {
      const rows = [
        item({ [COL.ID]: 'R1' }),
        item({ [COL.ID]: 'R2', [COL.LAST_UPDATE]: new Date() })
      ];
      assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { etaState: 'PENDING_UPDATE' })), ['R1']);
      assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { etaState: 'UPDATED' })), ['R2']);
    });

    it('keeps only rows without a parsable ETA for NO_ETA', () => {
      const rows = [
        item({ [COL.ID]: 'R1' }),
        item({ [COL.ID]: 'R2', [COL.ETA]: 'menunggu vendor' }),
        item({ [COL.ID]: 'R3', [COL.ETA]: daysFromToday(3) })
      ];
      assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { etaState: 'NO_ETA' })), ['R1', 'R2']);
    });

    it('treats past ETA as overdue unless the row is already delivered', () => {
      const rows = [
        item({ [COL.ID]: 'R1', [COL.ETA]: daysFromToday(-2) }),
        item({ [COL.ID]: 'R2', [COL.ETA]: daysFromToday(-2), [COL.STATUS]: 'DELIVERED', [COL.LAST_UPDATE]: new Date() }),
        item({ [COL.ID]: 'R3', [COL.ETA]: daysFromToday(0) }),
        item({ [COL.ID]: 'R4' })
      ];
      assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { etaState: 'OVERDUE' })), ['R1']);
    });

    it('keeps ETA within the next seven days for NEXT_7_DAYS', () => {
      const rows = [
        item({ [COL.ID]: 'R1', [COL.ETA]: daysFromToday(0) }),
        item({ [COL.ID]: 'R2', [COL.ETA]: daysFromToday(7) }),
        item({ [COL.ID]: 'R3', [COL.ETA]: daysFromToday(8) }),
        item({ [COL.ID]: 'R4', [COL.ETA]: daysFromToday(-1) }),
        item({ [COL.ID]: 'R5' }),
        item({ [COL.ID]: 'R6', [COL.ETA]: daysFromToday(2), [COL.STATUS]: 'DELIVERED', [COL.LAST_UPDATE]: new Date() })
      ];
      assert.deepEqual(ids(app.filterRows_(rows, ADMIN_SESSION, { etaState: 'NEXT_7_DAYS' })), ['R1', 'R2']);
    });
  });
});

describe('compareRows_', () => {
  const a = {
    [COL.PO]: '4500001', [COL.VENDOR_NAME]: 'A Vendor', [COL.ETA]: new Date(2026, 0, 1),
    [COL.NET_VALUE]: 100, [COL.DOC_DATE]: new Date(2026, 0, 1), [COL.LAST_UPDATE]: new Date(2026, 0, 1)
  };
  const b = {
    [COL.PO]: '4500002', [COL.VENDOR_NAME]: 'B Vendor', [COL.ETA]: new Date(2026, 0, 2),
    [COL.NET_VALUE]: 200, [COL.DOC_DATE]: new Date(2026, 0, 2), [COL.LAST_UPDATE]: new Date(2026, 0, 2)
  };

  it('orders ascending for every supported key', () => {
    ['PO', 'VENDOR', 'ETA', 'VALUE', 'DOCUMENT_DATE', 'LAST_UPDATE'].forEach(function (key) {
      assert.ok(app.compareRows_(a, b, key) < 0, key);
      assert.ok(app.compareRows_(b, a, key) > 0, key);
      assert.equal(app.compareRows_(a, a, key), 0, key);
    });
  });

  it('falls back to last update for unknown keys and treats blanks as zero', () => {
    assert.ok(app.compareRows_(a, b, 'UNKNOWN') < 0);
    assert.equal(app.compareRows_({}, {}, 'PO'), 0);
    assert.equal(app.compareRows_({}, {}, 'VALUE'), 0);
  });
});

describe('compareParentRows_', () => {
  const a = {
    [PCOL.PO]: '4500001', [PCOL.VENDOR_NAME]: 'A Vendor', [PCOL.AGING]: 1, [PCOL.TARGET_SUPPLY]: new Date(2026, 0, 1),
    [PCOL.ETA]: new Date(2026, 0, 1), [PCOL.NET_VALUE]: 100, [PCOL.DOC_DATE]: new Date(2026, 0, 1),
    [PCOL.LAST_UPDATE]: new Date(2026, 0, 1)
  };
  const b = {
    [PCOL.PO]: '4500002', [PCOL.VENDOR_NAME]: 'B Vendor', [PCOL.AGING]: 2, [PCOL.TARGET_SUPPLY]: new Date(2026, 0, 2),
    [PCOL.ETA]: new Date(2026, 0, 2), [PCOL.NET_VALUE]: 200, [PCOL.DOC_DATE]: new Date(2026, 0, 2),
    [PCOL.LAST_UPDATE]: new Date(2026, 0, 2)
  };

  it('orders ascending for every supported key and defaults to last update', () => {
    ['PO', 'VENDOR', 'AGING', 'TARGET_SUPPLY', 'ETA', 'VALUE', 'DOCUMENT_DATE', 'LAST_UPDATE', 'UNKNOWN'].forEach(function (key) {
      assert.ok(app.compareParentRows_(a, b, key) < 0, key);
      assert.ok(app.compareParentRows_(b, a, key) > 0, key);
    });
  });
});

describe('rowToClient_', () => {
  it('maps a database row to the client shape', () => {
    const client = app.rowToClient_(item({
      [COL.AGING]: '12',
      [COL.DOC_DATE]: new Date(Date.UTC(2026, 0, 10, 4)),
      [COL.ORDER_QTY]: '5',
      [COL.QTY_OS]: 2,
      [COL.NET_PRICE]: '1500.5',
      [COL.NET_VALUE]: 3001,
      [COL.ETA]: new Date(Date.UTC(2026, 4, 5, 4)),
      [COL.ETD]: '21/08/2026',
      [COL.STATUS]: 'ON PROCESS',
      [COL.LAST_UPDATE]: new Date(Date.UTC(2026, 4, 5, 4, 30)),
      [COL.UPDATED_BY]: 'pt.maju',
      [COL.UPDATED_ROLE]: 'VENDOR',
      [COL.REVISION]: '3'
    }, 7));

    assert.equal(client.rowNumber, 2);
    assert.equal(client.recordId, 'R1');
    assert.equal(client.aging, 12);
    assert.equal(client.documentDate, '2026-01-10');
    assert.equal(client.netPrice, 1500.5);
    assert.equal(client.eta, '2026-05-05');
    assert.equal(client.etd, '21/08/2026');
    assert.equal(client.statusLabel, 'ON PROCESS');
    assert.equal(client.lastUpdate, '2026-05-05T12:30:00');
    assert.equal(client.revision, 3);
  });

  it('keeps free-text ETA and empties missing fields', () => {
    const client = app.rowToClient_(row({ [COL.ETA]: 'menunggu vendor' }));
    assert.equal(client.eta, 'menunggu vendor');
    assert.equal(client.recordId, '');
    assert.equal(client.aging, 0);
    assert.equal(client.documentDate, '');
    assert.equal(client.statusLabel, 'Need Update');
  });
});

describe('parentRowToClient_', () => {
  it('maps a parent row including derived release and status labels', () => {
    const client = app.parentRowToClient_(row({
      [PCOL.ID]: 'P1',
      [PCOL.PO]: '4500001',
      [PCOL.VENDOR_CODE]: '100123',
      [PCOL.VENDOR_NAME]: 'PT Maju',
      [PCOL.ITEM_COUNT]: '4',
      [PCOL.RELEASE]: 'FULL RELEASE',
      [PCOL.STATUS]: 'ON PROCESS',
      [PCOL.LAST_UPDATE]: new Date(Date.UTC(2026, 4, 5, 4)),
      [PCOL.REVISION]: 2,
      [PCOL.ETA]: 'menunggu vendor'
    }, 5));

    assert.equal(client.recordId, 'P1');
    assert.equal(client.parentId, 'P1');
    assert.equal(client.itemCount, 4);
    assert.equal(client.releaseState, 'RELEASE');
    assert.equal(client.statusLabel, 'ON PROCESS');
    assert.equal(client.eta, 'menunggu vendor');
    assert.equal(client.rowNumber, 5);
  });

  it('marks parents without any update trace as needing an update', () => {
    const client = app.parentRowToClient_(row({ [PCOL.STATUS]: 'ON PROCESS' }));
    assert.equal(client.statusLabel, 'Need Update');
    assert.equal(client.releaseState, 'NOT_RELEASE');
    assert.equal(client.revision, 0);
  });
});

describe('groupChildrenByParent_', () => {
  it('groups by parent id and sorts children numerically by item', () => {
    const map = app.groupChildrenByParent_([
      item({ [COL.ID]: 'R1', [COL.ITEM]: '20', [COL.PARENT_ID]: 'P1' }),
      item({ [COL.ID]: 'R2', [COL.ITEM]: '3', [COL.PARENT_ID]: 'P1' }),
      item({ [COL.ID]: 'R3', [COL.ITEM]: '10', [COL.PARENT_ID]: 'P2' })
    ]);
    assert.deepEqual(plain(Object.keys(map)), ['P1', 'P2']);
    assert.deepEqual(ids(map.P1), ['R2', 'R1']);
    assert.deepEqual(ids(map.P2), ['R3']);
  });

  it('derives the parent id from po and vendor when the link is missing', () => {
    const rows = [item({ [COL.ID]: 'R1' }), item({ [COL.ID]: 'R2', [COL.ITEM]: '20' })];
    const map = app.groupChildrenByParent_(rows);
    const expectedId = app.makeParentPoId_('4500001', '100123', 'PT Maju');
    assert.deepEqual(plain(Object.keys(map)), [expectedId]);
    assert.deepEqual(ids(map[expectedId]), ['R1', 'R2']);
  });
});

'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode, plain } = require('./helpers/load-code');
const { loadWithSheets } = require('./helpers/fixtures');

const base = loadCode();
const COL = base.COL;
const PCOL = base.PCOL;

const ADMIN_USER = {
  USER_ID: 'u-admin', USERNAME: 'admin', PASSWORD_HASH: 'Admin@1234', ROLE: 'ADMIN',
  VENDOR_CODE: '', VENDOR_NAME: '', ACTIVE: true, MUST_CHANGE: false, LAST_LOGIN: '', UPDATED_AT: ''
};

const VENDOR_USER = {
  USER_ID: 'u-vendor', USERNAME: 'pt.maju', PASSWORD_HASH: 'Maju@0123', ROLE: 'VENDOR',
  VENDOR_CODE: '100123', VENDOR_NAME: 'PT Maju Jaya', ACTIVE: true, MUST_CHANGE: false,
  LAST_LOGIN: '', UPDATED_AT: ''
};

function daysFromToday(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/** One line item of the OUTSTANDING sheet. */
function line(overrides) {
  return Object.assign({
    [COL.PO]: '4500001',
    [COL.ITEM]: '10',
    [COL.PART]: 'PN-1',
    [COL.DESC]: 'BEARING',
    [COL.WO]: 'WO-1',
    [COL.RELEASE]: 'FULL RELEASE',
    [COL.VENDOR]: '100123 PT Maju Jaya',
    [COL.VENDOR_CODE]: '100123',
    [COL.VENDOR_NAME]: 'PT Maju Jaya',
    [COL.UNIT]: 'PC',
    [COL.SLOC]: 'S1',
    [COL.REQUISITIONER]: 'REQ-1',
    [COL.ORDER_QTY]: 2,
    [COL.QTY_OS]: 2,
    [COL.NET_VALUE]: 1000,
    [COL.DOC_DATE]: new Date(2026, 0, 10),
    [COL.ID]: 'R1',
    [COL.PARENT_ID]: base.makeParentPoId_('4500001', '100123', 'PT Maju Jaya')
  }, overrides || {});
}

const MAJU_PARENT_ID = base.makeParentPoId_('4500001', '100123', 'PT Maju Jaya');

/** Builds the app with line items, then lets Code.gs derive the parent sheet itself. */
function setup(lines) {
  const app = loadWithSheets({
    db: lines || [line()],
    parent: [],
    users: [ADMIN_USER, VENDOR_USER],
    history: [],
    notifications: []
  });
  return {
    app: app,
    adminToken: app.createSession_({ userId: 'u-admin', username: 'admin', role: 'ADMIN' }),
    vendorToken: app.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR', vendorCode: '100123' }),
    sheet: function (name) { return app.__mocks.spreadsheet.getSheetByName(name); }
  };
}

describe('syncOutstandingParents_', () => {
  it('summarises line items into one parent row per PO and links the children', () => {
    const ctx = setup([
      line(),
      line({ [COL.ID]: 'R2', [COL.ITEM]: '20', [COL.PART]: 'PN-2', [COL.WO]: 'WO-2', [COL.NET_VALUE]: 500, [COL.QTY_OS]: 1 }),
      line({
        [COL.ID]: 'R3', [COL.PO]: '4500999', [COL.VENDOR]: '100999 CV Sinar', [COL.VENDOR_CODE]: '100999',
        [COL.VENDOR_NAME]: 'CV Sinar', [COL.PARENT_ID]: ''
      })
    ]);
    const result = ctx.app.syncOutstandingParents_({ preserveUpdates: true });
    assert.equal(result.parentCount, 2);
    assert.equal(result.childCount, 3);

    const parents = ctx.app.readParentDb_().rows;
    const maju = parents.find(function (r) { return r.obj[PCOL.PO] === '4500001'; }).obj;
    assert.equal(maju[PCOL.ITEM_COUNT], 2);
    assert.equal(maju[PCOL.WO_COUNT], 2);
    assert.equal(maju[PCOL.PART_COUNT], 2);
    assert.equal(maju[PCOL.NET_VALUE], 1500);
    assert.equal(maju[PCOL.QTY_OS], 3);
    assert.equal(maju[PCOL.RELEASE_STATE], 'RELEASE');
    assert.equal(maju[PCOL.CHILD_IDS], 'R1,R2');
    assert.equal(maju[PCOL.REVISION], 0);
    assert.ok(maju[PCOL.SEARCH].indexOf('pn-2') >= 0);

    const db = ctx.app.readDb_();
    assert.equal(db.rows[2].obj[COL.PARENT_ID], base.makeParentPoId_('4500999', '100999', 'CV Sinar'));
  });

  it('lifts the vendor update of a child onto the parent', () => {
    const ctx = setup([
      line({ [COL.ETA]: new Date(2026, 4, 5), [COL.STATUS]: 'ON PROCESS', [COL.SOURCE]: 'LOCAL',
        [COL.LAST_UPDATE]: new Date(2026, 4, 5, 10), [COL.UPDATED_BY]: 'pt.maju', [COL.UPDATED_ROLE]: 'VENDOR', [COL.REVISION]: 2 }),
      line({ [COL.ID]: 'R2', [COL.ITEM]: '20' })
    ]);
    ctx.app.syncOutstandingParents_();
    const parent = ctx.app.readParentDb_().rows[0].obj;
    assert.equal(parent[PCOL.STATUS], 'ON PROCESS');
    assert.equal(parent[PCOL.UPDATED_BY], 'pt.maju');
    assert.equal(parent[PCOL.REVISION], 2);
  });

  it('keeps a parent only update when preserving and rebuilds from the children otherwise', () => {
    const ctx = setup();
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, status: 'ON PROCESS', note: 'catatan' });
    const parentSheet = ctx.sheet('OUTSTANDING_PO');
    const parentIdx = ctx.app.indexMap_(parentSheet.getRange(1, 1, 1, parentSheet.getLastColumn()).getValues()[0]);
    parentSheet.getRange(2, parentIdx[PCOL.NOTE] + 1).setValue('hanya di parent');

    ctx.app.syncOutstandingParents_({ preserveUpdates: true });
    assert.equal(ctx.app.readParentDb_().rows[0].obj[PCOL.NOTE], 'hanya di parent');

    ctx.app.syncOutstandingParents_({ preserveUpdates: false });
    assert.equal(ctx.app.readParentDb_().rows[0].obj[PCOL.NOTE], 'catatan');
  });
});

describe('ensureParentData_', () => {
  it('rebuilds the parent sheet on the first call and then serves from cache', () => {
    const ctx = setup();
    ctx.app.ensureParentData_();
    assert.equal(ctx.app.readParentDb_().rows.length, 1);
    assert.equal(ctx.app.__mocks.scriptCache.get(ctx.app.CONFIG.PARENT_CACHE_KEY), '1');

    ctx.sheet('OUTSTANDING_PO').deleteRow(2);
    ctx.app.ensureParentData_();
    assert.equal(ctx.app.readParentDb_().rows.length, 0);
  });

  it('rebuilds when the parent sheet no longer matches the line items', () => {
    const ctx = setup();
    ctx.app.ensureParentData_();
    ctx.app.__mocks.scriptCache.remove(ctx.app.CONFIG.PARENT_CACHE_KEY);
    ctx.sheet('OUTSTANDING_PO').deleteRow(2);
    ctx.app.ensureParentData_();
    assert.equal(ctx.app.readParentDb_().rows.length, 1);
  });
});

describe('getBootstrap', () => {
  it('returns the session plus filter options the user may see', () => {
    const ctx = setup([
      line({ [COL.SOURCE]: 'LOCAL' }),
      line({ [COL.ID]: 'R2', [COL.PO]: '4500999', [COL.VENDOR_CODE]: '100999', [COL.VENDOR_NAME]: 'CV Sinar', [COL.SOURCE]: 'IMPORT' })
    ]);
    const admin = ctx.app.getBootstrap(ctx.adminToken);
    assert.deepEqual(plain(admin.filters.vendors), [
      { code: '100123', name: 'PT Maju Jaya' },
      { code: '100999', name: 'CV Sinar' }
    ]);
    assert.deepEqual(plain(admin.filters.sources), ['IMPORT', 'LOCAL']);
    assert.deepEqual(plain(admin.filters.statuses), ['Need Update']);
    assert.ok(admin.statusOptions.indexOf('DELIVERED SITE') >= 0);

    const vendor = ctx.app.getBootstrap(ctx.vendorToken);
    assert.deepEqual(plain(vendor.filters.vendors), [{ code: '100123', name: 'PT Maju Jaya' }]);
    assert.deepEqual(plain(vendor.filters.sources), ['LOCAL']);
  });
});

describe('getDashboard', () => {
  it('aggregates cards, charts and the latest updates', () => {
    const ctx = setup([
      line({ [COL.ETA]: daysFromToday(-3), [COL.STATUS]: 'ON PROCESS', [COL.LAST_UPDATE]: new Date(2026, 0, 2), [COL.SOURCE]: 'LOCAL' }),
      line({ [COL.ID]: 'R2', [COL.ITEM]: '20', [COL.ETA]: daysFromToday(3), [COL.STATUS]: 'ON PROCESS', [COL.LAST_UPDATE]: new Date(2026, 0, 3) }),
      line({ [COL.ID]: 'R3', [COL.ITEM]: '30', [COL.ETA]: daysFromToday(10) }),
      line({ [COL.ID]: 'R4', [COL.ITEM]: '40', [COL.ETA]: daysFromToday(20) }),
      line({ [COL.ID]: 'R5', [COL.ITEM]: '50', [COL.ETA]: daysFromToday(40) }),
      line({ [COL.ID]: 'R6', [COL.ITEM]: '60' }),
      line({ [COL.ID]: 'R7', [COL.ITEM]: '70', [COL.RELEASE]: 'NOT YET RELEASE' }),
      line({ [COL.ID]: 'R8', [COL.ITEM]: '80', [COL.ETA]: daysFromToday(-1), [COL.STATUS]: 'DELIVERED SITE', [COL.LAST_UPDATE]: new Date(2026, 0, 4) })
    ]);
    const dash = ctx.app.getDashboard(ctx.adminToken, {});
    assert.equal(dash.cards.totalLines, 8);
    assert.equal(dash.cards.totalPO, 1);
    assert.equal(dash.cards.totalVendors, 1);
    assert.equal(dash.cards.releasedLines, 7);
    assert.equal(dash.cards.notReleasedLines, 1);
    assert.equal(dash.cards.updated, 3);
    assert.equal(dash.cards.pendingUpdate, 4);
    assert.equal(dash.cards.overdue, 1);
    assert.equal(dash.cards.arriving7, 1);
    assert.equal(dash.cards.delivered, 1);
    assert.equal(dash.cards.totalValue, 8000);
    assert.equal(dash.cards.releaseRate, 87.5);

    const buckets = {};
    dash.charts.etaBucket.forEach(function (b) { buckets[b.label] = b.value; });
    assert.deepEqual(plain(buckets), {
      'Terlambat': 2, '0-7 Hari': 1, '8-14 Hari': 1, '15-30 Hari': 1, '>30 Hari': 1, 'Belum Ada ETA': 1
    });
    assert.deepEqual(plain(dash.charts.release), [
      { label: 'Release', value: 7 }, { label: 'Belum Release', value: 1 }
    ]);
    assert.deepEqual(plain(dash.charts.monthly), [{ label: '2026-01', value: 8000 }]);
    assert.deepEqual(plain(dash.latestUpdates.map(function (r) { return r.recordId; })), ['R8', 'R2', 'R1']);
  });

  it('honours the filters and reports zero rates for an empty result', () => {
    const ctx = setup();
    const dash = ctx.app.getDashboard(ctx.adminToken, { search: 'tidak ada' });
    assert.equal(dash.cards.totalLines, 0);
    assert.equal(dash.cards.releaseRate, 0);
    assert.equal(dash.cards.responseRate, 0);
    assert.deepEqual(plain(dash.latestUpdates), []);
  });
});

describe('getOutstanding', () => {
  it('returns parent rows for the vendor of the session', () => {
    const ctx = setup([
      line(),
      line({ [COL.ID]: 'R2', [COL.PO]: '4500999', [COL.VENDOR_CODE]: '100999', [COL.VENDOR_NAME]: 'CV Sinar', [COL.PARENT_ID]: '' })
    ]);
    const admin = ctx.app.getOutstanding(ctx.adminToken, {});
    assert.equal(admin.total, 2);
    assert.equal(admin.dataType, 'PARENT_PO');

    const vendor = ctx.app.getOutstanding(ctx.vendorToken, {});
    assert.equal(vendor.total, 1);
    assert.equal(vendor.rows[0].vendorCode, '100123');
  });

  it('filters by vendor, release state, search and eta state', () => {
    const ctx = setup([
      line({ [COL.ETA]: daysFromToday(3), [COL.STATUS]: 'ON PROCESS', [COL.SOURCE]: 'LOCAL',
        [COL.LAST_UPDATE]: new Date(2026, 0, 2), [COL.UPDATED_BY]: 'pt.maju', [COL.REVISION]: 1 }),
      line({ [COL.ID]: 'R2', [COL.PO]: '4500999', [COL.PART]: 'PN-9', [COL.VENDOR_CODE]: '100999', [COL.VENDOR_NAME]: 'CV Sinar',
        [COL.RELEASE]: 'NOT YET RELEASE', [COL.PARENT_ID]: '' })
    ]);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { vendor: '100999' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { releaseState: 'NOT_RELEASE' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { status: 'ON PROCESS' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { source: 'LOCAL' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { search: 'pn-1' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { search: 'tidak ada' } }).total, 0);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { etaState: 'UPDATED' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { etaState: 'PENDING_UPDATE' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { etaState: 'NO_ETA' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { etaState: 'NEXT_7_DAYS' } }).total, 1);
    assert.equal(ctx.app.getOutstanding(ctx.adminToken, { filters: { etaState: 'OVERDUE' } }).total, 0);
  });

  it('sorts and paginates the parent rows', () => {
    const ctx = setup([
      line(),
      line({ [COL.ID]: 'R2', [COL.PO]: '4500999', [COL.PARENT_ID]: '' }),
      line({ [COL.ID]: 'R3', [COL.PO]: '4500555', [COL.PARENT_ID]: '' })
    ]);
    const asc = ctx.app.getOutstanding(ctx.adminToken, { sortKey: 'PO', sortDir: 'asc' });
    assert.deepEqual(plain(asc.rows.map(function (r) { return r.po; })), ['4500001', '4500555', '4500999']);

    const desc = ctx.app.getOutstanding(ctx.adminToken, { sortKey: 'PO', sortDir: 'desc' });
    assert.equal(desc.rows[0].po, '4500999');

    const paged = ctx.app.getOutstanding(ctx.adminToken, { sortKey: 'PO', sortDir: 'asc', pageSize: 10, page: 2 });
    assert.equal(paged.totalPages, 1);
    assert.equal(paged.page, 1);
    assert.equal(paged.pageSize, 10);
  });
});

describe('getRecordDetail', () => {
  it('returns the parent with its children', () => {
    const ctx = setup([line(), line({ [COL.ID]: 'R2', [COL.ITEM]: '20' })]);
    const detail = ctx.app.getRecordDetail(ctx.vendorToken, MAJU_PARENT_ID);
    assert.equal(detail.po, '4500001');
    assert.equal(detail.itemCount, 2);
    assert.deepEqual(plain(detail.children.map(function (c) { return c.recordId; })), ['R1', 'R2']);
  });

  it('resolves a line item record id back to its parent', () => {
    const ctx = setup();
    assert.equal(ctx.app.getRecordDetail(ctx.adminToken, 'R1').parentId, MAJU_PARENT_ID);
  });

  it('rejects unknown ids and other vendors', () => {
    const ctx = setup([line({ [COL.VENDOR_CODE]: '100999', [COL.VENDOR_NAME]: 'CV Sinar', [COL.PARENT_ID]: '' })]);
    assert.throws(() => ctx.app.getRecordDetail(ctx.adminToken, 'TIDAK-ADA'), /Data PO tidak ditemukan/);
    const parentId = base.makeParentPoId_('4500001', '100999', 'CV Sinar');
    assert.throws(() => ctx.app.getRecordDetail(ctx.vendorToken, parentId), /tidak memiliki akses/);
  });
});

describe('updateVendorRecord', () => {
  it('writes the vendor update to the parent and all its line items', () => {
    const ctx = setup([line(), line({ [COL.ID]: 'R2', [COL.ITEM]: '20' })]);
    const result = ctx.app.updateVendorRecord(ctx.vendorToken, {
      parentId: MAJU_PARENT_ID, eta: '2026-05-05', sourceStock: 'LOCAL',
      etd: '21/08/2026', status: 'ON PROCESS', note: 'siap kirim'
    });
    assert.equal(result.ok, true);
    assert.equal(result.childCount, 2);
    assert.equal(result.record.status, 'ON PROCESS');
    assert.equal(result.record.revision, 1);
    assert.match(result.message, /berhasil diterapkan ke 2 line item/);

    ctx.app.readDb_().rows.forEach(function (r) {
      assert.equal(r.obj[COL.STATUS], 'ON PROCESS');
      assert.equal(r.obj[COL.NOTE], 'siap kirim');
      assert.equal(r.obj[COL.UPDATED_BY], 'pt.maju');
      assert.equal(r.obj[COL.REVISION], 1);
    });
  });

  it('records history and a vendor notification', () => {
    const ctx = setup();
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, status: 'ON PROCESS' });
    const history = ctx.app.getHistory(ctx.adminToken, {});
    assert.equal(history.total, 1);
    assert.equal(history.rows[0].action, 'UPDATE_ETA');
    assert.equal(history.rows[0].item, 'ALL (1)');

    const notifications = ctx.app.readNotificationRows_();
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].obj.CHANGE_TYPES, 'STATUS');
    assert.equal(notifications[0].obj.VENDOR_CODE, '100123');
  });

  it('keeps the previous eta and source when the payload omits them', () => {
    const ctx = setup();
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, eta: '2026-05-05', sourceStock: 'LOCAL', status: 'ON PROCESS' });
    const second = ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, status: 'READY VENDOR' });
    assert.equal(second.record.eta, '2026-05-05');
    assert.equal(second.record.sourceStock, 'LOCAL');
    assert.equal(second.record.revision, 2);
  });

  it('stores an attached photo and reports it in the notification', () => {
    const ctx = setup();
    const dataUrl = 'data:image/png;base64,' + Buffer.from('bukti').toString('base64');
    const result = ctx.app.updateVendorRecord(ctx.vendorToken, {
      parentId: MAJU_PARENT_ID, status: 'ON PROCESS', photoData: dataUrl, photoName: 'bukti.png'
    });
    assert.match(result.record.photoUrl, /^https:\/\/drive\.google\.com/);
    assert.equal(ctx.app.readNotificationRows_()[0].obj.CHANGE_TYPES, 'STATUS,FOTO');
  });

  it('does not notify when an admin performs the update', () => {
    const ctx = setup();
    ctx.app.updateVendorRecord(ctx.adminToken, { parentId: MAJU_PARENT_ID, status: 'ON PROCESS' });
    assert.deepEqual(plain(ctx.app.readNotificationRows_()), []);
  });

  it('rejects a missing id, another vendor and a PO that is not fully released', () => {
    const ctx = setup([
      line(),
      line({ [COL.ID]: 'R2', [COL.PO]: '4500999', [COL.RELEASE]: 'NOT YET RELEASE', [COL.PARENT_ID]: '' })
    ]);
    assert.throws(() => ctx.app.updateVendorRecord(ctx.vendorToken, {}), /ID PO tidak ditemukan/);
    assert.throws(() => ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: 'TIDAK-ADA' }), /Data PO tidak ditemukan/);
    assert.throws(
      () => ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: base.makeParentPoId_('4500999', '100123', 'PT Maju Jaya'), status: 'ON PROCESS' }),
      /hanya dapat dilihat/
    );

    const other = setup([line({ [COL.VENDOR_CODE]: '100999', [COL.VENDOR_NAME]: 'CV Sinar', [COL.PARENT_ID]: '' })]);
    assert.throws(
      () => other.app.updateVendorRecord(other.vendorToken, { parentId: base.makeParentPoId_('4500001', '100999', 'CV Sinar') }),
      /tidak berhak memperbarui/
    );
  });
});

describe('deleteOutstandingRecord', () => {
  it('deletes the parent, its line items and logs the action', () => {
    const ctx = setup([
      line(),
      line({ [COL.ID]: 'R2', [COL.ITEM]: '20' }),
      line({ [COL.ID]: 'R3', [COL.PO]: '4500999', [COL.PARENT_ID]: '' })
    ]);
    const result = ctx.app.deleteOutstandingRecord(ctx.adminToken, MAJU_PARENT_ID);
    assert.match(result.message, /2 line item berhasil dihapus/);
    assert.deepEqual(plain(ctx.app.readDb_().rows.map(function (r) { return r.obj[COL.ID]; })), ['R3']);
    assert.equal(ctx.app.readParentDb_().rows.length, 1);
    assert.equal(ctx.app.getHistory(ctx.adminToken, { action: 'DELETE_RECORD' }).total, 1);
  });

  it('is admin only and needs an existing PO', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.deleteOutstandingRecord(ctx.vendorToken, MAJU_PARENT_ID), /hanya dapat digunakan Admin/);
    assert.throws(() => ctx.app.deleteOutstandingRecord(ctx.adminToken, 'TIDAK-ADA'), /PO tidak ditemukan/);
  });
});

describe('importExcelData', () => {
  const headers = ['PO', 'ITEM', 'PART NO', 'VENDOR', 'AGING DAYS', 'NET VALUE', 'STATUS RELEASED', 'ETA'];

  function rows() {
    return [
      ['4500001', '10', 'PN-1', '100123 PT Maju Jaya', '5', '1000', 'FULL RELEASE', ''],
      ['4500001', '20', 'PN-2', '100123 PT Maju Jaya', '5', '2000', 'FULL RELEASE', ''],
      ['4500999', '10', 'PN-9', '100999 CV Sinar', '2', '500', 'NOT YET RELEASE', '']
    ];
  }

  it('replaces the database, rebuilds parents and creates vendor accounts', () => {
    const ctx = setup();
    const result = ctx.app.importExcelData(ctx.adminToken, { headers: headers, rows: rows() });
    assert.equal(result.ok, true);
    assert.equal(result.rowCount, 3);
    assert.equal(result.parentCount, 2);
    assert.equal(result.skippedRows, 0);
    assert.equal(result.newCredentials.length, 1);
    assert.equal(result.newCredentials[0].vendorCode, '100999');

    const db = ctx.app.readDb_();
    assert.equal(db.rows.length, 3);
    assert.equal(db.rows[0].obj[COL.VENDOR_CODE], '100123');
    assert.equal(db.rows[0].obj[COL.AGING], '5');
    assert.equal(ctx.app.getHistory(ctx.adminToken, { action: 'IMPORT_PRESERVE' }).total, 1);
  });

  it('skips rows without the mandatory columns', () => {
    const ctx = setup();
    const withNoise = rows().concat([['', '', '', '', '9', '', '', ''], []]);
    const result = ctx.app.importExcelData(ctx.adminToken, { headers: headers, rows: withNoise });
    assert.equal(result.rowCount, 3);
    assert.equal(result.skippedRows, 2);
    assert.match(result.message, /2 baris kosong\/tidak lengkap dilewati otomatis/);
  });

  it('preserves vendor updates in PRESERVE mode and clears them in REPLACE mode', () => {
    const ctx = setup();
    ctx.app.importExcelData(ctx.adminToken, { headers: headers, rows: rows() });
    const parentId = ctx.app.readDb_().rows[0].obj[COL.PARENT_ID];
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: parentId, status: 'ON PROCESS', note: 'catatan' });

    ctx.app.importExcelData(ctx.adminToken, { headers: headers, rows: rows() });
    assert.equal(ctx.app.readDb_().rows[0].obj[COL.STATUS], 'ON PROCESS');

    ctx.app.importExcelData(ctx.adminToken, { headers: headers, rows: rows(), mode: 'REPLACE' });
    assert.equal(ctx.app.readDb_().rows[0].obj[COL.STATUS], '');
  });

  it('rejects empty payloads and missing mandatory columns', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.importExcelData(ctx.adminToken, {}), /tidak memiliki data/);
    assert.throws(() => ctx.app.importExcelData(ctx.adminToken, { headers: headers, rows: [] }), /tidak memiliki data/);
    assert.throws(
      () => ctx.app.importExcelData(ctx.adminToken, { headers: ['PO', 'ITEM'], rows: [['4500001', '10']] }),
      /Kolom wajib tidak ditemukan/
    );
  });
});

describe('syncVendorUsers / regenerateVendorCredentials', () => {
  it('creates one account per vendor found in the database', () => {
    const ctx = setup([
      line(),
      line({ [COL.ID]: 'R2', [COL.VENDOR_CODE]: '100999', [COL.VENDOR_NAME]: 'CV Sinar', [COL.PARENT_ID]: '' })
    ]);
    const result = ctx.app.syncVendorUsers(ctx.adminToken);
    assert.equal(result.created, 1);
    assert.equal(result.credentials[0].username, 'cv.sinar');
    assert.equal(result.credentials[0].password, 'Sinar@0999');
    assert.equal(ctx.app.syncVendorUsers(ctx.adminToken).created, 0);
  });

  it('regenerates vendor credentials and logs it', () => {
    const ctx = setup();
    const result = ctx.app.regenerateVendorCredentials(ctx.adminToken);
    assert.equal(result.updated, 1);
    assert.equal(result.credentials[0].vendorCode, '100123');
    assert.equal(ctx.app.getHistory(ctx.adminToken, { action: 'REGENERATE_VENDOR_CREDENTIALS' }).total, 1);
    assert.equal(ctx.app.login(result.credentials[0].username, result.credentials[0].password).ok, true);
  });
});

describe('editHistory / deleteHistory', () => {
  function withUpdates() {
    const ctx = setup();
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, eta: '2026-05-05', sourceStock: 'LOCAL', status: 'ON PROCESS' });
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, eta: '2026-06-06', sourceStock: 'IMPORT', status: 'READY VENDOR' });
    return ctx;
  }

  function historyIds(ctx) {
    return ctx.app.getHistory(ctx.adminToken, {}).rows.map(function (r) { return r.historyId; });
  }

  /** History id of the entry that recorded the given status. */
  function historyIdFor(ctx, status) {
    return ctx.app.getHistory(ctx.adminToken, {}).rows.find(function (r) { return r.newStatus === status; }).historyId;
  }

  it('applies an edited latest history entry back to the master data', () => {
    const ctx = withUpdates();
    const latest = historyIdFor(ctx, 'READY VENDOR');
    assert.equal(ctx.app.editHistory(ctx.adminToken, {
      historyId: latest, eta: '2026-07-07', sourceStock: 'LOCAL', status: 'DELIVERED SITE', note: 'revisi'
    }).ok, true);

    const detail = ctx.app.getRecordDetail(ctx.adminToken, MAJU_PARENT_ID);
    assert.equal(detail.status, 'DELIVERED SITE');
    assert.equal(detail.note, 'revisi');
    assert.equal(ctx.app.getHistoryDetail(ctx.adminToken, latest).newStatus, 'DELIVERED SITE');
    assert.equal(ctx.app.readNotificationRows_()[1].obj.NEW_STATUS, 'DELIVERED SITE');
  });

  it('leaves the master data alone when an older entry is edited', () => {
    const ctx = withUpdates();
    ctx.app.editHistory(ctx.adminToken, { historyId: historyIdFor(ctx, 'ON PROCESS'), status: 'REJECTED' });
    assert.equal(ctx.app.getRecordDetail(ctx.adminToken, MAJU_PARENT_ID).status, 'READY VENDOR');
  });

  it('rolls the master data back to the previous entry on delete', () => {
    const ctx = withUpdates();
    assert.equal(ctx.app.deleteHistory(ctx.adminToken, historyIdFor(ctx, 'READY VENDOR')).ok, true);
    const detail = ctx.app.getRecordDetail(ctx.adminToken, MAJU_PARENT_ID);
    assert.equal(detail.status, 'ON PROCESS');
    assert.equal(detail.sourceStock, 'LOCAL');
    assert.equal(ctx.app.getHistory(ctx.adminToken, {}).total, 1);
    assert.equal(ctx.app.readNotificationRows_().length, 1);
  });

  it('restores the original state when the last remaining entry is deleted', () => {
    const ctx = setup();
    ctx.app.updateVendorRecord(ctx.vendorToken, { parentId: MAJU_PARENT_ID, eta: '2026-05-05', sourceStock: 'LOCAL', status: 'ON PROCESS' });
    ctx.app.deleteHistory(ctx.adminToken, historyIds(ctx)[0]);
    const detail = ctx.app.getRecordDetail(ctx.adminToken, MAJU_PARENT_ID);
    assert.equal(detail.status, '');
    assert.equal(detail.eta, '');
  });

  it('is idempotent and rejects unknown or already deleted entries', () => {
    const ctx = withUpdates();
    const first = historyIds(ctx)[0];
    ctx.app.deleteHistory(ctx.adminToken, first);
    assert.match(ctx.app.deleteHistory(ctx.adminToken, first).message, /sudah dihapus/);
    assert.throws(() => ctx.app.editHistory(ctx.adminToken, { historyId: first }), /sudah dihapus/);
    assert.throws(() => ctx.app.editHistory(ctx.adminToken, { historyId: 'H-nope' }), /Riwayat tidak ditemukan/);
    assert.throws(() => ctx.app.deleteHistory(ctx.adminToken, 'H-nope'), /Riwayat tidak ditemukan/);
    assert.throws(() => ctx.app.deleteHistory(ctx.vendorToken, first), /hanya dapat digunakan Admin/);
  });
});

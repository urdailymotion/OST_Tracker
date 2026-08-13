'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { formatDate } = require('./helpers/apps-script-mocks');
const { plain } = require('./helpers/load-code');
const { loadWithSheets } = require('./helpers/fixtures');

const TIMEZONE = 'Asia/Makassar';

const ADMIN_USER = {
  USER_ID: 'u-admin', USERNAME: 'admin', PASSWORD_HASH: 'Admin@1234', ROLE: 'ADMIN',
  VENDOR_CODE: '', VENDOR_NAME: '', ACTIVE: true, MUST_CHANGE: false, LAST_LOGIN: '', UPDATED_AT: ''
};

const VENDOR_USER = {
  USER_ID: 'u-vendor', USERNAME: 'pt.maju', PASSWORD_HASH: 'Maju@0123', ROLE: 'VENDOR',
  VENDOR_CODE: '100123', VENDOR_NAME: 'PT Maju Jaya', ACTIVE: true, MUST_CHANGE: false,
  LAST_LOGIN: '', UPDATED_AT: ''
};

/** Builds an app with the given sheets plus admin and vendor tokens. */
function setup(data) {
  const app = loadWithSheets(Object.assign({ users: [ADMIN_USER, VENDOR_USER], history: [], notifications: [] }, data || {}));
  return {
    app: app,
    adminToken: app.createSession_({ userId: 'u-admin', username: 'admin', role: 'ADMIN' }),
    vendorToken: app.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR', vendorCode: '100123' }),
    usersValues: function () { return app.__mocks.spreadsheet.getSheetByName('USERS').getDataRange().getValues(); },
    historyValues: function () { return app.__mocks.spreadsheet.getSheetByName('HISTORY').getDataRange().getValues(); }
  };
}

function userRow(app, userId) {
  const values = app.__mocks.spreadsheet.getSheetByName('USERS').getDataRange().getValues();
  const headers = values[0];
  const found = values.slice(1).find(function (r) { return r[headers.indexOf('USER_ID')] === userId; });
  if (!found) return null;
  const obj = {};
  headers.forEach(function (h, i) { obj[h] = found[i]; });
  return obj;
}

function notification(overrides) {
  return Object.assign({
    NOTIFICATION_ID: 'N1', HISTORY_ID: 'H1', RECORD_ID: 'R1', CREATED_AT: new Date(),
    VENDOR_CODE: '100123', VENDOR_NAME: 'PT Maju Jaya', USERNAME: 'pt.maju',
    PO: '4500001', ITEM: 'ALL (2)', PART_NUMBER: '2 LINE ITEMS',
    CHANGE_TYPES: 'ETA', CHANGE_SUMMARY: 'ETA: - → 05/05/2026', NEW_ETA: '2026-05-05',
    NEW_SOURCE: 'LOCAL', NEW_ETD: '', NEW_STATUS: 'ON PROCESS', NEW_NOTE: '', PHOTO_URL: '', READ_BY: ''
  }, overrides || {});
}

function history(overrides) {
  return Object.assign({
    HISTORY_ID: 'H1', RECORD_ID: 'R1', ACTION: 'UPDATE_ETA', TIMESTAMP: new Date(Date.UTC(2026, 4, 5, 4)),
    USER_ID: 'u-vendor', USERNAME: 'pt.maju', ROLE: 'VENDOR', VENDOR_CODE: '100123',
    PO: '4500001', ITEM: '10', PART_NUMBER: 'PN-1',
    OLD_ETA: '', NEW_ETA: '2026-05-05', OLD_SOURCE: '', NEW_SOURCE: 'LOCAL',
    OLD_ETD: '', NEW_ETD: '', OLD_STATUS: '', NEW_STATUS: 'ON PROCESS',
    OLD_NOTE: '', NEW_NOTE: '', OLD_PHOTO_URL: '', NEW_PHOTO_URL: '', IS_DELETED: false
  }, overrides || {});
}

describe('getUsers', () => {
  it('returns every account for an admin', () => {
    const ctx = setup();
    const users = ctx.app.getUsers(ctx.adminToken);
    assert.deepEqual(users.map(function (u) { return u.username; }), ['admin', 'pt.maju']);
    assert.equal(users[1].vendorCode, '100123');
    assert.equal(users[1].active, true);
    assert.equal(users[1].password, 'Maju@0123');
  });

  it('is admin only', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.getUsers(ctx.vendorToken), /hanya dapat digunakan Admin/);
  });
});

describe('saveUser', () => {
  it('creates a vendor account with a generated username and default password', () => {
    const ctx = setup();
    assert.equal(ctx.app.saveUser(ctx.adminToken, { role: 'VENDOR', vendorCode: '100999', vendorName: 'CV Sinar Terang' }).ok, true);
    const created = ctx.app.getUsers(ctx.adminToken).find(function (u) { return u.vendorCode === '100999'; });
    assert.equal(created.username, 'cv.sinar.terang');
    assert.equal(created.password, 'Sinar@0999');
    assert.equal(created.role, 'VENDOR');
    assert.equal(ctx.historyValues().length, 2);
  });

  it('updates an existing account and clears vendor fields for admins', () => {
    const ctx = setup();
    ctx.app.saveUser(ctx.adminToken, { userId: 'u-vendor', username: 'pt.maju', role: 'ADMIN', password: 'Baru@12345', active: false });
    const stored = userRow(ctx.app, 'u-vendor');
    assert.equal(stored.ROLE, 'ADMIN');
    assert.equal(stored.VENDOR_CODE, '');
    assert.equal(stored.VENDOR_NAME, '');
    assert.equal(stored.ACTIVE, false);
    assert.equal(stored.PASSWORD_HASH, 'Baru@12345');
  });

  it('rejects invalid roles, duplicate usernames and missing fields', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.saveUser(ctx.adminToken, { role: 'SUPERUSER' }), /Role tidak valid/);
    assert.throws(() => ctx.app.saveUser(ctx.adminToken, { role: 'VENDOR' }), /Vendor wajib dipilih/);
    assert.throws(() => ctx.app.saveUser(ctx.adminToken, { role: 'ADMIN' }), /Username wajib diisi/);
    assert.throws(() => ctx.app.saveUser(ctx.adminToken, { role: 'ADMIN', username: 'PT.Maju' }), /Username sudah digunakan/);
  });
});

describe('resetUserPassword', () => {
  it('resets a vendor to the derived default password', () => {
    const ctx = setup();
    const result = ctx.app.resetUserPassword(ctx.adminToken, 'u-vendor');
    assert.equal(result.username, 'pt.maju');
    assert.equal(result.password, 'Maju@0123');
    assert.equal(userRow(ctx.app, 'u-vendor').PASSWORD_HASH, 'Maju@0123');
  });

  it('resets an admin to the configured default password', () => {
    const ctx = setup();
    assert.equal(ctx.app.resetUserPassword(ctx.adminToken, 'u-admin').password, ctx.app.CONFIG.DEFAULT_ADMIN.password);
  });

  it('fails for unknown users', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.resetUserPassword(ctx.adminToken, 'u-nope'), /User tidak ditemukan/);
  });
});

describe('deleteUser', () => {
  it('removes another account', () => {
    const ctx = setup();
    assert.equal(ctx.app.deleteUser(ctx.adminToken, 'u-vendor').ok, true);
    assert.equal(userRow(ctx.app, 'u-vendor'), null);
  });

  it('refuses to delete the signed in account or an unknown one', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.deleteUser(ctx.adminToken, 'u-admin'), /sedang digunakan/);
    assert.throws(() => ctx.app.deleteUser(ctx.adminToken, 'u-nope'), /User tidak ditemukan/);
  });
});

describe('changePassword', () => {
  it('replaces the password and clears the must change flag', () => {
    const ctx = setup();
    assert.equal(ctx.app.changePassword(ctx.adminToken, 'Admin@1234', 'Rahasia@2026').ok, true);
    const stored = userRow(ctx.app, 'u-admin');
    assert.equal(stored.PASSWORD_HASH, 'Rahasia@2026');
    assert.equal(stored.MUST_CHANGE, false);
    assert.equal(ctx.app.requireSession_(ctx.adminToken).userId, 'u-admin');
  });

  it('accepts a legacy hash as the old password', () => {
    const legacy = loadWithSheets({ users: [] }).legacyHashPassword_('Admin@1234', 'u-admin');
    const ctx = setup({ users: [Object.assign({}, ADMIN_USER, { PASSWORD_HASH: legacy }), VENDOR_USER] });
    assert.equal(ctx.app.changePassword(ctx.adminToken, 'Admin@1234', 'Rahasia@2026').ok, true);
  });

  it('rejects short passwords and a wrong old password', () => {
    const ctx = setup();
    assert.throws(() => ctx.app.changePassword(ctx.adminToken, 'Admin@1234', 'pendek'), /minimal 8 karakter/);
    assert.throws(() => ctx.app.changePassword(ctx.adminToken, 'Salah@0000', 'Rahasia@2026'), /Password lama salah/);
  });
});

describe('getHistory', () => {
  it('returns history for admins and scopes it for vendors', () => {
    const ctx = setup({
      history: [
        history(),
        history({ HISTORY_ID: 'H2', VENDOR_CODE: '100999', PO: '4500999' }),
        history({ HISTORY_ID: 'H3', IS_DELETED: true })
      ]
    });
    const adminResult = ctx.app.getHistory(ctx.adminToken, {});
    assert.equal(adminResult.total, 2);
    assert.deepEqual(plain(adminResult.rows.map(function (r) { return r.historyId; })), ['H1', 'H2']);

    const vendorResult = ctx.app.getHistory(ctx.vendorToken, {});
    assert.equal(vendorResult.total, 1);
    assert.equal(vendorResult.rows[0].vendorCode, '100123');
  });

  it('filters by action and free text, and paginates', () => {
    const ctx = setup({
      history: [
        history(),
        history({ HISTORY_ID: 'H2', ACTION: 'DELETE_RECORD', PO: '4500222' })
      ]
    });
    assert.equal(ctx.app.getHistory(ctx.adminToken, { action: 'DELETE_RECORD' }).total, 1);
    assert.equal(ctx.app.getHistory(ctx.adminToken, { search: '4500222' }).total, 1);
    assert.equal(ctx.app.getHistory(ctx.adminToken, { search: 'tidak ada' }).total, 0);

    const paged = ctx.app.getHistory(ctx.adminToken, { pageSize: 1, page: 5 });
    assert.equal(paged.pageSize, 10);
    assert.equal(paged.totalPages, 1);
    assert.equal(paged.page, 1);
  });

  it('returns an empty payload when the sheet has only headers', () => {
    const ctx = setup({ history: [] });
    assert.deepEqual(plain(ctx.app.getHistory(ctx.adminToken, {})), { rows: [], total: 0, page: 1, totalPages: 1, pageSize: 25 });
  });
});

describe('getHistoryDetail', () => {
  it('returns the mapped history entry for an allowed session', () => {
    const ctx = setup({ history: [history()] });
    const detail = ctx.app.getHistoryDetail(ctx.vendorToken, 'H1');
    assert.equal(detail.historyId, 'H1');
    assert.equal(detail.newEta, '2026-05-05');
    assert.equal(detail.newSource, 'LOCAL');
  });

  it('rejects unknown ids and other vendors', () => {
    const ctx = setup({ history: [history({ VENDOR_CODE: '100999' })] });
    assert.throws(() => ctx.app.getHistoryDetail(ctx.adminToken, 'H9'), /Riwayat tidak ditemukan/);
    assert.throws(() => ctx.app.getHistoryDetail(ctx.vendorToken, 'H1'), /tidak memiliki akses/);
  });
});

describe('getAdminNotificationSummary', () => {
  it('counts today and unread notifications', () => {
    const yesterday = new Date(Date.now() - 86400000);
    const ctx = setup({
      notifications: [
        notification(),
        notification({ NOTIFICATION_ID: 'N2', READ_BY: 'u-admin' }),
        notification({ NOTIFICATION_ID: 'N3', CREATED_AT: yesterday })
      ]
    });
    const summary = ctx.app.getAdminNotificationSummary(ctx.adminToken);
    assert.equal(summary.todayCount, 2);
    assert.equal(summary.unreadToday, 1);
    assert.equal(summary.totalUnread, 2);
    assert.equal(summary.latestAt.slice(0, 10), formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'));
  });

  it('reports zeroes for an empty sheet', () => {
    const ctx = setup({ notifications: [] });
    assert.deepEqual(plain(ctx.app.getAdminNotificationSummary(ctx.adminToken)), {
      todayCount: 0, unreadToday: 0, totalUnread: 0, latestAt: ''
    });
  });
});

describe('getAdminNotifications', () => {
  it('filters by period, search and read state with a summary', () => {
    const ctx = setup({
      notifications: [
        notification({ NOTIFICATION_ID: 'N1', CREATED_AT: new Date(Date.now() - 60000) }),
        notification({ NOTIFICATION_ID: 'N2', READ_BY: 'u-admin', VENDOR_CODE: '100999', CHANGE_TYPES: 'STATUS' }),
        notification({ NOTIFICATION_ID: 'N3', CREATED_AT: new Date(Date.now() - (3 * 86400000)) })
      ]
    });

    const today = ctx.app.getAdminNotifications(ctx.adminToken, {});
    assert.deepEqual(plain(today.rows.map(function (r) { return r.notificationId; })), ['N2', 'N1']);
    assert.deepEqual(plain(today.summary), { total: 2, unread: 1, vendors: 2, etaChanges: 1 });

    assert.equal(ctx.app.getAdminNotifications(ctx.adminToken, { period: 'ALL' }).total, 3);
    assert.equal(ctx.app.getAdminNotifications(ctx.adminToken, { period: '7_DAYS' }).total, 3);
    assert.equal(ctx.app.getAdminNotifications(ctx.adminToken, { period: 'ALL', readState: 'READ' }).total, 1);
    assert.equal(ctx.app.getAdminNotifications(ctx.adminToken, { period: 'ALL', readState: 'UNREAD' }).total, 2);
    assert.equal(ctx.app.getAdminNotifications(ctx.adminToken, { period: 'ALL', search: '100999' }).total, 1);
    assert.equal(ctx.app.getAdminNotifications(ctx.adminToken, { period: 'ALL', search: 'tidak ada' }).total, 0);
  });

  it('clamps the page size and page number', () => {
    const ctx = setup({ notifications: [notification()] });
    const result = ctx.app.getAdminNotifications(ctx.adminToken, { pageSize: 500, page: 9 });
    assert.equal(result.pageSize, 100);
    assert.equal(result.page, 1);
    assert.equal(result.totalPages, 1);
  });
});

describe('markNotificationRead / markAllNotificationsRead', () => {
  it('marks a single notification as read once', () => {
    const ctx = setup({ notifications: [notification(), notification({ NOTIFICATION_ID: 'N2' })] });
    assert.equal(ctx.app.markNotificationRead(ctx.adminToken, 'N1').ok, true);
    assert.equal(ctx.app.markNotificationRead(ctx.adminToken, 'N1').ok, true);
    const rows = ctx.app.readNotificationRows_();
    assert.equal(rows[0].obj.READ_BY, 'u-admin');
    assert.equal(rows[1].obj.READ_BY, '');
  });

  it('fails for unknown or empty notification sheets', () => {
    const ctx = setup({ notifications: [notification()] });
    assert.throws(() => ctx.app.markNotificationRead(ctx.adminToken, 'N9'), /Notifikasi tidak ditemukan/);
    const empty = setup({ notifications: [] });
    assert.throws(() => empty.app.markNotificationRead(empty.adminToken, 'N1'), /Notifikasi tidak ditemukan/);
  });

  it('marks all notifications of the requested period', () => {
    const ctx = setup({
      notifications: [
        notification(),
        notification({ NOTIFICATION_ID: 'N2', READ_BY: 'u-admin' }),
        notification({ NOTIFICATION_ID: 'N3', CREATED_AT: new Date(Date.now() - (3 * 86400000)) })
      ]
    });
    assert.equal(ctx.app.markAllNotificationsRead(ctx.adminToken, {}).count, 1);
    assert.equal(ctx.app.markAllNotificationsRead(ctx.adminToken, { period: 'ALL' }).count, 1);
    assert.equal(ctx.app.markAllNotificationsRead(ctx.adminToken, { period: 'ALL' }).count, 0);
    assert.equal(ctx.app.readNotificationRows_().every(function (r) { return r.obj.READ_BY === 'u-admin'; }), true);
  });

  it('handles an empty notification sheet', () => {
    const ctx = setup({ notifications: [] });
    assert.deepEqual(plain(ctx.app.markAllNotificationsRead(ctx.adminToken, {})), {
      ok: true, count: 0, message: 'Tidak ada notifikasi.'
    });
  });
});

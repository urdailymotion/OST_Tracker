'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode } = require('./helpers/load-code');
const { loadWithSheets } = require('./helpers/fixtures');

const app = loadCode();

const ADMIN_USER = {
  USER_ID: 'u-admin', USERNAME: 'admin', PASSWORD_HASH: 'Admin@1234', ROLE: 'ADMIN',
  VENDOR_CODE: '', VENDOR_NAME: '', ACTIVE: true, MUST_CHANGE: true, LAST_LOGIN: '', UPDATED_AT: ''
};

const VENDOR_USER = {
  USER_ID: 'u-vendor', USERNAME: 'pt.maju', PASSWORD_HASH: 'Maju@0123', ROLE: 'VENDOR',
  VENDOR_CODE: '100123', VENDOR_NAME: 'PT Maju Jaya', ACTIVE: true, MUST_CHANGE: true,
  LAST_LOGIN: '', UPDATED_AT: ''
};

function withUsers(users) {
  return loadWithSheets({ users: users, db: [], parent: [], history: [], notifications: [], settings: [] });
}

describe('normalizeSessionToken_ / sessionKey_', () => {
  it('accepts tokens of 20 to 200 url-safe characters', () => {
    const token = 'a'.repeat(64);
    assert.equal(app.normalizeSessionToken_(' ' + token + ' '), token);
    assert.equal(app.normalizeSessionToken_('a-b_' + 'c'.repeat(20)), 'a-b_' + 'c'.repeat(20));
    assert.equal(app.sessionKey_(token), 'SESSION_' + token);
  });

  it('rejects short, oversized, empty and unsafe tokens', () => {
    assert.equal(app.normalizeSessionToken_('a'.repeat(19)), '');
    assert.equal(app.normalizeSessionToken_('a'.repeat(201)), '');
    assert.equal(app.normalizeSessionToken_(''), '');
    assert.equal(app.normalizeSessionToken_(null), '');
    assert.equal(app.normalizeSessionToken_('a'.repeat(20) + '!'), '');
  });
});

describe('createSession_', () => {
  it('stores the session in cache and properties with an expiry', () => {
    const loaded = withUsers([ADMIN_USER]);
    const token = loaded.createSession_({ userId: 'u-admin', username: 'admin', role: 'ADMIN' });
    assert.equal(loaded.normalizeSessionToken_(token), token);

    const stored = JSON.parse(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token));
    assert.equal(stored.userId, 'u-admin');
    assert.ok(stored.expiresAtMs > Date.now());
    assert.equal(stored.expiresAtMs - stored.issuedAtMs, loaded.CONFIG.SESSION_SECONDS * 1000);
    assert.equal(loaded.__mocks.scriptCache.get('SESSION_' + token), JSON.stringify(stored));
  });

  it('rejects incomplete sessions', () => {
    assert.throws(() => app.createSession_(null), /Data session tidak lengkap/);
    assert.throws(() => app.createSession_({ userId: 'u-1' }), /Data session tidak lengkap/);
    assert.throws(() => app.createSession_({ username: 'admin' }), /Data session tidak lengkap/);
  });
});

describe('requireSession_ / requireAdmin_', () => {
  it('returns the session refreshed from the USERS sheet', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = loaded.createSession_({ userId: 'u-vendor', username: 'stale', role: 'ADMIN', vendorCode: '' });
    const session = loaded.requireSession_(token);
    assert.equal(session.username, 'pt.maju');
    assert.equal(session.role, 'VENDOR');
    assert.equal(session.vendorCode, '100123');
    assert.equal(session.vendorName, 'PT Maju Jaya');
    assert.equal(session.mustChange, true);
  });

  it('falls back to script properties when the cache is cleared', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = loaded.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR' });
    loaded.__mocks.scriptCache.store.clear();
    assert.equal(loaded.requireSession_(token).userId, 'u-vendor');
    assert.ok(loaded.__mocks.scriptCache.get('SESSION_' + token));
  });

  it('rejects a missing or malformed token', () => {
    const loaded = withUsers([VENDOR_USER]);
    assert.throws(() => loaded.requireSession_(''), /Sesi login tidak ditemukan/);
    assert.throws(() => loaded.requireSession_('x'.repeat(64)), /Sesi login telah berakhir/);
  });

  it('drops sessions with unparsable payloads', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = 'x'.repeat(64);
    loaded.__mocks.scriptProperties.setProperty('SESSION_' + token, '{not json');
    assert.throws(() => loaded.requireSession_(token), /Data sesi tidak valid/);
    assert.equal(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token), null);
  });

  it('drops expired sessions', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = 'x'.repeat(64);
    loaded.__mocks.scriptProperties.setProperty('SESSION_' + token, JSON.stringify({ userId: 'u-vendor', expiresAtMs: Date.now() - 1000 }));
    assert.throws(() => loaded.requireSession_(token), /Sesi login telah berakhir/);
    assert.equal(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token), null);
  });

  it('drops sessions whose account is deactivated or deleted', () => {
    const loaded = withUsers([Object.assign({}, VENDOR_USER, { ACTIVE: false })]);
    const token = loaded.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR' });
    assert.throws(() => loaded.requireSession_(token), /Akun tidak aktif atau sudah dihapus/);
    assert.equal(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token), null);
  });

  it('requireAdmin_ only lets admin roles through', () => {
    const loaded = withUsers([ADMIN_USER, VENDOR_USER]);
    const adminToken = loaded.createSession_({ userId: 'u-admin', username: 'admin', role: 'ADMIN' });
    const vendorToken = loaded.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR' });
    assert.equal(loaded.requireAdmin_(adminToken).role, 'ADMIN');
    assert.throws(() => loaded.requireAdmin_(vendorToken), /hanya dapat digunakan Admin/);
  });
});

describe('refreshSession_ / deleteSession_', () => {
  it('merges new fields but keeps the original issue and expiry stamps', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = loaded.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR', mustChange: true });
    const before = JSON.parse(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token));

    loaded.refreshSession_(token, { mustChange: false });
    const after = JSON.parse(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token));
    assert.equal(after.mustChange, false);
    assert.equal(after.username, 'pt.maju');
    assert.equal(after.issuedAtMs, before.issuedAtMs);
    assert.equal(after.expiresAtMs, before.expiresAtMs);
  });

  it('creates a fresh expiry when no payload is stored yet', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = 'y'.repeat(64);
    loaded.refreshSession_(token, { userId: 'u-vendor' });
    const stored = JSON.parse(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token));
    assert.ok(stored.expiresAtMs > Date.now());
    assert.throws(() => loaded.refreshSession_('short', {}), /Token session tidak valid/);
  });

  it('deleteSession_ clears both stores and ignores invalid tokens', () => {
    const loaded = withUsers([VENDOR_USER]);
    const token = loaded.createSession_({ userId: 'u-vendor', username: 'pt.maju', role: 'VENDOR' });
    assert.equal(loaded.logout(token).ok, true);
    assert.equal(loaded.__mocks.scriptProperties.getProperty('SESSION_' + token), null);
    assert.equal(loaded.__mocks.scriptCache.get('SESSION_' + token), null);
    assert.equal(loaded.deleteSession_('short'), undefined);
  });
});

describe('cleanupExpiredSessions_', () => {
  it('removes expired and broken session entries only', () => {
    const loaded = withUsers([VENDOR_USER]);
    const props = loaded.__mocks.scriptProperties;
    props.setProperty('SESSION_alive', JSON.stringify({ expiresAtMs: Date.now() + 60000 }));
    props.setProperty('SESSION_expired', JSON.stringify({ expiresAtMs: Date.now() - 1 }));
    props.setProperty('SESSION_noexpiry', JSON.stringify({}));
    props.setProperty('SESSION_broken', 'not json');
    props.setProperty('OTHER_KEY', 'keep me');

    loaded.cleanupExpiredSessions_();
    assert.ok(props.getProperty('SESSION_alive'));
    assert.equal(props.getProperty('SESSION_expired'), null);
    assert.equal(props.getProperty('SESSION_noexpiry'), null);
    assert.equal(props.getProperty('SESSION_broken'), null);
    assert.equal(props.getProperty('OTHER_KEY'), 'keep me');
  });
});

describe('getActiveUserForSession_', () => {
  it('reads the row of an active user', () => {
    const user = loadWithSheets({ users: [VENDOR_USER] }).getActiveUserForSession_('u-vendor');
    assert.equal(user.username, 'pt.maju');
    assert.equal(user.role, 'VENDOR');
    assert.equal(user.mustChange, true);
  });

  it('defaults a blank role to VENDOR', () => {
    const user = loadWithSheets({ users: [Object.assign({}, VENDOR_USER, { ROLE: '' })] }).getActiveUserForSession_('u-vendor');
    assert.equal(user.role, 'VENDOR');
  });

  it('returns null for unknown, inactive and empty sheets', () => {
    assert.equal(loadWithSheets({ users: [VENDOR_USER] }).getActiveUserForSession_('u-nope'), null);
    assert.equal(loadWithSheets({ users: [Object.assign({}, VENDOR_USER, { ACTIVE: 'NO' })] }).getActiveUserForSession_('u-vendor'), null);
    assert.equal(loadWithSheets({ users: [] }).getActiveUserForSession_('u-vendor'), null);
    assert.equal(loadWithSheets({ db: [] }).getActiveUserForSession_('u-vendor'), null);
  });
});

describe('login', () => {
  it('authenticates with the username and returns a usable token', () => {
    const loaded = withUsers([ADMIN_USER, VENDOR_USER]);
    const result = loaded.login('pt.maju', 'Maju@0123');
    assert.equal(result.ok, true);
    assert.equal(result.user.role, 'VENDOR');
    assert.equal(result.user.vendorCode, '100123');
    assert.equal(result.appVersion, loaded.CONFIG.APP_VERSION);
    assert.equal(loaded.requireSession_(result.token).userId, 'u-vendor');
  });

  it('accepts the vendor code or vendor name as the login key', () => {
    const loaded = withUsers([VENDOR_USER]);
    assert.equal(loaded.login('100123', 'Maju@0123').ok, true);
    assert.equal(loaded.login('  pt   maju jaya ', 'Maju@0123').ok, true);
  });

  it('tolerates surrounding spaces in the stored or typed password', () => {
    const loaded = withUsers([Object.assign({}, VENDOR_USER, { PASSWORD_HASH: ' Maju@0123 ' })]);
    assert.equal(loaded.login('pt.maju', 'Maju@0123').ok, true);
    assert.equal(loaded.login('pt.maju', ' Maju@0123 ').ok, true);
  });

  it('flags mustChange for admins only', () => {
    const loaded = withUsers([ADMIN_USER, VENDOR_USER]);
    assert.equal(loaded.login('admin', 'Admin@1234').user.mustChange, true);
    assert.equal(loaded.login('pt.maju', 'Maju@0123').user.mustChange, false);
  });

  it('records the login time on the USERS sheet', () => {
    const loaded = withUsers([VENDOR_USER]);
    loaded.login('pt.maju', 'Maju@0123');
    const users = loaded.__mocks.spreadsheet.getSheetByName('USERS');
    const headers = users.getDataRange().getValues()[0];
    const lastLogin = users.getDataRange().getValues()[1][headers.indexOf('LAST_LOGIN')];
    assert.equal(Object.prototype.toString.call(lastLogin), '[object Date]');
  });

  it('upgrades a legacy sha256 password to plain text after a successful login', () => {
    const legacy = app.legacyHashPassword_('Maju@0123', 'u-vendor');
    const loaded = withUsers([Object.assign({}, VENDOR_USER, { PASSWORD_HASH: legacy })]);
    assert.equal(loaded.login('pt.maju', 'Maju@0123').ok, true);

    const users = loaded.__mocks.spreadsheet.getSheetByName('USERS');
    const values = users.getDataRange().getValues();
    assert.equal(values[1][values[0].indexOf('PASSWORD_HASH')], 'Maju@0123');
  });

  it('tries every duplicate username before failing', () => {
    const loaded = withUsers([
      Object.assign({}, VENDOR_USER, { USER_ID: 'u-a', PASSWORD_HASH: 'Salah@0000' }),
      Object.assign({}, VENDOR_USER, { USER_ID: 'u-b' })
    ]);
    assert.equal(loaded.login('pt.maju', 'Maju@0123').user.userId, 'u-b');
  });

  it('requires both a username and a password', () => {
    const loaded = withUsers([VENDOR_USER]);
    assert.throws(() => loaded.login('', 'Maju@0123'), /wajib diisi/);
    assert.throws(() => loaded.login('pt.maju', '   '), /wajib diisi/);
    assert.throws(() => loaded.login('pt.maju', null), /wajib diisi/);
  });

  it('reports unknown usernames, wrong passwords and inactive accounts distinctly', () => {
    const loaded = withUsers([VENDOR_USER]);
    assert.throws(() => loaded.login('tidak.ada', 'Maju@0123'), /Username tidak ditemukan/);
    assert.throws(() => loaded.login('pt.maju', 'Salah@0000'), /Password salah/);

    const inactive = withUsers([Object.assign({}, VENDOR_USER, { ACTIVE: false })]);
    assert.throws(() => inactive.login('pt.maju', 'Maju@0123'), /Akun tidak aktif/);
  });
});

describe('getLoginUserOptions', () => {
  it('lists active accounts with admins first then vendors by name', () => {
    const loaded = withUsers([
      Object.assign({}, VENDOR_USER, { USER_ID: 'u-z', USERNAME: 'pt.zeta', VENDOR_NAME: 'PT Zeta' }),
      Object.assign({}, VENDOR_USER, { USER_ID: 'u-b', USERNAME: 'pt.beta', VENDOR_NAME: 'PT Beta' }),
      ADMIN_USER,
      Object.assign({}, VENDOR_USER, { USER_ID: 'u-off', USERNAME: 'pt.off', ACTIVE: false }),
      Object.assign({}, VENDOR_USER, { USER_ID: 'u-blank', USERNAME: '' })
    ]);
    const options = loaded.getLoginUserOptions();
    assert.deepEqual(options.map(function (o) { return o.username; }), ['admin', 'pt.beta', 'pt.zeta']);
    assert.equal(options[0].role, 'ADMIN');
  });

  it('creates the default admin when the USERS sheet is empty', () => {
    const options = withUsers([]).getLoginUserOptions();
    assert.equal(options.length, 1);
    assert.equal(options[0].role, 'ADMIN');
  });
});

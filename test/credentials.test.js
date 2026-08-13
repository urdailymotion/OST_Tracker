'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { describe, it } = require('node:test');

const { loadCode } = require('./helpers/load-code');

const app = loadCode();

describe('normalizeLoginKey_', () => {
  it('collapses whitespace, strips nbsp and lowercases', () => {
    assert.equal(app.normalizeLoginKey_('  PT   Maju\u00A0Jaya '), 'pt maju jaya');
    assert.equal(app.normalizeLoginKey_(null), '');
    assert.equal(app.normalizeLoginKey_(undefined), '');
    assert.equal(app.normalizeLoginKey_(100123), '100123');
  });
});

describe('credentialCellText_', () => {
  it('prefers the display value and falls back to the raw value', () => {
    assert.equal(app.credentialCellText_('100123', 100123), '100123');
    assert.equal(app.credentialCellText_('', 100123), '100123');
    assert.equal(app.credentialCellText_(null, ' Maju\u00A0 '), 'Maju');
    assert.equal(app.credentialCellText_(null, null), '');
  });
});

describe('validateLoginHeaders_', () => {
  const complete = {
    USER_ID: 0, USERNAME: 1, PASSWORD_HASH: 2, ROLE: 3, VENDOR_CODE: 4,
    VENDOR_NAME: 5, ACTIVE: 6, MUST_CHANGE: 7, LAST_LOGIN: 8, UPDATED_AT: 9
  };

  it('accepts a complete header map', () => {
    assert.equal(app.validateLoginHeaders_(complete), undefined);
  });

  it('reports every missing header', () => {
    const partial = Object.assign({}, complete);
    delete partial.ACTIVE;
    delete partial.UPDATED_AT;
    assert.throws(() => app.validateLoginHeaders_(partial), /USERS tidak lengkap: ACTIVE, UPDATED_AT/);
  });
});

describe('vendorUsernameBase_', () => {
  it('slugifies the vendor name', () => {
    assert.equal(app.vendorUsernameBase_('PT Maju Jaya', '100123'), 'pt.maju.jaya');
    assert.equal(app.vendorUsernameBase_('CV. Sinar & Terang', '100123'), 'cv.sinar.dan.terang');
    assert.equal(app.vendorUsernameBase_('Café Indonésia', '100123'), 'cafe.indonesia');
  });

  it('falls back to the vendor code when the name has no usable characters', () => {
    assert.equal(app.vendorUsernameBase_('', '100123'), 'vendor.0123');
    assert.equal(app.vendorUsernameBase_('***', 'abc'), 'vendor.0000');
    assert.equal(app.vendorUsernameBase_(null, null), 'vendor.0000');
  });

  it('caps the base at 42 characters without a trailing dot', () => {
    const base = app.vendorUsernameBase_('PT ' + 'Panjang '.repeat(12), '100123');
    assert.equal(base.length <= 42, true);
    assert.equal(base.endsWith('.'), false);
  });
});

describe('uniqueUsername_ / uniqueVendorUsername_', () => {
  it('keeps the base when it is free', () => {
    const used = {};
    assert.equal(app.uniqueUsername_('pt.maju', '0123', used), 'pt.maju');
    assert.equal(used['pt.maju'], true);
  });

  it('appends the suffix and then a counter on collisions', () => {
    const used = { 'pt.maju': true };
    assert.equal(app.uniqueUsername_('pt.maju', '0123', used), 'pt.maju.0123');
    assert.equal(app.uniqueUsername_('pt.maju', '0123', used), 'pt.maju.0123.1');
  });

  it('defaults the base to user', () => {
    assert.equal(app.uniqueUsername_('', '', {}), 'user');
  });

  it('derives vendor usernames from name and code', () => {
    const used = {};
    assert.equal(app.uniqueVendorUsername_('PT Maju Jaya', '100123', used), 'pt.maju.jaya');
    assert.equal(app.uniqueVendorUsername_('PT Maju Jaya', '100123', used), 'pt.maju.jaya.0123');
  });
});

describe('defaultVendorPassword_', () => {
  it('uses the first meaningful word plus the last four code digits', () => {
    assert.equal(app.defaultVendorPassword_('100123', 'PT Maju Jaya'), 'Maju@0123');
    assert.equal(app.defaultVendorPassword_('V-100987', 'CV Sinar'), 'Sinar@0987');
    assert.equal(app.defaultVendorPassword_('100123', 'PT Persero Tbk'), 'Vendor@0123');
  });

  it('pads short codes and falls back for empty names', () => {
    assert.equal(app.defaultVendorPassword_('12', 'PT Maju'), 'Maju@0012');
    assert.equal(app.defaultVendorPassword_('', ''), 'Vendor@0000');
  });

  it('caps the word at 14 characters and drops accents', () => {
    assert.equal(app.defaultVendorPassword_('100123', 'PT Indonesiaraya Sentosa'), 'Indonesiaraya@0123');
    assert.equal(app.defaultVendorPassword_('100123', 'PT Café'), 'Cafe@0123');
  });
});

describe('legacy password hashing', () => {
  it('looksLikeLegacySha256_ only accepts 64 hex characters', () => {
    assert.equal(app.looksLikeLegacySha256_('a'.repeat(64)), true);
    assert.equal(app.looksLikeLegacySha256_('A'.repeat(64)), true);
    assert.equal(app.looksLikeLegacySha256_('a'.repeat(63)), false);
    assert.equal(app.looksLikeLegacySha256_('Maju@0123'), false);
    assert.equal(app.looksLikeLegacySha256_(''), false);
  });

  it('legacyHashPassword_ hashes userId|password with sha256', () => {
    const expected = crypto.createHash('sha256').update('u-1|Maju@0123', 'utf8').digest('hex');
    assert.equal(app.legacyHashPassword_('Maju@0123', 'u-1'), expected);
    assert.equal(app.looksLikeLegacySha256_(app.legacyHashPassword_('x', 'u-1')), true);
    assert.notEqual(app.legacyHashPassword_('Maju@0123', 'u-1'), app.legacyHashPassword_('Maju@0123', 'u-2'));
  });
});

'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode } = require('./helpers/load-code');

const app = loadCode();

describe('parseDate_', () => {
  it('returns null for empty values', () => {
    assert.equal(app.parseDate_(''), null);
    assert.equal(app.parseDate_(null), null);
    assert.equal(app.parseDate_(undefined), null);
    assert.equal(app.parseDate_('   '), null);
  });

  it('passes through valid Date objects and rejects invalid ones', () => {
    const date = new Date(2026, 0, 15);
    assert.equal(app.parseDate_(date), date);
    assert.equal(app.parseDate_(new Date('nope')), null);
  });

  it('converts excel serial numbers within the supported range', () => {
    const parsed = app.parseDate_(45000);
    assert.ok(parsed instanceof Date);
    assert.equal(app.toClientDate_(parsed), '2023-03-15');
    // Outside the serial range the number is stringified and left to Date parsing,
    // so it is not interpreted as an excel serial.
    assert.notEqual(app.toClientDate_(90000), '2216-06-06');
  });

  it('parses ISO dates at midday to stay stable across timezones', () => {
    const parsed = app.parseDate_('2026-03-04');
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 2);
    assert.equal(parsed.getDate(), 4);
    assert.equal(parsed.getHours(), 12);
  });

  it('parses day-first dates with slash, dot and dash separators', () => {
    ['04/03/2026', '04.03.2026', '04-03-2026'].forEach((text) => {
      const parsed = app.parseDate_(text);
      assert.equal(app.toClientDate_(parsed), '2026-03-04', text);
    });
  });

  it('falls back to the Date constructor and returns null when unparsable', () => {
    assert.ok(app.parseDate_('Aug 21 2026') instanceof Date);
    assert.equal(app.parseDate_('bukan tanggal'), null);
  });

  it('treats zero as a parsable value rather than empty', () => {
    assert.ok(app.parseDate_(0) === null || app.parseDate_(0) instanceof Date);
  });
});

describe('parseDateInput_', () => {
  it('returns empty string for blank input', () => {
    assert.equal(app.parseDateInput_(''), '');
    assert.equal(app.parseDateInput_(null), '');
  });

  it('parses ISO input at midday', () => {
    const parsed = app.parseDateInput_('2026-12-31');
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 11);
    assert.equal(parsed.getDate(), 31);
    assert.equal(parsed.getHours(), 12);
  });

  it('rejects any other format', () => {
    assert.throws(() => app.parseDateInput_('31/12/2026'), /Format ETA/);
    assert.throws(() => app.parseDateInput_('2026-1-1'), /Format ETA/);
  });
});

describe('date formatting helpers', () => {
  it('stripTime_ zeroes the clock', () => {
    const stripped = app.stripTime_(new Date(2026, 4, 6, 23, 45, 12));
    assert.equal(stripped.getHours(), 0);
    assert.equal(stripped.getMinutes(), 0);
    assert.equal(stripped.getSeconds(), 0);
    assert.equal(stripped.getDate(), 6);
  });

  it('toClientDate_ renders yyyy-MM-dd and empty for unparsable input', () => {
    assert.equal(app.toClientDate_('2026-07-08'), '2026-07-08');
    assert.equal(app.toClientDate_(''), '');
    assert.equal(app.toClientDate_('-'), '');
  });

  it('toClientDateTime_ renders an ISO-like timestamp in app timezone', () => {
    // 2026-02-03T04:05:06Z is 12:05:06 in Asia/Makassar (UTC+8).
    assert.equal(app.toClientDateTime_(new Date(Date.UTC(2026, 1, 3, 4, 5, 6))), '2026-02-03T12:05:06');
    assert.equal(app.toClientDateTime_(''), '');
  });

  it('parseOperationalDate_ ignores placeholder values', () => {
    assert.equal(app.parseOperationalDate_('-'), null);
    assert.equal(app.parseOperationalDate_('735'), null);
    assert.equal(app.parseOperationalDate_(''), null);
    assert.equal(app.toClientOperationalDate_('2026-09-09'), '2026-09-09');
    assert.equal(app.toClientOperationalDate_('-'), '');
  });

  it('dateTimeMs_ returns 0 when the value is not a date', () => {
    const date = new Date(2026, 0, 1, 12);
    assert.equal(app.dateTimeMs_(date), date.getTime());
    assert.equal(app.dateTimeMs_('kosong'), 0);
  });
});

describe('etdText_', () => {
  it('returns empty for blank values', () => {
    assert.equal(app.etdText_(''), '');
    assert.equal(app.etdText_(null), '');
    assert.equal(app.etdText_(undefined), '');
    assert.equal(app.etdText_('   '), '');
  });

  it('formats Date objects and excel serials as dd/MM/yyyy', () => {
    assert.equal(app.etdText_(new Date(Date.UTC(2026, 7, 20, 16, 0, 0))), '21/08/2026');
    assert.equal(app.etdText_(46000), '09/12/2025');
  });

  it('normalises ISO and day-first date strings', () => {
    assert.equal(app.etdText_('2026-08-21'), '21/08/2026');
    assert.equal(app.etdText_('2026-08-21T00:00:00'), '21/08/2026');
    assert.equal(app.etdText_('1/2/2026'), '01/02/2026');
  });

  it('normalises javascript Date.toString() leakage from the sheet', () => {
    assert.equal(app.etdText_('Fri Aug 21 2026 00:00:00 GMT+0800 (Waktu Indonesia Tengah)'), '21/08/2026');
  });

  it('keeps free-text notes untouched', () => {
    assert.equal(app.etdText_('Kirim minggu depan'), 'Kirim minggu depan');
    assert.equal(app.etdText_('Aug 21 2026 tanpa penanda'), 'Aug 21 2026 tanpa penanda');
  });
});

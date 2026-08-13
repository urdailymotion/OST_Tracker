'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { formatDate } = require('./helpers/apps-script-mocks');
const { loadCode, plain } = require('./helpers/load-code');
const { loadWithSheets } = require('./helpers/fixtures');

const app = loadCode();
const TIMEZONE = app.CONFIG.TIMEZONE;

function dayKeyOffset(days) {
  return formatDate(new Date(Date.now() + (days * 86400000)), TIMEZONE, 'yyyy-MM-dd');
}

function state(overrides) {
  return Object.assign({ eta: '', source: '', etd: '', status: '', note: '', photoUrl: '' }, overrides || {});
}

describe('notificationComparable_', () => {
  it('compares dates by their calendar day', () => {
    assert.equal(app.notificationComparable_(new Date(Date.UTC(2026, 4, 5, 4))), '2026-05-05');
  });

  it('trims text and flattens empty values', () => {
    assert.equal(app.notificationComparable_('  teks '), 'teks');
    assert.equal(app.notificationComparable_(null), '');
    assert.equal(app.notificationComparable_(undefined), '');
    assert.equal(app.notificationComparable_(new Date('invalid')).length > 0, true);
  });
});

describe('notificationDisplayText_', () => {
  it('shows a dash for empty values', () => {
    assert.equal(app.notificationDisplayText_(''), '-');
    assert.equal(app.notificationDisplayText_(null), '-');
    assert.equal(app.notificationDisplayText_(undefined), '-');
  });

  it('truncates long text to 80 characters', () => {
    const long = 'x'.repeat(100);
    const shown = app.notificationDisplayText_(long);
    assert.equal(shown.length, 80);
    assert.ok(shown.endsWith('...'));
    assert.equal(app.notificationDisplayText_('x'.repeat(80)).length, 80);
  });
});

describe('notificationDisplayDate_ / notificationDateKey_', () => {
  it('formats parsable dates and falls back for the rest', () => {
    assert.equal(app.notificationDisplayDate_('2026-05-05'), '05/05/2026');
    assert.equal(app.notificationDisplayDate_(''), '-');
    assert.equal(app.notificationDateKey_('2026-05-05'), '2026-05-05');
    assert.equal(app.notificationDateKey_('bukan tanggal'), '');
  });
});

describe('notificationMatchesPeriod_', () => {
  it('rejects values without a usable date', () => {
    assert.equal(app.notificationMatchesPeriod_('', 'ALL'), false);
  });

  it('accepts any date for the ALL period', () => {
    assert.equal(app.notificationMatchesPeriod_('2020-01-01', 'ALL'), true);
  });

  it('matches only today for the default period', () => {
    assert.equal(app.notificationMatchesPeriod_(dayKeyOffset(0), 'TODAY'), true);
    assert.equal(app.notificationMatchesPeriod_(dayKeyOffset(-1), 'TODAY'), false);
  });

  it('matches the last seven days inclusive for 7_DAYS', () => {
    assert.equal(app.notificationMatchesPeriod_(dayKeyOffset(0), '7_DAYS'), true);
    assert.equal(app.notificationMatchesPeriod_(dayKeyOffset(-6), '7_DAYS'), true);
    assert.equal(app.notificationMatchesPeriod_(dayKeyOffset(-7), '7_DAYS'), false);
    assert.equal(app.notificationMatchesPeriod_(dayKeyOffset(1), '7_DAYS'), false);
  });
});

describe('read markers', () => {
  it('notificationIsReadBy_ needs a user id and an exact match', () => {
    assert.equal(app.notificationIsReadBy_('u1;u2', 'u2'), true);
    assert.equal(app.notificationIsReadBy_(' u1 ; u2 ', 'u1'), true);
    assert.equal(app.notificationIsReadBy_('u1;u2', 'u3'), false);
    assert.equal(app.notificationIsReadBy_('u1', ''), false);
    assert.equal(app.notificationIsReadBy_('', 'u1'), false);
  });

  it('addNotificationReader_ appends a reader at most once', () => {
    assert.equal(app.addNotificationReader_('', 'u1'), 'u1');
    assert.equal(app.addNotificationReader_('u1', 'u2'), 'u1;u2');
    assert.equal(app.addNotificationReader_('u1;u2', 'u2'), 'u1;u2');
    assert.equal(app.addNotificationReader_(' u1 ; ; u2 ', ''), 'u1;u2');
  });
});

describe('notificationChangeInfo_', () => {
  it('lists every changed field with old and new values', () => {
    const info = app.notificationChangeInfo_(
      state({ eta: '2026-05-05', source: 'LOCAL', status: 'ON PROCESS' }),
      state({ eta: '2026-05-09', source: 'IMPORT', status: 'DELIVERED' })
    );
    assert.deepEqual(plain(info.types), ['ETA', 'SOURCE', 'STATUS']);
    assert.equal(info.summary, 'ETA: 05/05/2026 → 09/05/2026 • SOURCE: LOCAL → IMPORT • STATUS: ON PROCESS → DELIVERED');
  });

  it('reports a photo change without printing the url', () => {
    const info = app.notificationChangeInfo_(state(), state({ photoUrl: 'https://drive/x' }));
    assert.deepEqual(plain(info.types), ['FOTO']);
    assert.equal(info.summary, 'FOTO: bukti baru dilampirkan');
  });

  it('reports notes and etd changes with a dash for empty sides', () => {
    const info = app.notificationChangeInfo_(state(), state({ note: 'catatan', etd: '21/08/2026' }));
    assert.deepEqual(plain(info.types), ['ETD', 'CATATAN']);
    assert.equal(info.summary, 'ETD: - → 21/08/2026 • CATATAN: - → catatan');
  });

  it('ignores changes that only differ by whitespace or date representation', () => {
    const info = app.notificationChangeInfo_(
      state({ note: 'catatan', eta: new Date(Date.UTC(2026, 4, 5, 4)) }),
      state({ note: ' catatan ', eta: '2026-05-05' })
    );
    assert.deepEqual(plain(info.types), ['UPDATE']);
    assert.equal(info.summary, 'Data vendor diperbarui');
  });
});

describe('notificationToClient_', () => {
  it('maps a notification row to the client payload', () => {
    const client = app.notificationToClient_({
      NOTIFICATION_ID: 'N1',
      HISTORY_ID: 'H1',
      RECORD_ID: 'R1',
      CREATED_AT: new Date(Date.UTC(2026, 1, 3, 4, 5, 6)),
      VENDOR_CODE: '100123',
      VENDOR_NAME: 'PT Maju',
      USERNAME: 'pt.maju',
      PO: '4500',
      ITEM: '10',
      PART_NUMBER: 'PN-1',
      CHANGE_TYPES: 'ETA,STATUS',
      CHANGE_SUMMARY: 'ETA berubah',
      NEW_ETA: '2026-05-05',
      NEW_SOURCE: 'LOCAL',
      NEW_ETD: '2026-08-21',
      NEW_STATUS: 'ON PROCESS',
      NEW_NOTE: 'catatan',
      PHOTO_URL: 'https://drive/x',
      READ_BY: 'u-admin'
    }, 'u-admin');
    assert.equal(client.createdAt, '2026-02-03T12:05:06');
    assert.deepEqual(plain(client.changeTypes), ['ETA', 'STATUS']);
    assert.equal(client.newEta, '2026-05-05');
    assert.equal(client.newEtd, '21/08/2026');
    assert.equal(client.isRead, true);
  });

  it('keeps free-text ETA and marks unread for other admins', () => {
    const client = app.notificationToClient_({ NEW_ETA: 'menunggu vendor', READ_BY: 'u-1' }, 'u-2');
    assert.equal(client.newEta, 'menunggu vendor');
    assert.equal(client.isRead, false);
    assert.deepEqual(plain(client.changeTypes), []);
  });
});

describe('notification sheet access', () => {
  const notification = {
    NOTIFICATION_ID: 'N1', HISTORY_ID: 'H1', RECORD_ID: 'R1', CHANGE_TYPES: 'ETA',
    CHANGE_SUMMARY: 'ETA: - → 05/05/2026', NEW_ETA: '2026-05-05', READ_BY: ''
  };

  it('readNotificationRows_ skips blank rows and keeps row numbers', () => {
    const loaded = loadWithSheets({ notifications: [notification, {}, Object.assign({}, notification, { NOTIFICATION_ID: 'N2', HISTORY_ID: 'H2' })] });
    const rows = loaded.readNotificationRows_();
    assert.equal(rows.length, 2);
    assert.equal(rows[0].rowNumber, 2);
    assert.equal(rows[1].obj.NOTIFICATION_ID, 'N2');
  });

  it('readNotificationRows_ returns an empty list when only headers exist', () => {
    assert.deepEqual(plain(loadWithSheets({ notifications: [] }).readNotificationRows_()), []);
  });

  it('updateNotificationFromHistory_ rewrites the change summary of the matching row', () => {
    const loaded = loadWithSheets({ notifications: [notification] });
    const updated = loaded.updateNotificationFromHistory_('H1', { eta: '2026-05-05' }, { eta: '2026-05-09', note: 'revisi' });
    assert.equal(updated, true);
    const stored = loaded.readNotificationRows_()[0].obj;
    assert.equal(stored.CHANGE_TYPES, 'ETA,CATATAN');
    assert.equal(stored.CHANGE_SUMMARY, 'ETA: 05/05/2026 → 09/05/2026 • CATATAN: - → revisi');
    assert.equal(stored.NEW_ETA, '2026-05-09');
    assert.equal(stored.NEW_NOTE, 'revisi');
  });

  it('updateNotificationFromHistory_ reports when nothing matches', () => {
    assert.equal(loadWithSheets({ notifications: [notification] }).updateNotificationFromHistory_('H9', {}, {}), false);
    assert.equal(loadWithSheets({ notifications: [] }).updateNotificationFromHistory_('H1', {}, {}), false);
  });

  it('removeNotificationForHistory_ deletes the matching row only', () => {
    const loaded = loadWithSheets({ notifications: [notification, Object.assign({}, notification, { NOTIFICATION_ID: 'N2', HISTORY_ID: 'H2' })] });
    assert.equal(loaded.removeNotificationForHistory_('H1'), true);
    const rows = loaded.readNotificationRows_();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].obj.HISTORY_ID, 'H2');
    assert.equal(loaded.removeNotificationForHistory_('H1'), false);
  });
});

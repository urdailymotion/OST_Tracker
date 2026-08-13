'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { loadCode, plain } = require('./helpers/load-code');
const { row } = require('./helpers/fixtures');

const app = loadCode();
const COL = app.COL;
const PCOL = app.PCOL;

describe('statusLabel_', () => {
  it('reports Need Update while the row has no update trace', () => {
    assert.equal(app.statusLabel_({}), 'Need Update');
    // A STATUS imported from the excel file is not trusted on its own.
    assert.equal(app.statusLabel_({ [COL.STATUS]: 'ON PROCESS' }), 'Need Update');
  });

  it('uses the stored status once the row has been updated', () => {
    assert.equal(app.statusLabel_({ [COL.LAST_UPDATE]: new Date(), [COL.STATUS]: 'ON PROCESS' }), 'ON PROCESS');
    assert.equal(app.statusLabel_({ [COL.UPDATED_BY]: 'vendor', [COL.STATUS]: ' DELIVERED ' }), 'DELIVERED');
    assert.equal(app.statusLabel_({ [COL.REVISION]: 2, [COL.STATUS]: 'ON PROCESS' }), 'ON PROCESS');
  });

  it('falls back to Updated when the status cell is blank', () => {
    assert.equal(app.statusLabel_({ [COL.LAST_UPDATE]: new Date(), [COL.STATUS]: '  ' }), 'Updated');
  });
});

describe('isReleasedRow_', () => {
  it('accepts release wording', () => {
    ['RELEASE', 'Released', 'FULL RELEASE', 'full released'].forEach((value) => {
      assert.equal(app.isReleasedRow_({ [COL.RELEASE]: value }), true, value);
    });
  });

  it('rejects not-yet-release wording and blanks', () => {
    ['NOT YET RELEASE', 'not released', 'UNRELEASE', 'BELUM RELEASE', 'PENDING RELEASE', 'WAITING RELEASE', '', '   ', 'PARTIAL'].forEach((value) => {
      assert.equal(app.isReleasedRow_({ [COL.RELEASE]: value }), false, JSON.stringify(value));
    });
  });
});

describe('releaseStateForChildren_', () => {
  it('classifies all-release, all-not-release and mixed sets', () => {
    const released = row({ [COL.RELEASE]: 'FULL RELEASE' });
    const notReleased = row({ [COL.RELEASE]: 'NOT YET RELEASE' });
    assert.equal(app.releaseStateForChildren_([released, released]), 'RELEASE');
    assert.equal(app.releaseStateForChildren_([notReleased]), 'NOT_RELEASE');
    assert.equal(app.releaseStateForChildren_([released, notReleased]), 'MIXED');
  });

  it('treats an empty or missing child list as not released', () => {
    assert.equal(app.releaseStateForChildren_([]), 'NOT_RELEASE');
    assert.equal(app.releaseStateForChildren_(null), 'NOT_RELEASE');
  });
});

describe('parentReleaseState_', () => {
  it('prefers the stored release category', () => {
    assert.equal(app.parentReleaseState_({ [PCOL.RELEASE_STATE]: 'mixed' }), 'MIXED');
    assert.equal(app.parentReleaseState_({ [PCOL.RELEASE_STATE]: 'RELEASE' }), 'RELEASE');
    assert.equal(app.parentReleaseState_({ [PCOL.RELEASE_STATE]: 'NOT_RELEASE' }), 'NOT_RELEASE');
  });

  it('derives the state from the release summary when the category is unusable', () => {
    assert.equal(app.parentReleaseState_({ [PCOL.RELEASE_STATE]: 'ENTAH', [PCOL.RELEASE]: 'FULL RELEASE' }), 'RELEASE');
    assert.equal(app.parentReleaseState_({ [PCOL.RELEASE]: 'FULL RELEASE, NOT YET RELEASE' }), 'MIXED');
    assert.equal(app.parentReleaseState_({ [PCOL.RELEASE]: 'NOT YET RELEASE' }), 'NOT_RELEASE');
  });

  it('defaults to not released for empty or missing objects', () => {
    assert.equal(app.parentReleaseState_({}), 'NOT_RELEASE');
    assert.equal(app.parentReleaseState_(null), 'NOT_RELEASE');
  });
});

describe('isDeliveredStatus_', () => {
  it('recognises every closing status wording', () => {
    ['DELIVERED', 'sudah supply', 'Received', 'CLOSED'].forEach((value) => {
      assert.equal(app.isDeliveredStatus_(value), true, value);
    });
  });

  it('rejects open statuses', () => {
    ['ON PROCESS', '', null, 'Need Update'].forEach((value) => {
      assert.equal(app.isDeliveredStatus_(value), false, String(value));
    });
  });
});

describe('parent status helpers', () => {
  it('parentHasUpdate_ detects any update trace', () => {
    assert.equal(app.parentHasUpdate_({}), false);
    assert.equal(app.parentHasUpdate_(null), false);
    assert.equal(app.parentHasUpdate_({ [PCOL.LAST_UPDATE]: new Date() }), true);
    assert.equal(app.parentHasUpdate_({ [PCOL.UPDATED_BY]: 'vendor' }), true);
    assert.equal(app.parentHasUpdate_({ [PCOL.REVISION]: 1 }), true);
  });

  it('parentStatusLabel_ mirrors the line-item behaviour', () => {
    assert.equal(app.parentStatusLabel_({ [PCOL.STATUS]: 'ON PROCESS' }), 'Need Update');
    assert.equal(app.parentStatusLabel_({ [PCOL.REVISION]: 1, [PCOL.STATUS]: 'ON PROCESS' }), 'ON PROCESS');
    assert.equal(app.parentStatusLabel_({ [PCOL.REVISION]: 1 }), 'Updated');
  });
});

describe('state snapshots', () => {
  it('stateFromObj_ normalises the vendor editable fields', () => {
    const state = app.stateFromObj_({
      [COL.ETA]: '2026-05-05',
      [COL.SOURCE]: 'LOCAL',
      [COL.ETD]: new Date(Date.UTC(2026, 7, 20, 16)),
      [COL.STATUS]: 'ON PROCESS',
      [COL.NOTE]: 'catatan',
      [COL.PHOTO_URL]: 'https://drive/x'
    });
    assert.deepEqual(plain(state), {
      eta: '2026-05-05',
      source: 'LOCAL',
      etd: '21/08/2026',
      status: 'ON PROCESS',
      note: 'catatan',
      photoUrl: 'https://drive/x'
    });
  });

  it('stateFromObj_ falls back to empty strings', () => {
    assert.deepEqual(plain(app.stateFromObj_({})), { eta: '', source: '', etd: '', status: '', note: '', photoUrl: '' });
  });

  it('stateFromParentObj_ also carries the photo file id', () => {
    assert.deepEqual(plain(app.stateFromParentObj_({ [PCOL.PHOTO_FILE_ID]: 'file-1' })), {
      eta: '', source: '', etd: '', status: '', note: '', photoUrl: '', photoFileId: 'file-1'
    });
  });
});

describe('buildParentSearchText_', () => {
  it('joins the searchable child columns in lower case', () => {
    const children = [row({ [COL.PO]: '4500', [COL.WO]: 'WO-1', [COL.VENDOR]: '100123 PT Maju', [COL.SLOC]: '' })];
    const text = app.buildParentSearchText_(children);
    assert.ok(text.indexOf('4500') >= 0);
    assert.ok(text.indexOf('wo-1') >= 0);
    assert.ok(text.indexOf('pt maju') >= 0);
    assert.equal(text.indexOf('  '), -1);
  });

  it('handles empty input and caps the length', () => {
    assert.equal(app.buildParentSearchText_([]), '');
    assert.equal(app.buildParentSearchText_(null), '');
    const many = new Array(5000).fill(null).map(() => row({ [COL.DESC]: 'deskripsi panjang sekali' }));
    assert.equal(app.buildParentSearchText_(many).length, 45000);
  });
});

describe('parentHistoryRecordObj_', () => {
  it('summarises the parent as a single history record', () => {
    const obj = app.parentHistoryRecordObj_({
      [PCOL.ID]: 'PO-1', [PCOL.PO]: '4500', [PCOL.VENDOR_CODE]: '100123', [PCOL.VENDOR_NAME]: 'PT Maju', [PCOL.ITEM_COUNT]: 7
    }, 3);
    assert.equal(obj[COL.ID], 'PO-1');
    assert.equal(obj[COL.ITEM], 'ALL (3)');
    assert.equal(obj[COL.PART], '3 LINE ITEMS');
    assert.equal(obj[COL.VENDOR_CODE], '100123');
  });

  it('falls back to the stored item count and to zero', () => {
    assert.equal(app.parentHistoryRecordObj_({ [PCOL.ITEM_COUNT]: 7 }, 0)[COL.ITEM], 'ALL (7)');
    assert.equal(app.parentHistoryRecordObj_({}, 0)[COL.ITEM], 'ALL (0)');
  });
});

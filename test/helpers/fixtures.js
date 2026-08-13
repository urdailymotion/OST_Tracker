'use strict';

const { FakeSheet, FakeSpreadsheet } = require('./apps-script-mocks');
const { loadCode } = require('./load-code');

const SHEETS = {
  DB: 'OUTSTANDING',
  PARENT: 'OUTSTANDING_PO',
  USERS: 'USERS',
  HISTORY: 'HISTORY',
  NOTIFICATIONS: 'NOTIFICATIONS',
  SETTINGS: 'SETTINGS'
};

/** Turns plain objects into sheet rows ordered by the given headers. */
function sheetValues(headers, objects) {
  return [headers.slice()].concat((objects || []).map(function (obj) {
    return headers.map(function (header) {
      return obj[header] === undefined ? '' : obj[header];
    });
  }));
}

function sheet(name, headers, objects) {
  return new FakeSheet(name, sheetValues(headers, objects));
}

/**
 * Loads Code.gs against a spreadsheet pre-populated with the given rows.
 * `data` keys are sheet aliases (db, parent, users, history, notifications).
 */
function loadWithSheets(data) {
  data = data || {};
  const app = loadCode();
  const config = app.CONFIG;
  const specs = [
    ['db', SHEETS.DB, config.DB_HEADERS],
    ['parent', SHEETS.PARENT, config.PARENT_HEADERS],
    ['users', SHEETS.USERS, config.USERS_HEADERS],
    ['history', SHEETS.HISTORY, config.HISTORY_HEADERS],
    ['notifications', SHEETS.NOTIFICATIONS, config.NOTIFICATION_HEADERS],
    ['settings', SHEETS.SETTINGS, config.SETTINGS_HEADERS]
  ];
  const sheets = specs
    .filter(function (spec) { return data[spec[0]] !== undefined; })
    .map(function (spec) { return sheet(spec[1], spec[2], data[spec[0]]); });
  const spreadsheet = new FakeSpreadsheet(sheets);
  const app2 = loadCode({ spreadsheet: spreadsheet });
  app2.__mocks.scriptProperties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return app2;
}

/** Wraps a plain record object the way readDb_ returns rows. */
function row(obj, rowNumber) {
  return { rowNumber: rowNumber || 2, obj: obj, values: [] };
}

const ADMIN_SESSION = Object.freeze({ userId: 'u-admin', username: 'admin', role: 'ADMIN', vendorCode: '', vendorName: '' });

function vendorSession(vendorCode, vendorName) {
  return { userId: 'u-' + vendorCode, username: 'vendor', role: 'VENDOR', vendorCode: vendorCode, vendorName: vendorName || '' };
}

module.exports = { ADMIN_SESSION, SHEETS, loadWithSheets, row, sheet, sheetValues, vendorSession };

'use strict';

const crypto = require('node:crypto');

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function zoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = {};
  formatter.formatToParts(date).forEach(function (part) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  });
  if (parts.hour === '24') parts.hour = '00';
  return parts;
}

/**
 * Formats a date the way Utilities.formatDate does for the patterns used by Code.gs.
 */
function formatDate(date, timeZone, pattern) {
  const p = zoneParts(date, timeZone);
  const tokens = {
    yyyy: p.year,
    MMM: MONTHS_SHORT[Number(p.month) - 1],
    MM: p.month,
    dd: p.day,
    HH: p.hour,
    mm: p.minute,
    ss: p.second
  };
  let out = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === "'") {
      const end = pattern.indexOf("'", i + 1);
      out += end < 0 ? pattern.slice(i + 1) : pattern.slice(i + 1, end);
      i = end < 0 ? pattern.length : end + 1;
      continue;
    }
    const token = Object.keys(tokens).find(function (key) {
      return pattern.startsWith(key, i);
    });
    if (token) {
      out += tokens[token];
      i += token.length;
      continue;
    }
    out += pattern[i];
    i++;
  }
  return out;
}

/** Apps Script returns signed bytes, mirror that so callers must normalise. */
function computeDigest(_algorithm, text) {
  return Array.from(crypto.createHash('sha256').update(String(text), 'utf8').digest()).map(function (b) {
    return b > 127 ? b - 256 : b;
  });
}

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numColumns; c++) row.push(this.sheet.readCell(this.row + r, this.column + c));
      out.push(row);
    }
    return out;
  }

  getValue() {
    return this.getValues()[0][0];
  }

  getRow() { return this.row; }
  getColumn() { return this.column; }
  getNumRows() { return this.numRows; }
  getNumColumns() { return this.numColumns; }

  getDisplayValues() {
    return this.getValues().map(function (row) {
      return row.map(function (value) { return displayText(value); });
    });
  }

  getDisplayValue() {
    return displayText(this.getValue());
  }

  setValues(values) {
    values.forEach((row, r) => {
      row.forEach((value, c) => {
        this.sheet.writeCell(this.row + r, this.column + c, value);
      });
    });
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  createTextFinder(text) {
    return new FakeTextFinder(this, text);
  }

  createFilter() {
    this.sheet.filter = { remove: () => { this.sheet.filter = null; } };
    return this.sheet.filter;
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  setHorizontalAlignment() { return this; }
  setVerticalAlignment() { return this; }
  setWrap() { return this; }
  setNumberFormat() { return this; }
  setBorder() { return this; }
  clearFormat() { return this; }
  clearContent() {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) this.sheet.writeCell(this.row + r, this.column + c, '');
    }
    return this;
  }
}

class FakeTextFinder {
  constructor(range, text) {
    this.range = range;
    this.text = String(text);
    this.entireCell = false;
  }

  matchEntireCell(flag) {
    this.entireCell = flag !== false;
    return this;
  }

  useRegularExpression() { return this; }
  matchCase() { return this; }

  findAll() {
    const matches = [];
    const values = this.range.getValues();
    values.forEach((row, r) => {
      row.forEach((value, c) => {
        const text = value === null || value === undefined ? '' : String(value);
        const hit = this.entireCell ? text === this.text : text.indexOf(this.text) >= 0;
        if (hit) matches.push(new FakeRange(this.range.sheet, this.range.row + r, this.range.column + c, 1, 1));
      });
    });
    return matches;
  }

  findNext() {
    return this.findAll()[0] || null;
  }
}

class FakeSheet {
  constructor(name, values) {
    this.name = name;
    this.values = (values || []).map(function (row) { return row.slice(); });
    this.frozenRows = 0;
    this.frozenColumns = 0;
    this.filter = null;
  }

  getName() { return this.name; }

  readCell(row, column) {
    const line = this.values[row - 1];
    if (!line) return '';
    const value = line[column - 1];
    return value === undefined ? '' : value;
  }

  writeCell(row, column, value) {
    while (this.values.length < row) this.values.push([]);
    const line = this.values[row - 1];
    while (line.length < column) line.push('');
    line[column - 1] = value;
  }

  getLastRow() {
    for (let i = this.values.length; i > 0; i--) {
      const row = this.values[i - 1] || [];
      if (row.some(function (v) { return v !== '' && v !== null && v !== undefined; })) return i;
    }
    return 0;
  }

  getLastColumn() {
    return this.values.reduce(function (max, row) { return Math.max(max, row.length); }, 0);
  }

  getMaxRows() { return Math.max(this.values.length, 1); }
  getMaxColumns() { return Math.max(this.getLastColumn(), 1); }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows === undefined ? 1 : numRows, numColumns === undefined ? 1 : numColumns);
  }

  getDataRange() {
    return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
  }

  deleteRow(row) {
    this.values.splice(row - 1, 1);
    return this;
  }

  deleteRows(row, count) {
    this.values.splice(row - 1, count);
    return this;
  }

  appendRow(values) {
    const row = this.getLastRow() + 1;
    values.forEach((value, c) => { this.writeCell(row, c + 1, value); });
    return this;
  }

  insertRowsAfter() { return this; }
  clear() { this.values = []; return this; }
  clearContents() { this.values = []; return this; }
  clearFormats() { return this; }
  setFrozenRows(rows) { this.frozenRows = rows; return this; }
  setFrozenColumns(columns) { this.frozenColumns = columns; return this; }
  setRowHeight() { return this; }
  autoResizeColumns() { return this; }
  setColumnWidth() { return this; }
  getFilter() { return this.filter || null; }
  hideColumns() { return this; }
}

class FakeSpreadsheet {
  constructor(sheets) {
    this.sheets = (sheets || []).slice();
  }

  getSheetByName(name) {
    return this.sheets.find(function (sheet) { return sheet.getName() === name; }) || null;
  }

  getSheets() { return this.sheets.slice(); }

  insertSheet(name) {
    const sheet = new FakeSheet(name, []);
    this.sheets.push(sheet);
    return sheet;
  }

  deleteSheet(sheet) {
    this.sheets = this.sheets.filter(function (s) { return s !== sheet; });
  }

  getId() { return 'fake-spreadsheet-id'; }
  setSpreadsheetTimeZone() { return this; }
}

/** Spreadsheet display values are always text; dates render in the app timezone. */
function displayText(value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return formatDate(value, 'Asia/Makassar', 'dd/MM/yyyy HH:mm:ss');
  return String(value);
}

function createProperties() {
  const store = new Map();
  return {
    store: store,
    getProperty: function (key) { return store.has(key) ? store.get(key) : null; },
    getProperties: function () { return Object.fromEntries(store); },
    setProperty: function (key, value) { store.set(key, String(value)); return this; },
    deleteProperty: function (key) { store.delete(key); return this; },
    getKeys: function () { return Array.from(store.keys()); }
  };
}

function createCache() {
  const store = new Map();
  return {
    store: store,
    get: function (key) { return store.has(key) ? store.get(key) : null; },
    put: function (key, value) { store.set(key, value); },
    remove: function (key) { store.delete(key); }
  };
}

/**
 * Builds the Apps Script globals Code.gs expects. Every service is a minimal
 * in-memory fake so the script can be exercised without Google infrastructure.
 */
function createMocks(options) {
  options = options || {};
  const spreadsheet = options.spreadsheet || new FakeSpreadsheet([]);
  const scriptProperties = createProperties();
  const userProperties = createProperties();
  const scriptCache = createCache();
  let uuidCounter = 0;

  return {
    spreadsheet: spreadsheet,
    scriptProperties: scriptProperties,
    scriptCache: scriptCache,
    SpreadsheetApp: {
      openById: function () { return spreadsheet; },
      getActiveSpreadsheet: function () { return spreadsheet; },
      flush: function () {}
    },
    PropertiesService: {
      getScriptProperties: function () { return scriptProperties; },
      getUserProperties: function () { return userProperties; }
    },
    CacheService: {
      getScriptCache: function () { return scriptCache; }
    },
    LockService: {
      getScriptLock: function () {
        return { waitLock: function () { return true; }, releaseLock: function () {}, tryLock: function () { return true; } };
      }
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      getFolderById: function (id) { return createFakeFolder('folder-' + id); },
      getFoldersByName: function () { return { hasNext: function () { return false; } }; },
      createFolder: function (name) { return createFakeFolder(name); }
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
      createTemplateFromFile: function () {
        return {
          evaluate: function () {
            const html = {
              setTitle: function () { return html; },
              addMetaTag: function () { return html; },
              setXFrameOptionsMode: function () { return html; }
            };
            return html;
          }
        };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      formatDate: formatDate,
      computeDigest: computeDigest,
      // Deterministic yet shaped like a real uuid, so token length checks behave as in production.
      getUuid: function () {
        uuidCounter++;
        const hex = crypto.createHash('sha256').update(String(uuidCounter)).digest('hex');
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
      },
      base64Decode: function (text) { return Array.from(Buffer.from(String(text), 'base64')); },
      newBlob: function (bytes, mime, name) {
        return { getBytes: function () { return bytes; }, getContentType: function () { return mime; }, getName: function () { return name; } };
      },
      sleep: function () {}
    },
    Logger: { log: function () {} },
    console: console
  };
}

function createFakeFolder(name) {
  return {
    getName: function () { return name; },
    getId: function () { return 'folder-id'; },
    createFile: function (blob) {
      return {
        getId: function () { return 'file-id'; },
        getUrl: function () { return 'https://drive.google.com/file/d/file-id/view'; },
        setSharing: function () { return this; },
        getName: function () { return blob.getName(); }
      };
    }
  };
}

module.exports = {
  FakeRange,
  FakeSheet,
  FakeSpreadsheet,
  computeDigest,
  createFakeFolder,
  createMocks,
  displayText,
  formatDate
};

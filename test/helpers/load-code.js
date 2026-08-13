'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { createMocks } = require('./apps-script-mocks');

const CODE_PATH = path.join(__dirname, '..', '..', 'Code.gs');
const source = fs.readFileSync(CODE_PATH, 'utf8');

// Top-level const declarations live in the script's lexical scope instead of on
// the sandbox, so copy them over to make them reachable from tests. The suffix
// is appended (never prepended) so coverage keeps pointing at the real lines.
const EXPOSE = ['CONFIG', 'COL', 'PCOL'];
const exposeSuffix = '\n' + EXPOSE.map(function (name) {
  return 'this.' + name + ' = ' + name + ';';
}).join('\n') + '\n';
const script = new vm.Script(source + exposeSuffix, { filename: CODE_PATH });

/**
 * Evaluates Code.gs in a sandbox with the Apps Script services mocked and
 * returns the sandbox, whose properties are the script's globals. Every call
 * gets an isolated set of fakes.
 */
function loadCode(options) {
  const mocks = createMocks(options || {});
  const sandbox = Object.assign({}, mocks);
  // Share the host Date so `value instanceof Date` holds across the sandbox boundary.
  sandbox.Date = Date;
  sandbox.globalThis = sandbox;
  script.runInContext(vm.createContext(sandbox));
  sandbox.__mocks = mocks;
  return sandbox;
}

/**
 * Copies a value produced inside the sandbox into this realm so that
 * assert.deepEqual can compare prototypes as well as structure.
 */
function plain(value) {
  return structuredClone(value);
}

module.exports = { CODE_PATH, loadCode, plain };

/**
 * OUTSTANDING BACKLOG & VENDOR ETA WEB APP
 * Google Apps Script (V7.14.3 Multi-User Turbo + Login/Submenu UI Fix + Database NEW 3 + Vendor Full Visibility)
 * Database source: format OST(2).xlsx supplied by user.
 *
 * IMPORTANT:
 * 1. Bind this script to a Google Spreadsheet.
 * 2. Run setupSystem() once from Apps Script editor.
 * 3. Deploy as Web App: Execute as Me, access according to company policy.
 */

const CONFIG = Object.freeze({
  APP_NAME: 'Outstanding Backlog | Vendor ETA',
  APP_VERSION: 'V7.14.3',
  PARENT_CACHE_KEY: 'OUTSTANDING_PARENT_READY_V714',
  TIMEZONE: 'Asia/Makassar',
  SESSION_SECONDS: 21600,
  SHEETS: {
    DB: 'OUTSTANDING',
    PARENT: 'OUTSTANDING_PO',
    USERS: 'USERS',
    HISTORY: 'HISTORY',
    NOTIFICATIONS: 'NOTIFICATIONS',
    SETTINGS: 'SETTINGS'
  },
  PHOTO_FOLDER_NAME: 'OUTSTANDING_BACKLOG_VENDOR_PHOTOS',
  DEFAULT_ADMIN: {
    username: 'admin'
  },
  GENERATED_PASSWORD_LENGTH: 16,
  LOGIN_MAX_FAILURES: 8,
  LOGIN_LOCK_SECONDS: 900,
  DB_HEADERS: [
    'AGING',
    'TANGGAL PO FULL RELEASE',
    'TARGET SUPPLY',
    'WO',
    'STATUS RELEASED',
    'PO',
    'ITEM',
    'DOCUMENT DATE',
    'PART NUMBER',
    'SHORT TEXT',
    'ORDER QUANTITY',
    'QTY OS',
    'UNIT',
    'NET PRICE',
    'NET VALUE',
    'SLOC',
    'REQUISITIONER',
    'VENDOR',
    'SOURCE STOCK',
    'ETA',
    'KET/ETD\n (Estimasi Barang dikirim)',
    'STATUS',
    'RECORD_ID',
    'VENDOR_CODE',
    'VENDOR_NAME',
    'CATATAN_VENDOR',
    'PHOTO_URL',
    'PHOTO_FILE_ID',
    'LAST_UPDATE',
    'UPDATED_BY',
    'UPDATED_ROLE',
    'REVISION',
    'PARENT_PO_ID'
  ],
  PARENT_HEADERS: [
    'PARENT_PO_ID', 'PO', 'VENDOR_CODE', 'VENDOR_NAME', 'DOCUMENT_DATE',
    'AGING_DAYS', 'PO_FULL_RELEASE_DATE', 'TARGET_SUPPLY_DATE',
    'ITEM_COUNT', 'WO_COUNT', 'PART_COUNT', 'TOTAL_ORDER_QUANTITY', 'TOTAL_QTY_OS',
    'UNIT_SUMMARY', 'TOTAL_NET_VALUE', 'RELEASE_STATUS', 'RELEASE_CATEGORY', 'SLOC_SUMMARY',
    'REQUISITIONER_SUMMARY', 'SOURCE_STOCK', 'ETA', 'ETD_KETERANGAN', 'STATUS',
    'CATATAN_VENDOR', 'PHOTO_URL', 'PHOTO_FILE_ID', 'LAST_UPDATE', 'UPDATED_BY',
    'UPDATED_ROLE', 'REVISION', 'CHILD_RECORD_IDS', 'SEARCH_TEXT', 'CREATED_AT', 'UPDATED_AT'
  ],
  USERS_HEADERS: [
    'USER_ID', 'USERNAME', 'PASSWORD_HASH', 'ROLE', 'VENDOR_CODE',
    'VENDOR_NAME', 'ACTIVE', 'MUST_CHANGE', 'LAST_LOGIN', 'CREATED_AT', 'UPDATED_AT'
  ],
  HISTORY_HEADERS: [
    'HISTORY_ID', 'RECORD_ID', 'ACTION', 'TIMESTAMP', 'USER_ID', 'USERNAME',
    'ROLE', 'VENDOR_CODE', 'PO', 'ITEM', 'PART_NUMBER',
    'OLD_ETA', 'NEW_ETA', 'OLD_SOURCE', 'NEW_SOURCE', 'OLD_ETD', 'NEW_ETD',
    'OLD_STATUS', 'NEW_STATUS', 'OLD_NOTE', 'NEW_NOTE',
    'OLD_PHOTO_URL', 'NEW_PHOTO_URL', 'IS_DELETED'
  ],
  NOTIFICATION_HEADERS: [
    'NOTIFICATION_ID', 'HISTORY_ID', 'RECORD_ID', 'CREATED_AT',
    'VENDOR_CODE', 'VENDOR_NAME', 'USERNAME', 'PO', 'ITEM', 'PART_NUMBER',
    'CHANGE_TYPES', 'CHANGE_SUMMARY', 'NEW_ETA', 'NEW_SOURCE', 'NEW_ETD',
    'NEW_STATUS', 'NEW_NOTE', 'PHOTO_URL', 'READ_BY'
  ],
  SETTINGS_HEADERS: ['KEY', 'VALUE', 'DESCRIPTION']
});

const COL = Object.freeze({
  AGING: 'AGING',
  FULL_RELEASE_DATE: 'TANGGAL PO FULL RELEASE',
  TARGET_SUPPLY: 'TARGET SUPPLY',
  WO: 'WO',
  RELEASE: 'STATUS RELEASED',
  PO: 'PO',
  ITEM: 'ITEM',
  DOC_DATE: 'DOCUMENT DATE',
  PART: 'PART NUMBER',
  DESC: 'SHORT TEXT',
  ORDER_QTY: 'ORDER QUANTITY',
  QTY_OS: 'QTY OS',
  UNIT: 'UNIT',
  NET_PRICE: 'NET PRICE',
  NET_VALUE: 'NET VALUE',
  SLOC: 'SLOC',
  REQUISITIONER: 'REQUISITIONER',
  VENDOR: 'VENDOR',
  SOURCE: 'SOURCE STOCK',
  ETA: 'ETA',
  ETD: 'KET/ETD\n (Estimasi Barang dikirim)',
  STATUS: 'STATUS',
  ID: 'RECORD_ID',
  VENDOR_CODE: 'VENDOR_CODE',
  VENDOR_NAME: 'VENDOR_NAME',
  NOTE: 'CATATAN_VENDOR',
  PHOTO_URL: 'PHOTO_URL',
  PHOTO_FILE_ID: 'PHOTO_FILE_ID',
  LAST_UPDATE: 'LAST_UPDATE',
  UPDATED_BY: 'UPDATED_BY',
  UPDATED_ROLE: 'UPDATED_ROLE',
  REVISION: 'REVISION',
  PARENT_ID: 'PARENT_PO_ID'
});

const PCOL = Object.freeze({
  ID: 'PARENT_PO_ID', PO: 'PO', VENDOR_CODE: 'VENDOR_CODE', VENDOR_NAME: 'VENDOR_NAME',
  DOC_DATE: 'DOCUMENT_DATE', AGING: 'AGING_DAYS', FULL_RELEASE_DATE: 'PO_FULL_RELEASE_DATE', TARGET_SUPPLY: 'TARGET_SUPPLY_DATE', ITEM_COUNT: 'ITEM_COUNT', WO_COUNT: 'WO_COUNT',
  PART_COUNT: 'PART_COUNT', ORDER_QTY: 'TOTAL_ORDER_QUANTITY', QTY_OS: 'TOTAL_QTY_OS',
  UNIT: 'UNIT_SUMMARY', NET_VALUE: 'TOTAL_NET_VALUE', RELEASE: 'RELEASE_STATUS',
  RELEASE_STATE: 'RELEASE_CATEGORY', SLOC: 'SLOC_SUMMARY', REQUISITIONER: 'REQUISITIONER_SUMMARY', SOURCE: 'SOURCE_STOCK',
  ETA: 'ETA', ETD: 'ETD_KETERANGAN', STATUS: 'STATUS', NOTE: 'CATATAN_VENDOR',
  PHOTO_URL: 'PHOTO_URL', PHOTO_FILE_ID: 'PHOTO_FILE_ID', LAST_UPDATE: 'LAST_UPDATE',
  UPDATED_BY: 'UPDATED_BY', UPDATED_ROLE: 'UPDATED_ROLE', REVISION: 'REVISION',
  CHILD_IDS: 'CHILD_RECORD_IDS', SEARCH: 'SEARCH_TEXT', CREATED_AT: 'CREATED_AT', UPDATED_AT: 'UPDATED_AT'
});

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Run once from Apps Script editor, or from the app with an Admin session token. */
function setupSystem(token) {
  requireMaintenanceAccess_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(120000);
  try {
    const ss = getSpreadsheet_();
    ensureSheet_(ss, CONFIG.SHEETS.DB, CONFIG.DB_HEADERS);
    ensureSheet_(ss, CONFIG.SHEETS.PARENT, CONFIG.PARENT_HEADERS);
    ensureSheet_(ss, CONFIG.SHEETS.USERS, CONFIG.USERS_HEADERS);
    ensureSheet_(ss, CONFIG.SHEETS.HISTORY, CONFIG.HISTORY_HEADERS);
    ensureSheet_(ss, CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
    ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, CONFIG.SETTINGS_HEADERS);
    ensureSettings_();
    const adminBootstrap = ensureAdmin_();
    const credentialMigration = migrateCredentialsToPlainTextOnce_();
    const loginRepair = repairPlainLoginRows_();
    normalizeVendorPasswordFlags_();
    ensurePhotoFolder_();
    const parentSync = syncOutstandingParents_({ preserveUpdates: true });
    syncVendorNotificationsFromHistory_();
    formatAllSheets_();
    return {
      ok: true,
      message: 'Sistem outstanding PO berhasil disiapkan.',
      spreadsheetId: ss.getId(),
      adminUsername: adminBootstrap.username || CONFIG.DEFAULT_ADMIN.username,
      adminPassword: adminBootstrap.password || '',
      credentialMigration: credentialMigration,
      loginRepair: loginRepair,
      parentSync: parentSync,
      appVersion: CONFIG.APP_VERSION
    };
  } finally {
    lock.releaseLock();
  }
}

function login(username, password) {
  ensureSystem_();

  const loginKey = normalizeLoginKey_(username);
  const inputPassword = String(password === null || password === undefined ? '' : password);
  const trimmedPassword = inputPassword.trim();

  if (!loginKey || !trimmedPassword) {
    throw new Error('Username dan password wajib diisi.');
  }

  assertLoginNotLocked_(loginKey);

  const userSheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  if (!userSheet) throw new Error('Sheet USERS tidak ditemukan. Jalankan setupSystem().');

  const range = userSheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  if (values.length < 2) {
    throw new Error('Data user belum tersedia. Jalankan setupSystem().');
  }

  const headers = displayValues[0].map(h => String(h || '').trim());
  const idx = indexMap_(headers);
  validateLoginHeaders_(idx);

  const candidates = [];

  for (let i = 1; i < values.length; i++) {
    const rawRow = values[i];
    const displayRow = displayValues[i];

    if (!rawRow.some(v => v !== '' && v !== null)) continue;

    const storedUsername = credentialCellText_(displayRow[idx.USERNAME], rawRow[idx.USERNAME]);
    const vendorCode = credentialCellText_(displayRow[idx.VENDOR_CODE], rawRow[idx.VENDOR_CODE]);
    const vendorName = credentialCellText_(displayRow[idx.VENDOR_NAME], rawRow[idx.VENDOR_NAME]);

    const usernameMatch = normalizeLoginKey_(storedUsername) === loginKey;
    const vendorCodeMatch = vendorCode && normalizeLoginKey_(vendorCode) === loginKey;
    const vendorNameMatch = vendorName && normalizeLoginKey_(vendorName) === loginKey;

    if (!usernameMatch && !vendorCodeMatch && !vendorNameMatch) continue;

    candidates.push({
      rowIndex: i,
      rawRow: rawRow,
      displayRow: displayRow,
      storedUsername: storedUsername,
      vendorCode: vendorCode,
      vendorName: vendorName
    });
  }

  if (!candidates.length) {
    registerLoginFailure_(loginKey);
    throw new Error('Username atau password salah.');
  }

  let inactiveCount = 0;

  for (let c = 0; c < candidates.length; c++) {
    const candidate = candidates[c];
    const row = candidate.rawRow;
    const displayRow = candidate.displayRow;

    if (!toBoolean_(row[idx.ACTIVE])) {
      inactiveCount++;
      continue;
    }

    const userId = credentialCellText_(displayRow[idx.USER_ID], row[idx.USER_ID]);
    const storedPassword = credentialCellText_(displayRow[idx.PASSWORD_HASH], row[idx.PASSWORD_HASH]);
    const storedPasswordTrimmed = storedPassword.trim();

    // Password plain text dibaca persis dari kolom PASSWORD_HASH.
    // Trim hanya dipakai sebagai toleransi saat copy-paste dari Spreadsheet.
    const plainMatch =
      storedPassword === inputPassword ||
      storedPassword === trimmedPassword ||
      storedPasswordTrimmed === inputPassword ||
      storedPasswordTrimmed === trimmedPassword;

    const legacyMatch =
      looksLikeLegacySha256_(storedPasswordTrimmed) &&
      (
        legacyHashPassword_(inputPassword, userId) === storedPasswordTrimmed ||
        legacyHashPassword_(trimmedPassword, userId) === storedPasswordTrimmed
      );

    // Jangan langsung gagal bila ada username duplikat; lanjutkan ke kandidat berikutnya.
    if (!plainMatch && !legacyMatch) continue;

    // Kompatibilitas hash versi lama: setelah berhasil, simpan password biasa.
    if (legacyMatch) {
      userSheet.getRange(candidate.rowIndex + 1, idx.PASSWORD_HASH + 1)
        .setNumberFormat('@')
        .setValue(trimmedPassword);
      userSheet.getRange(candidate.rowIndex + 1, idx.UPDATED_AT + 1).setValue(new Date());
    }

    const now = new Date();
    userSheet.getRange(candidate.rowIndex + 1, idx.LAST_LOGIN + 1).setValue(now);

    const role = credentialCellText_(displayRow[idx.ROLE], row[idx.ROLE]).toUpperCase() || 'VENDOR';
    const session = {
      userId: userId,
      username: candidate.storedUsername,
      role: role,
      vendorCode: candidate.vendorCode,
      vendorName: candidate.vendorName,
      mustChange: role === 'ADMIN' && toBoolean_(row[idx.MUST_CHANGE]),
      loginAt: now.toISOString(),
      appVersion: CONFIG.APP_VERSION
    };

    clearLoginFailures_(loginKey);
    const token = createSession_(session);
    return {
      ok: true,
      token: token,
      user: session,
      appVersion: CONFIG.APP_VERSION
    };
  }

  if (inactiveCount === candidates.length) {
    throw new Error('Akun tidak aktif. Hubungi admin.');
  }

  registerLoginFailure_(loginKey);
  throw new Error('Username atau password salah.');
}

function logout(token) {
  deleteSession_(token);
  return { ok: true };
}

/** Daftar akun aktif untuk fitur pencarian username pada halaman login. */
function getLoginUserOptions() {
  ensureSystem_();
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const idx = indexMap_(headers);
  return values.slice(1)
    .filter(r => r.some(v => v !== '' && v !== null) && toBoolean_(r[idx.ACTIVE]))
    .map(r => ({
      username: String(r[idx.USERNAME] || ''),
      role: String(r[idx.ROLE] || 'VENDOR').toUpperCase(),
      vendorCode: String(r[idx.VENDOR_CODE] || ''),
      vendorName: String(r[idx.VENDOR_NAME] || '')
    }))
    .filter(x => x.username)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'ADMIN' ? -1 : 1;
      return String(a.vendorName || a.username).localeCompare(String(b.vendorName || b.username));
    });
}

function getBootstrap(token) {
  const session = requireSession_(token);
  const db = readDb_();
  // Admin melihat seluruh data. Vendor melihat seluruh PO miliknya,
  // termasuk Release, Not Release, dan Mixed Release (read-only bila belum full release).
  const accessible = db.rows.filter(r => canAccessRow_(session, r.obj));
  const vendorsMap = {};
  accessible.forEach(r => {
    const code = String(r.obj[COL.VENDOR_CODE] || '');
    const name = String(r.obj[COL.VENDOR_NAME] || '');
    if (code) vendorsMap[code] = name;
  });

  const statuses = uniqueSorted_(accessible.map(r => statusLabel_(r.obj)));
  const sources = uniqueSorted_(accessible.map(r => String(r.obj[COL.SOURCE] || '')).filter(Boolean));
  const vendors = Object.keys(vendorsMap).sort().map(code => ({ code: code, name: vendorsMap[code] }));
  return {
    user: session,
    filters: { vendors: vendors, statuses: statuses, sources: sources },
    statusOptions: [
      'UPDATE VENDOR', 'UPDATED', 'ON PROCESS', 'READY VENDOR', 'READY BALIKPAPAN',
      'IN TRANSIT', 'PARTIAL DELIVERY', 'DELIVERED SITE', 'SUDAH SUPPLY',
      'INDEN PRODUKSI', 'INDEN LUAR NEGERI', 'REVISI PO', 'KENDALA'
    ]
  };
}

function getDashboard(token, filters) {
  const session = requireSession_(token);
  const db = readDb_();
  const rows = filterRows_(db.rows, session, filters || {});
  const now = stripTime_(new Date());

  const poSet = {};
  const vendorSet = {};
  let totalValue = 0;
  let totalQtyOs = 0;
  let updated = 0;
  let overdue = 0;
  let arriving7 = 0;
  let delivered = 0;
  let releasedLines = 0;
  let notReleasedLines = 0;
  const statusMap = {};
  const vendorValueMap = {};
  const sourceMap = {};
  const monthlyMap = {};
  const etaBuckets = {
    'Terlambat': 0,
    '0-7 Hari': 0,
    '8-14 Hari': 0,
    '15-30 Hari': 0,
    '>30 Hari': 0,
    'Belum Ada ETA': 0
  };

  rows.forEach(r => {
    const o = r.obj;
    const po = String(o[COL.PO] || '');
    const vendorCode = String(o[COL.VENDOR_CODE] || '');
    const vendorName = String(o[COL.VENDOR_NAME] || o[COL.VENDOR] || 'Tanpa Vendor');
    if (po) poSet[po] = true;
    if (vendorCode) vendorSet[vendorCode] = true;
    const value = number_(o[COL.NET_VALUE]);
    totalValue += value;
    totalQtyOs += number_(o[COL.QTY_OS]);
    const isReleased = isReleasedRow_(o);
    if (isReleased) releasedLines++;
    else notReleasedLines++;
    if (isReleased && o[COL.LAST_UPDATE]) updated++;

    const status = statusLabel_(o);
    statusMap[status] = (statusMap[status] || 0) + 1;
    if (isReleased && isDeliveredStatus_(status)) delivered++;
    vendorValueMap[vendorName] = (vendorValueMap[vendorName] || 0) + value;
    const source = String(o[COL.SOURCE] || 'KOSONG').trim() || 'KOSONG';
    sourceMap[source] = (sourceMap[source] || 0) + 1;

    const docDate = parseDate_(o[COL.DOC_DATE]);
    if (docDate) {
      const monthKey = Utilities.formatDate(docDate, CONFIG.TIMEZONE, 'yyyy-MM');
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + value;
    }

    if (isReleased) {
      const eta = parseDate_(o[COL.ETA]);
      if (!eta) {
        etaBuckets['Belum Ada ETA']++;
      } else {
        const diff = Math.ceil((stripTime_(eta).getTime() - now.getTime()) / 86400000);
        if (diff < 0) {
          etaBuckets['Terlambat']++;
          if (!isDeliveredStatus_(status)) overdue++;
        } else if (diff <= 7) {
          etaBuckets['0-7 Hari']++;
          if (!isDeliveredStatus_(status)) arriving7++;
        } else if (diff <= 14) {
          etaBuckets['8-14 Hari']++;
        } else if (diff <= 30) {
          etaBuckets['15-30 Hari']++;
        } else {
          etaBuckets['>30 Hari']++;
        }
      }
    }
  });

  const topVendor = objectEntriesSorted_(vendorValueMap, true).slice(0, 10);
  const statusSeries = objectEntriesSorted_(statusMap, false).slice(0, 12);
  const sourceSeries = objectEntriesSorted_(sourceMap, false).slice(0, 12);
  const monthlySeries = Object.keys(monthlyMap).sort().map(k => ({ label: k, value: monthlyMap[k] }));

  return {
    cards: {
      totalLines: rows.length,
      totalPO: Object.keys(poSet).length,
      totalVendors: Object.keys(vendorSet).length,
      totalValue: totalValue,
      totalQtyOs: totalQtyOs,
      updated: updated,
      pendingUpdate: Math.max(0, releasedLines - updated),
      overdue: overdue,
      arriving7: arriving7,
      delivered: delivered,
      releasedLines: releasedLines,
      notReleasedLines: notReleasedLines,
      releaseRate: rows.length ? Math.round((releasedLines / rows.length) * 1000) / 10 : 0,
      responseRate: releasedLines ? Math.round((updated / releasedLines) * 1000) / 10 : 0
    },
    charts: {
      status: statusSeries,
      vendorValue: topVendor,
      source: sourceSeries,
      monthly: monthlySeries,
      release: [
        { label: 'Release', value: releasedLines },
        { label: 'Belum Release', value: notReleasedLines }
      ],
      etaBucket: Object.keys(etaBuckets).map(k => ({ label: k, value: etaBuckets[k] }))
    },
    latestUpdates: rows
      .filter(r => r.obj[COL.LAST_UPDATE])
      .sort((a, b) => dateTimeMs_(b.obj[COL.LAST_UPDATE]) - dateTimeMs_(a.obj[COL.LAST_UPDATE]))
      .slice(0, 8)
      .map(rowToClient_)
  };
}

function getOutstanding(token, params) {
  const session = requireSession_(token);
  params = params || {};
  ensureParentData_();

  // Filter Outstanding cukup membaca sheet ringkasan PO.
  // SEARCH_TEXT menyimpan WO, item, PN, deskripsi, SLOC, dan requisitioner,
  // sehingga klik Cari tidak perlu membaca ulang seluruh line item.
  const parentDb = readParentDb_();
  const filters = params.filters || params || {};
  const search = String(filters.search || '').trim().toLowerCase();
  const vendor = session.role === 'ADMIN' ? String(filters.vendor || '').trim() : String(session.vendorCode || '');
  const status = String(filters.status || '').trim();
  const etaState = String(filters.etaState || '').trim();
  const source = String(filters.source || '').trim();
  const releaseState = String(filters.releaseState || '').trim().toUpperCase();
  const today = stripTime_(new Date());

  let rows = parentDb.rows.filter(function(r) {
    const o = r.obj;
    if (!canAccessParent_(session, o)) return false;
    if (vendor && String(o[PCOL.VENDOR_CODE] || '') !== vendor) return false;
    if (status && parentStatusLabel_(o) !== status) return false;
    if (source && String(o[PCOL.SOURCE] || '') !== source) return false;

    const rowReleaseState = parentReleaseState_(o);
    if (releaseState && rowReleaseState !== releaseState) return false;

    const eta = parseDate_(o[PCOL.ETA]);
    const statusText = parentStatusLabel_(o);
    const hasUpdate = parentHasUpdate_(o);
    if (etaState === 'PENDING_UPDATE' && hasUpdate) return false;
    if (etaState === 'UPDATED' && !hasUpdate) return false;
    if (etaState === 'NO_ETA' && eta) return false;
    if (etaState === 'OVERDUE' && (!eta || stripTime_(eta) >= today || isDeliveredStatus_(statusText))) return false;
    if (etaState === 'NEXT_7_DAYS') {
      if (!eta) return false;
      const diff = Math.ceil((stripTime_(eta).getTime() - today.getTime()) / 86400000);
      if (diff < 0 || diff > 7 || isDeliveredStatus_(statusText)) return false;
    }

    if (search) {
      const hay = [
        o[PCOL.PO], o[PCOL.VENDOR_CODE], o[PCOL.VENDOR_NAME],
        o[PCOL.RELEASE], rowReleaseState, o[PCOL.ETD],
        o[PCOL.STATUS], o[PCOL.NOTE], o[PCOL.SEARCH]
      ].join(' ').toLowerCase();
      if (hay.indexOf(search) < 0) return false;
    }
    return true;
  });

  const sortKey = String(params.sortKey || 'LAST_UPDATE');
  const sortDir = String(params.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  rows.sort(function(a, b) { return compareParentRows_(a.obj, b.obj, sortKey) * sortDir; });

  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize || 25)));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(params.page || 1)));
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize).map(function(r) { return parentRowToClient_(r); });
  return { rows: paged, total: total, page: page, pageSize: pageSize, totalPages: totalPages, dataType: 'PARENT_PO' };
}

function getRecordDetail(token, recordId) {
  const session = requireSession_(token);
  ensureParentData_();
  const resolved = resolveParentRecord_(recordId);
  if (!resolved || !resolved.parent) throw new Error('Data PO tidak ditemukan.');
  if (!canAccessParent_(session, resolved.parent.obj)) throw new Error('Anda tidak memiliki akses ke PO ini.');
  const result = parentRowToClient_(resolved.parent);
  result.children = resolved.children.map(rowToClient_);
  return result;
}

function updateVendorRecord(token, payload) {
  const session = requireSession_(token);
  payload = payload || {};
  const requestedId = String(payload.parentId || payload.recordId || '').trim();
  if (!requestedId) throw new Error('ID PO tidak ditemukan.');

  // V7.14 MULTI-USER TURBO:
  // Tidak memakai ScriptLock global. Tiap vendor dapat menyimpan PO berbeda secara paralel.
  // Update tidak lagi membaca seluruh OUTSTANDING + OUTSTANDING_PO berulang kali.
  ensureParentDataForUpdateFast_();
  const parent = findParentRecordFast_(requestedId);
  if (!parent) throw new Error('Data PO tidak ditemukan.');
  const parentObj = parent.obj;

  if (!canAccessParent_(session, parentObj)) throw new Error('Anda tidak berhak memperbarui PO vendor ini.');
  if (parentReleaseState_(parentObj) !== 'RELEASE') {
    throw new Error('PO Not Release / Mixed Release hanya dapat dilihat. Update vendor tersedia setelah seluruh item berstatus Release.');
  }

  const childCount = Math.max(0, number_(parentObj[PCOL.ITEM_COUNT]));
  if (!childCount) throw new Error('Line item untuk PO ini tidak ditemukan.');

  const oldState = stateFromParentObj_(parentObj);
  let photoUrl = oldState.photoUrl;
  let photoFileId = String(parentObj[PCOL.PHOTO_FILE_ID] || '');

  // Foto diproses sebelum operasi Sheet. Bila Drive sedikit lambat, vendor lain tetap tidak ikut antre.
  if (payload.photoData) {
    const photoRecord = parentHistoryRecordObj_(parentObj, childCount);
    const saved = savePhoto_(payload.photoData, payload.photoName, photoRecord, session);
    photoUrl = saved.url;
    photoFileId = saved.fileId;
  }

  const etaInput = String(payload.eta || '').trim();
  const etaValue = etaInput ? parseDateInput_(etaInput) : oldState.eta;
  const sourceInput = payload.sourceStock === undefined ? '' : String(payload.sourceStock || '').trim();
  const newState = {
    eta: etaValue || '',
    source: sourceInput || oldState.source,
    etd: String(payload.etd || '').trim(),
    status: String(payload.status || '').trim(),
    note: String(payload.note || '').trim(),
    photoUrl: photoUrl || '',
    photoFileId: photoFileId || ''
  };

  const now = new Date();
  const applied = applyStateToParentAndChildren_(String(parentObj[PCOL.ID] || ''), newState, session, {
    incrementRevision: true,
    timestamp: now,
    knownParent: parent
  });

  // Audit tetap disimpan, tetapi tidak ada flush / rebuild database setelah submit.
  const historyRecord = parentHistoryRecordObj_(applied.parent.obj, applied.childCount);
  const historyObj = appendHistory_(historyRecord, oldState, newState, session, 'UPDATE_ETA');
  if (session.role === 'VENDOR') {
    appendVendorNotification_(historyObj, historyRecord, oldState, newState, session);
  }

  return {
    ok: true,
    message: 'Update PO ' + String(parentObj[PCOL.PO] || '') + ' berhasil diterapkan ke ' + applied.childCount + ' line item.',
    record: parentRowToClient_(applied.parent),
    childCount: applied.childCount,
    savedAt: toClientDateTime_(now),
    fastMode: true
  };
}

function deleteOutstandingRecord(token, recordId) {
  const session = requireAdmin_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(120000);
  try {
    ensureParentData_();
    const resolved = resolveParentRecord_(recordId);
    if (!resolved || !resolved.parent) throw new Error('PO tidak ditemukan.');
    const parentObj = resolved.parent.obj;
    const oldState = stateFromParentObj_(parentObj);
    const historyRecord = parentHistoryRecordObj_(parentObj, resolved.children.length);
    appendHistory_(historyRecord, oldState, oldState, session, 'DELETE_RECORD');

    const childSheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.DB);
    resolved.children.map(function(r) { return r.rowNumber; }).sort(function(a, b) { return b - a; }).forEach(function(rowNumber) {
      childSheet.deleteRow(rowNumber);
    });
    const parentSheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.PARENT);
    parentSheet.deleteRow(resolved.parent.rowNumber);
    return {
      ok: true,
      message: 'PO ' + String(parentObj[PCOL.PO] || '') + ' beserta ' + resolved.children.length + ' line item berhasil dihapus.'
    };
  } finally {
    lock.releaseLock();
  }
}

function importExcelData(token, payload) {
  const session = requireAdmin_(token);
  payload = payload || {};
  const sourceHeaders = Array.isArray(payload.headers) ? payload.headers : [];
  const sourceRows = Array.isArray(payload.rows) ? payload.rows : [];
  const mode = String(payload.mode || 'PRESERVE').toUpperCase();
  if (!sourceHeaders.length || !sourceRows.length) throw new Error('File Excel tidak memiliki data.');
  if (sourceRows.length > 20000) throw new Error('Maksimal 20.000 baris per proses import.');

  const sourceMap = {};
  sourceHeaders.forEach(function(h, i) {
    const canonical = canonicalHeader_(h);
    if (canonical) sourceMap[canonical] = i;
  });
  [COL.PO, COL.ITEM, COL.PART, COL.VENDOR].forEach(function(required) {
    if (sourceMap[required] === undefined) throw new Error('Kolom wajib tidak ditemukan: ' + required);
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(120000);
  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.DB);
    const existing = readDb_();
    const preserveMap = {};
    if (mode === 'PRESERVE') {
      existing.rows.forEach(function(r) {
        const hasUpdate = Boolean(r.obj[COL.LAST_UPDATE]) || Boolean(String(r.obj[COL.UPDATED_BY] || '').trim()) || number_(r.obj[COL.REVISION]) > 0;
        if (hasUpdate) preserveMap[String(r.obj[COL.ID])] = r.obj;
      });
    }

    const cleanRows = sourceRows.filter(function(row) {
      if (!Array.isArray(row)) return false;
      const hasAny = row.some(function(v) { return v !== '' && v !== null && v !== undefined; });
      if (!hasAny) return false;
      // Hanya baris transaksi valid yang diimpor. Ini mencegah baris sisa/formula di bawah data
      // (contoh nilai AGING / FULL RELEASE tanpa PO, ITEM, PART NUMBER, VENDOR) menjadi record kosong.
      return [COL.PO, COL.ITEM, COL.PART, COL.VENDOR].every(function(required) {
        const idx = sourceMap[required];
        return idx !== undefined && String(row[idx] === null || row[idx] === undefined ? '' : row[idx]).trim() !== '';
      });
    });
    const skippedRows = Math.max(0, sourceRows.length - cleanRows.length);
    const occurrenceCounter = {};
    const outputRows = cleanRows.map(function(sourceRow) {
      const obj = {};
      CONFIG.DB_HEADERS.forEach(function(h) { obj[h] = ''; });
      Object.keys(sourceMap).forEach(function(canonical) {
        obj[canonical] = normalizeImportValue_(canonical, sourceRow[sourceMap[canonical]]);
      });
      const vendor = parseVendor_(obj[COL.VENDOR]);
      obj[COL.VENDOR_CODE] = vendor.code;
      obj[COL.VENDOR_NAME] = vendor.name;
      const baseKey = recordKey_(obj);
      occurrenceCounter[baseKey] = (occurrenceCounter[baseKey] || 0) + 1;
      obj[COL.ID] = makeRecordId_(obj, occurrenceCounter[baseKey]);
      obj[COL.PARENT_ID] = makeParentPoId_(obj[COL.PO], obj[COL.VENDOR_CODE], obj[COL.VENDOR_NAME]);
      obj[COL.REVISION] = 0;

      const old = preserveMap[String(obj[COL.ID])];
      if (old) {
        [COL.SOURCE, COL.ETA, COL.ETD, COL.STATUS, COL.NOTE, COL.PHOTO_URL, COL.PHOTO_FILE_ID,
          COL.LAST_UPDATE, COL.UPDATED_BY, COL.UPDATED_ROLE, COL.REVISION].forEach(function(h) { obj[h] = old[h]; });
      }
      return CONFIG.DB_HEADERS.map(function(h) { return obj[h]; });
    });

    sheet.clearContents();
    sheet.getRange(1, 1, 1, CONFIG.DB_HEADERS.length).setValues([CONFIG.DB_HEADERS]);
    if (outputRows.length) sheet.getRange(2, 1, outputRows.length, CONFIG.DB_HEADERS.length).setValues(outputRows);
    formatDbSheet_(sheet, outputRows.length + 1);

    const parentSync = syncOutstandingParents_({ preserveUpdates: mode === 'PRESERVE' });
    const newCredentials = syncVendorUsersInternal_();
    appendSystemHistory_(session, 'IMPORT_' + mode, outputRows.length + ' line item / ' + parentSync.parentCount + ' PO');
    return {
      ok: true,
      message: 'Import selesai. ' + outputRows.length + ' line item valid diringkas menjadi ' + parentSync.parentCount + ' PO.' + (skippedRows ? ' ' + skippedRows + ' baris kosong/tidak lengkap dilewati otomatis.' : ''),
      rowCount: outputRows.length,
      parentCount: parentSync.parentCount,
      skippedRows: skippedRows,
      newCredentials: newCredentials
    };
  } finally {
    lock.releaseLock();
  }
}

function getAdminNotificationSummary(token) {
  const session = requireAdmin_(token);
  ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const rows = readNotificationRows_();
  const todayKey = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const todayRows = rows.filter(r => notificationDateKey_(r.obj.CREATED_AT) === todayKey);
  const unreadToday = todayRows.filter(r => !notificationIsReadBy_(r.obj.READ_BY, session.userId)).length;
  const totalUnread = rows.filter(r => !notificationIsReadBy_(r.obj.READ_BY, session.userId)).length;
  const sortedToday = todayRows.slice().sort((a, b) => dateTimeMs_(b.obj.CREATED_AT) - dateTimeMs_(a.obj.CREATED_AT));
  return {
    todayCount: todayRows.length,
    unreadToday: unreadToday,
    totalUnread: totalUnread,
    latestAt: sortedToday.length ? toClientDateTime_(sortedToday[0].obj.CREATED_AT) : ''
  };
}

function getAdminNotifications(token, params) {
  const session = requireAdmin_(token);
  params = params || {};
  const search = String(params.search || '').trim().toLowerCase();
  const period = String(params.period || 'TODAY').toUpperCase();
  const readState = String(params.readState || 'ALL').toUpperCase();
  let rows = readNotificationRows_().filter(r => notificationMatchesPeriod_(r.obj.CREATED_AT, period));

  if (search) {
    rows = rows.filter(r => {
      const o = r.obj;
      return [o.VENDOR_CODE, o.VENDOR_NAME, o.USERNAME, o.PO, o.ITEM, o.PART_NUMBER,
        o.CHANGE_TYPES, o.CHANGE_SUMMARY, o.NEW_SOURCE, o.NEW_ETD, o.NEW_STATUS, o.NEW_NOTE]
        .join(' ').toLowerCase().indexOf(search) >= 0;
    });
  }

  rows = rows.filter(r => {
    const isRead = notificationIsReadBy_(r.obj.READ_BY, session.userId);
    if (readState === 'UNREAD') return !isRead;
    if (readState === 'READ') return isRead;
    return true;
  });

  rows.sort((a, b) => dateTimeMs_(b.obj.CREATED_AT) - dateTimeMs_(a.obj.CREATED_AT));
  const summary = {
    total: rows.length,
    unread: rows.filter(r => !notificationIsReadBy_(r.obj.READ_BY, session.userId)).length,
    vendors: uniqueSorted_(rows.map(r => String(r.obj.VENDOR_CODE || '')).filter(Boolean)).length,
    etaChanges: rows.filter(r => String(r.obj.CHANGE_TYPES || '').split(',').indexOf('ETA') >= 0).length
  };

  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize || 25)));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(params.page || 1)));
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize).map(r => notificationToClient_(r.obj, session.userId)),
    summary: summary,
    total: total,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages
  };
}

function markNotificationRead(token, notificationId) {
  const session = requireAdmin_(token);
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Notifikasi tidak ditemukan.');
  const headers = values[0];
  const idx = indexMap_(headers);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.NOTIFICATION_ID] || '') !== String(notificationId || '')) continue;
    const next = addNotificationReader_(values[i][idx.READ_BY], session.userId);
    sheet.getRange(i + 1, idx.READ_BY + 1).setValue(next);
    return { ok: true, message: 'Notifikasi ditandai sudah dibaca.' };
  }
  throw new Error('Notifikasi tidak ditemukan.');
}

function markAllNotificationsRead(token, params) {
  const session = requireAdmin_(token);
  params = params || {};
  const period = String(params.period || 'TODAY').toUpperCase();
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, count: 0, message: 'Tidak ada notifikasi.' };
  const headers = values[0];
  const idx = indexMap_(headers);
  let changed = 0;
  const readValues = [];
  for (let i = 1; i < values.length; i++) {
    let readBy = values[i][idx.READ_BY];
    if (notificationMatchesPeriod_(values[i][idx.CREATED_AT], period) && !notificationIsReadBy_(readBy, session.userId)) {
      readBy = addNotificationReader_(readBy, session.userId);
      changed++;
    }
    readValues.push([readBy || '']);
  }
  sheet.getRange(2, idx.READ_BY + 1, readValues.length, 1).setValues(readValues);
  return { ok: true, count: changed, message: changed + ' notifikasi ditandai sudah dibaca.' };
}

function getHistory(token, params) {
  const session = requireSession_(token);
  params = params || {};
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.HISTORY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { rows: [], total: 0, page: 1, totalPages: 1, pageSize: 25 };
  const headers = values[0];
  const idx = indexMap_(headers);
  const search = String(params.search || '').trim().toLowerCase();
  const action = String(params.action || '').trim();
  let rows = [];
  for (let i = 1; i < values.length; i++) {
    const o = objectFromRow_(headers, values[i]);
    if (toBoolean_(o.IS_DELETED)) continue;
    if (session.role !== 'ADMIN' && String(o.VENDOR_CODE || '') !== String(session.vendorCode || '')) continue;
    if (action && String(o.ACTION || '') !== action) continue;
    if (search) {
      const hay = [o.PO, o.ITEM, o.PART_NUMBER, o.USERNAME, o.NEW_SOURCE, o.NEW_STATUS, o.NEW_ETD, o.NEW_NOTE].join(' ').toLowerCase();
      if (hay.indexOf(search) < 0) continue;
    }
    rows.push({ rowNumber: i + 1, obj: o });
  }
  rows.sort((a, b) => dateTimeMs_(b.obj.TIMESTAMP) - dateTimeMs_(a.obj.TIMESTAMP));
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize || 25)));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(params.page || 1)));
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize).map(r => historyToClient_(r.obj)),
    total: total,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages
  };
}

function getHistoryDetail(token, historyId) {
  const session = requireSession_(token);
  const found = findHistory_(historyId);
  if (!found) throw new Error('Riwayat tidak ditemukan.');
  if (session.role !== 'ADMIN' && String(found.obj.VENDOR_CODE || '') !== String(session.vendorCode || '')) {
    throw new Error('Anda tidak memiliki akses ke riwayat ini.');
  }
  return historyToClient_(found.obj);
}

function editHistory(token, payload) {
  const session = requireAdmin_(token);
  payload = payload || {};
  const found = findHistory_(payload.historyId);
  if (!found) throw new Error('Riwayat tidak ditemukan.');
  if (toBoolean_(found.obj.IS_DELETED)) throw new Error('Riwayat sudah dihapus.');

  const sheet = found.sheet;
  const headers = found.headers;
  const idx = found.idx;
  const row = found.values.slice();
  row[idx.NEW_ETA] = payload.eta ? parseDateInput_(payload.eta) : '';
  row[idx.NEW_SOURCE] = String(payload.sourceStock || '').trim();
  row[idx.NEW_ETD] = String(payload.etd || '').trim();
  row[idx.NEW_STATUS] = String(payload.status || '').trim();
  row[idx.NEW_NOTE] = String(payload.note || '').trim();
  sheet.getRange(found.rowNumber, 1, 1, headers.length).setValues([row]);

  if (isLatestActiveHistory_(String(found.obj.RECORD_ID), String(found.obj.HISTORY_ID))) {
    applyHistoryStateToMaster_(String(found.obj.RECORD_ID), {
      eta: row[idx.NEW_ETA],
      source: row[idx.NEW_SOURCE],
      etd: row[idx.NEW_ETD],
      status: row[idx.NEW_STATUS],
      note: row[idx.NEW_NOTE],
      photoUrl: row[idx.NEW_PHOTO_URL]
    }, session);
  }
  updateNotificationFromHistory_(String(found.obj.HISTORY_ID), {
    eta: found.obj.OLD_ETA, source: found.obj.OLD_SOURCE, etd: found.obj.OLD_ETD,
    status: found.obj.OLD_STATUS, note: found.obj.OLD_NOTE, photoUrl: found.obj.OLD_PHOTO_URL
  }, {
    eta: row[idx.NEW_ETA], source: row[idx.NEW_SOURCE], etd: row[idx.NEW_ETD],
    status: row[idx.NEW_STATUS], note: row[idx.NEW_NOTE], photoUrl: row[idx.NEW_PHOTO_URL]
  });
  return { ok: true, message: 'Riwayat berhasil diedit.' };
}

function deleteHistory(token, historyId) {
  const session = requireAdmin_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const found = findHistory_(historyId);
    if (!found) throw new Error('Riwayat tidak ditemukan.');
    if (toBoolean_(found.obj.IS_DELETED)) return { ok: true, message: 'Riwayat sudah dihapus.' };
    const recordId = String(found.obj.RECORD_ID || '');
    const wasLatest = isLatestActiveHistory_(recordId, String(found.obj.HISTORY_ID));
    found.sheet.getRange(found.rowNumber, found.idx.IS_DELETED + 1).setValue(true);
    removeNotificationForHistory_(String(found.obj.HISTORY_ID));

    if (wasLatest && recordId && recordId !== 'SYSTEM') {
      const previous = latestActiveHistoryForRecord_(recordId);
      if (previous) {
        applyHistoryStateToMaster_(recordId, {
          eta: previous.obj.NEW_ETA,
          source: previous.obj.NEW_SOURCE,
          etd: previous.obj.NEW_ETD,
          status: previous.obj.NEW_STATUS,
          note: previous.obj.NEW_NOTE,
          photoUrl: previous.obj.NEW_PHOTO_URL
        }, session);
      } else {
        applyHistoryStateToMaster_(recordId, {
          eta: found.obj.OLD_ETA,
          source: found.obj.OLD_SOURCE,
          etd: found.obj.OLD_ETD,
          status: found.obj.OLD_STATUS,
          note: found.obj.OLD_NOTE,
          photoUrl: found.obj.OLD_PHOTO_URL
        }, session);
      }
    }
    return { ok: true, message: 'Riwayat berhasil dihapus.' };
  } finally {
    lock.releaseLock();
  }
}

function getUsers(token) {
  requireAdmin_(token);
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(r => r.some(v => v !== '' && v !== null))
    .map(r => {
      const o = objectFromRow_(headers, r);
      return {
        userId: String(o.USER_ID || ''),
        username: String(o.USERNAME || ''),
        role: String(o.ROLE || ''),
        vendorCode: String(o.VENDOR_CODE || ''),
        vendorName: String(o.VENDOR_NAME || ''),
        active: toBoolean_(o.ACTIVE),
        mustChange: toBoolean_(o.MUST_CHANGE),
        password: String(o.PASSWORD_HASH || ''),
        lastLogin: toClientDateTime_(o.LAST_LOGIN)
      };
    });
}

function saveUser(token, payload) {
  const session = requireAdmin_(token);
  payload = payload || {};
  const role = String(payload.role || 'VENDOR').toUpperCase();
  if (['ADMIN', 'VENDOR'].indexOf(role) < 0) throw new Error('Role tidak valid.');
  let username = String(payload.username || '').trim();
  if (role === 'VENDOR' && !String(payload.vendorCode || '').trim()) throw new Error('Vendor wajib dipilih.');
  if (!username && role === 'VENDOR') {
    username = vendorUsernameBase_(String(payload.vendorName || ''), String(payload.vendorCode || ''));
  }
  if (!username) throw new Error('Username wajib diisi.');

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = indexMap_(headers);
  const targetId = String(payload.userId || '');
  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    const existingUsername = String(values[i][idx.USERNAME] || '').toLowerCase();
    if (existingUsername === username.toLowerCase() && String(values[i][idx.USER_ID] || '') !== targetId) {
      throw new Error('Username sudah digunakan.');
    }
    if (targetId && String(values[i][idx.USER_ID] || '') === targetId) targetRow = i;
  }

  const now = new Date();
  if (targetRow >= 1) {
    const row = values[targetRow].slice();
    row[idx.USERNAME] = username;
    row[idx.ROLE] = role;
    row[idx.VENDOR_CODE] = role === 'VENDOR' ? String(payload.vendorCode || '') : '';
    row[idx.VENDOR_NAME] = role === 'VENDOR' ? String(payload.vendorName || '') : '';
    row[idx.ACTIVE] = payload.active !== false;
    row[idx.UPDATED_AT] = now;
    if (payload.password) {
      row[idx.PASSWORD_HASH] = String(payload.password);
      row[idx.MUST_CHANGE] = false;
    }
    sheet.getRange(targetRow + 1, 1, 1, headers.length).setValues([row]);
  } else {
    const userId = Utilities.getUuid();
    const password = String(payload.password || (role === 'ADMIN'
      ? generatePassword_()
      : defaultVendorPassword_(String(payload.vendorCode || ''), String(payload.vendorName || ''))));
    const obj = {
      USER_ID: userId,
      USERNAME: username,
      PASSWORD_HASH: password,
      ROLE: role,
      VENDOR_CODE: role === 'VENDOR' ? String(payload.vendorCode || '') : '',
      VENDOR_NAME: role === 'VENDOR' ? String(payload.vendorName || '') : '',
      ACTIVE: payload.active !== false,
      MUST_CHANGE: false,
      LAST_LOGIN: '',
      CREATED_AT: now,
      UPDATED_AT: now
    };
    sheet.appendRow(headers.map(h => obj[h] === undefined ? '' : obj[h]));
  }
  appendSystemHistory_(session, 'SAVE_USER', username);
  return { ok: true, message: 'User berhasil disimpan.' };
}

function resetUserPassword(token, userId) {
  const session = requireAdmin_(token);
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = indexMap_(headers);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.USER_ID] || '') !== String(userId)) continue;
    const role = String(values[i][idx.ROLE] || 'VENDOR').toUpperCase();
    const vendorCode = String(values[i][idx.VENDOR_CODE] || '');
    const vendorName = String(values[i][idx.VENDOR_NAME] || '');
    const newPassword = role === 'ADMIN'
      ? generatePassword_()
      : defaultVendorPassword_(vendorCode, vendorName);
    sheet.getRange(i + 1, idx.PASSWORD_HASH + 1).setValue(newPassword);
    sheet.getRange(i + 1, idx.MUST_CHANGE + 1).setValue(false);
    sheet.getRange(i + 1, idx.UPDATED_AT + 1).setValue(new Date());
    appendSystemHistory_(session, 'RESET_PASSWORD', String(values[i][idx.USERNAME] || ''));
    return { ok: true, message: 'Password berhasil direset.', username: String(values[i][idx.USERNAME] || ''), password: newPassword };
  }
  throw new Error('User tidak ditemukan.');
}

function deleteUser(token, userId) {
  const session = requireAdmin_(token);
  if (String(session.userId) === String(userId)) throw new Error('Akun yang sedang digunakan tidak dapat dihapus.');
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const idx = indexMap_(values[0]);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.USER_ID] || '') === String(userId)) {
      const username = String(values[i][idx.USERNAME] || '');
      sheet.deleteRow(i + 1);
      appendSystemHistory_(session, 'DELETE_USER', username);
      return { ok: true, message: 'User berhasil dihapus.' };
    }
  }
  throw new Error('User tidak ditemukan.');
}

function syncVendorUsers(token) {
  requireAdmin_(token);
  const credentials = syncVendorUsersInternal_();
  return { ok: true, created: credentials.length, credentials: credentials };
}

/** Membuat ulang username berbasis nama vendor dan password biasa untuk seluruh vendor. */
function regenerateVendorCredentials(token) {
  const session = requireAdmin_(token);
  const result = regeneratePlainCredentialsInternal_(false);
  appendSystemHistory_(session, 'REGENERATE_VENDOR_CREDENTIALS', result.credentials.length + ' akun vendor diperbarui');
  return {
    ok: true,
    updated: result.credentials.length,
    credentials: result.credentials,
    message: result.credentials.length + ' akun vendor berhasil dibuat ulang.'
  };
}

function changePassword(token, oldPassword, newPassword) {
  const session = requireAdmin_(token);
  oldPassword = String(oldPassword || '');
  newPassword = String(newPassword || '');
  if (newPassword.length < 8) throw new Error('Password baru minimal 8 karakter.');
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = indexMap_(headers);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.USER_ID] || '') !== String(session.userId)) continue;
    const storedPassword = String(values[i][idx.PASSWORD_HASH] || '');
    const oldMatchesPlain = storedPassword === oldPassword;
    const oldMatchesLegacy = looksLikeLegacySha256_(storedPassword) && legacyHashPassword_(oldPassword, String(session.userId)) === storedPassword;
    if (!oldMatchesPlain && !oldMatchesLegacy) throw new Error('Password lama salah.');
    sheet.getRange(i + 1, idx.PASSWORD_HASH + 1).setValue(newPassword);
    sheet.getRange(i + 1, idx.MUST_CHANGE + 1).setValue(false);
    sheet.getRange(i + 1, idx.UPDATED_AT + 1).setValue(new Date());
    session.mustChange = false;
    refreshSession_(token, session);
    return { ok: true, message: 'Password berhasil diubah.' };
  }
  throw new Error('User tidak ditemukan.');
}

// ========================= INTERNAL: SYSTEM =========================

function ensureSystem_() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, CONFIG.SHEETS.DB, CONFIG.DB_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.PARENT, CONFIG.PARENT_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.USERS, CONFIG.USERS_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.HISTORY, CONFIG.HISTORY_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, CONFIG.SETTINGS_HEADERS);
  ensureAdmin_();
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty('SPREADSHEET_ID');
  if (storedId) return SpreadsheetApp.openById(storedId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Spreadsheet belum terhubung. Buka Apps Script dari Google Sheet lalu jalankan setupSystem().');
  props.setProperty('SPREADSHEET_ID', active.getId());
  return active;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const lastCol = sheet.getLastColumn();
  if (sheet.getLastRow() === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getValues()[0];
    const missing = headers.filter(h => current.indexOf(h) < 0);
    if (missing.length) {
      const start = Math.max(lastCol, current.filter(String).length) + 1;
      sheet.getRange(1, start, 1, missing.length).setValues([missing]);
    }
  }
  return sheet;
}

function ensureSettings_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();
  const keys = values.slice(1).map(r => String(r[0] || ''));
  const rows = [];
  if (keys.indexOf('APP_NAME') < 0) rows.push(['APP_NAME', CONFIG.APP_NAME, 'Nama aplikasi']);
  if (keys.indexOf('TIMEZONE') < 0) rows.push(['TIMEZONE', CONFIG.TIMEZONE, 'Zona waktu aplikasi']);
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}

/**
 * Membuat akun admin awal bila belum ada. Password dibuat acak, tidak pernah
 * ditulis di dalam source code. Password hasil generate dikembalikan ke pemanggil
 * dan juga disimpan pada Script Properties agar pemilik script dapat mengambilnya.
 */
function ensureAdmin_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = indexMap_(headers);
  const exists = values.slice(1).some(r => String(r[idx.ROLE] || '').toUpperCase() === 'ADMIN');
  if (exists) return { created: false, username: '', password: '' };
  const now = new Date();
  const userId = Utilities.getUuid();
  const password = generatePassword_();
  const obj = {
    USER_ID: userId,
    USERNAME: CONFIG.DEFAULT_ADMIN.username,
    PASSWORD_HASH: password,
    ROLE: 'ADMIN',
    VENDOR_CODE: '',
    VENDOR_NAME: '',
    ACTIVE: true,
    MUST_CHANGE: true,
    LAST_LOGIN: '',
    CREATED_AT: now,
    UPDATED_AT: now
  };
  sheet.appendRow(headers.map(h => obj[h] === undefined ? '' : obj[h]));
  PropertiesService.getScriptProperties().setProperty('INITIAL_ADMIN_PASSWORD', password);
  return { created: true, username: CONFIG.DEFAULT_ADMIN.username, password: password };
}

/** Password admin awal hanya dapat dibaca pemilik script atau Admin yang sedang login. */
function getInitialAdminPassword(token) {
  requireMaintenanceAccess_(token);
  return {
    ok: true,
    username: CONFIG.DEFAULT_ADMIN.username,
    password: PropertiesService.getScriptProperties().getProperty('INITIAL_ADMIN_PASSWORD') || ''
  };
}

function ensurePhotoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty('PHOTO_FOLDER_ID');
  if (stored) {
    try { return DriveApp.getFolderById(stored); } catch (e) { /* recreate */ }
  }
  const folders = DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.PHOTO_FOLDER_NAME);
  props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

function formatAllSheets_() {
  const ss = getSpreadsheet_();
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  const parentSheet = ss.getSheetByName(CONFIG.SHEETS.PARENT);
  if (dbSheet) formatDbSheet_(dbSheet, dbSheet.getLastRow());
  if (parentSheet) formatParentSheet_(parentSheet, parentSheet.getLastRow());
  [CONFIG.SHEETS.USERS, CONFIG.SHEETS.HISTORY, CONFIG.SHEETS.NOTIFICATIONS, CONFIG.SHEETS.SETTINGS].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    sh.setFrozenRows(1);
    if (sh.getLastColumn()) {
      sh.getRange(1, 1, 1, sh.getLastColumn())
        .setBackground('#7f1d1d').setFontColor('#ffffff').setFontWeight('bold')
        .setHorizontalAlignment('center').setVerticalAlignment('middle');
    }
  });
}

function formatDbSheet_(sheet, lastRow) {
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);
  const lastCol = CONFIG.DB_HEADERS.length;
  sheet.getRange(1, 1, 1, lastCol)
    .setBackground('#7f1d1d').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 42);
  if (lastRow > 1) {
    const idx = indexMap_(CONFIG.DB_HEADERS);
    sheet.getRange(2, idx[COL.AGING] + 1, lastRow - 1, 1).setNumberFormat('0');
    sheet.getRange(2, idx[COL.FULL_RELEASE_DATE] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[COL.TARGET_SUPPLY] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[COL.DOC_DATE] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[COL.ETA] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[COL.NET_PRICE] + 1, lastRow - 1, 2).setNumberFormat('#,##0');
    sheet.getRange(2, idx[COL.LAST_UPDATE] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  }
  const widths = [75,125,115,110,110,110,70,100,130,280,100,90,70,120,130,80,130,260,120,100,260,150,220,110,220,220,250,160,140,120,100,80,190];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  if (sheet.getFilter()) sheet.getFilter().remove();
  if (lastRow >= 1) sheet.getRange(1, 1, Math.max(lastRow, 1), lastCol).createFilter();
}

// ========================= INTERNAL: DATABASE =========================

function readDb_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.DB);
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0] : CONFIG.DB_HEADERS;
  const idx = indexMap_(headers);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    if (!values[i].some(v => v !== '' && v !== null)) continue;
    const obj = objectFromRow_(headers, values[i]);
    rows.push({ rowNumber: i + 1, values: values[i], obj: obj });
  }
  return { sheet: sheet, headers: headers, idx: idx, rows: rows };
}

function rowToClient_(r) {
  const o = r.obj;
  return {
    rowNumber: r.rowNumber,
    recordId: String(o[COL.ID] || ''),
    aging: number_(o[COL.AGING]),
    poFullReleaseDate: toClientOperationalDate_(o[COL.FULL_RELEASE_DATE]),
    targetSupplyDate: toClientOperationalDate_(o[COL.TARGET_SUPPLY]),
    wo: valueText_(o[COL.WO]),
    releaseStatus: valueText_(o[COL.RELEASE]),
    po: valueText_(o[COL.PO]),
    item: valueText_(o[COL.ITEM]),
    documentDate: toClientDate_(o[COL.DOC_DATE]),
    partNumber: valueText_(o[COL.PART]),
    shortText: valueText_(o[COL.DESC]),
    orderQuantity: number_(o[COL.ORDER_QTY]),
    qtyOs: number_(o[COL.QTY_OS]),
    unit: valueText_(o[COL.UNIT]),
    netPrice: number_(o[COL.NET_PRICE]),
    netValue: number_(o[COL.NET_VALUE]),
    sloc: valueText_(o[COL.SLOC]),
    requisitioner: valueText_(o[COL.REQUISITIONER]),
    vendor: valueText_(o[COL.VENDOR]),
    vendorCode: valueText_(o[COL.VENDOR_CODE]),
    vendorName: valueText_(o[COL.VENDOR_NAME]),
    sourceStock: valueText_(o[COL.SOURCE]),
    eta: toClientDate_(o[COL.ETA]) || valueText_(o[COL.ETA]),
    etd: etdText_(o[COL.ETD]),
    status: valueText_(o[COL.STATUS]),
    statusLabel: statusLabel_(o),
    note: valueText_(o[COL.NOTE]),
    photoUrl: valueText_(o[COL.PHOTO_URL]),
    lastUpdate: toClientDateTime_(o[COL.LAST_UPDATE]),
    updatedBy: valueText_(o[COL.UPDATED_BY]),
    updatedRole: valueText_(o[COL.UPDATED_ROLE]),
    revision: number_(o[COL.REVISION])
  };
}

function filterRows_(rows, session, filters) {
  filters = filters || {};
  const search = String(filters.search || '').trim().toLowerCase();
  const vendor = session.role === 'ADMIN' ? String(filters.vendor || '').trim() : String(session.vendorCode || '');
  const status = String(filters.status || '').trim();
  const source = String(filters.source || '').trim();
  const etaState = String(filters.etaState || '').trim();
  const dateFrom = filters.dateFrom ? parseDate_(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? parseDate_(filters.dateTo) : null;
  const today = stripTime_(new Date());

  return rows.filter(r => {
    const o = r.obj;
    if (!canAccessRow_(session, o)) return false;
    if (vendor && String(o[COL.VENDOR_CODE] || '') !== vendor) return false;
    if (status && statusLabel_(o) !== status) return false;
    if (source && String(o[COL.SOURCE] || '') !== source) return false;
    const docDate = parseDate_(o[COL.DOC_DATE]);
    if (dateFrom && (!docDate || stripTime_(docDate) < stripTime_(dateFrom))) return false;
    if (dateTo && (!docDate || stripTime_(docDate) > stripTime_(dateTo))) return false;

    if (etaState) {
      // Kondisi ETA hanya relevan untuk item yang sudah Release dan dapat ditindaklanjuti vendor.
      if (!isReleasedRow_(o)) return false;
      const eta = parseDate_(o[COL.ETA]);
      const statusText = statusLabel_(o);
      if (etaState === 'PENDING_UPDATE' && o[COL.LAST_UPDATE]) return false;
      if (etaState === 'UPDATED' && !o[COL.LAST_UPDATE]) return false;
      if (etaState === 'NO_ETA' && eta) return false;
      if (etaState === 'OVERDUE' && (!eta || stripTime_(eta) >= today || isDeliveredStatus_(statusText))) return false;
      if (etaState === 'NEXT_7_DAYS') {
        if (!eta) return false;
        const diff = Math.ceil((stripTime_(eta).getTime() - today.getTime()) / 86400000);
        if (diff < 0 || diff > 7 || isDeliveredStatus_(statusText)) return false;
      }
    }

    if (search) {
      const hay = [o[COL.WO], o[COL.PO], o[COL.ITEM], o[COL.PART], o[COL.DESC], o[COL.VENDOR], o[COL.ETD], o[COL.STATUS]]
        .join(' ').toLowerCase();
      if (hay.indexOf(search) < 0) return false;
    }
    return true;
  });
}

function compareRows_(a, b, key) {
  switch (key) {
    case 'PO': return String(a[COL.PO] || '').localeCompare(String(b[COL.PO] || ''));
    case 'VENDOR': return String(a[COL.VENDOR_NAME] || '').localeCompare(String(b[COL.VENDOR_NAME] || ''));
    case 'ETA': return dateTimeMs_(a[COL.ETA]) - dateTimeMs_(b[COL.ETA]);
    case 'VALUE': return number_(a[COL.NET_VALUE]) - number_(b[COL.NET_VALUE]);
    case 'DOCUMENT_DATE': return dateTimeMs_(a[COL.DOC_DATE]) - dateTimeMs_(b[COL.DOC_DATE]);
    case 'LAST_UPDATE':
    default: return dateTimeMs_(a[COL.LAST_UPDATE]) - dateTimeMs_(b[COL.LAST_UPDATE]);
  }
}

function canAccessRow_(session, obj) {
  if (session.role === 'ADMIN') return true;
  return String(obj[COL.VENDOR_CODE] || '') === String(session.vendorCode || '');
}

function stateFromObj_(o) {
  return {
    eta: o[COL.ETA] || '',
    source: String(o[COL.SOURCE] || ''),
    etd: etdText_(o[COL.ETD]),
    status: String(o[COL.STATUS] || ''),
    note: String(o[COL.NOTE] || ''),
    photoUrl: String(o[COL.PHOTO_URL] || '')
  };
}

function applyHistoryStateToMaster_(recordId, state, session) {
  ensureParentData_();
  const parentDb = readParentDb_();
  const parent = parentDb.rows.find(function(r) { return String(r.obj[PCOL.ID] || '') === String(recordId || ''); });
  if (parent) {
    applyStateToParentAndChildren_(String(recordId), {
      eta: state.eta || '', source: state.source || '', etd: state.etd || '', status: state.status || '',
      note: state.note || '', photoUrl: state.photoUrl || '', photoFileId: String(parent.obj[PCOL.PHOTO_FILE_ID] || '')
    }, session, { incrementRevision: true, timestamp: new Date() });
    return;
  }

  const db = readDb_();
  const target = db.rows.find(function(r) { return String(r.obj[COL.ID]) === String(recordId); });
  if (!target) return;
  const row = target.values.slice();
  row[db.idx[COL.ETA]] = state.eta || '';
  row[db.idx[COL.SOURCE]] = String(state.source || '').trim() ? state.source : (target.obj[COL.SOURCE] || '');
  row[db.idx[COL.ETD]] = state.etd || '';
  row[db.idx[COL.STATUS]] = state.status || '';
  row[db.idx[COL.NOTE]] = state.note || '';
  row[db.idx[COL.PHOTO_URL]] = state.photoUrl || '';
  row[db.idx[COL.LAST_UPDATE]] = new Date();
  row[db.idx[COL.UPDATED_BY]] = session.username;
  row[db.idx[COL.UPDATED_ROLE]] = session.role;
  row[db.idx[COL.REVISION]] = Math.max(0, number_(target.obj[COL.REVISION])) + 1;
  db.sheet.getRange(target.rowNumber, 1, 1, db.headers.length).setValues([row]);
  syncOutstandingParents_({ preserveUpdates: true });
}

function normalizeImportValue_(header, value) {
  if (value === null || value === undefined) return '';
  if ((header === COL.FULL_RELEASE_DATE || header === COL.TARGET_SUPPLY || header === COL.DOC_DATE || header === COL.ETA) && typeof value === 'number' && value > 20000 && value < 80000) {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  if (header === COL.ETD) return etdText_(value);
  return value;
}

function canonicalHeader_(header) {
  const normalized = normalizeHeader_(header);
  if (!normalized) return '';
  const aliases = {};
  CONFIG.DB_HEADERS.forEach(h => { aliases[normalizeHeader_(h)] = h; });
  aliases['AGING'] = COL.AGING;
  aliases['AGINGDAYS'] = COL.AGING;
  aliases['TANGGALPOFULLRELEASE'] = COL.FULL_RELEASE_DATE;
  aliases['POFULLRELEASEDATE'] = COL.FULL_RELEASE_DATE;
  aliases['FULLRELEASEDATE'] = COL.FULL_RELEASE_DATE;
  aliases['TARGETSUPPLY'] = COL.TARGET_SUPPLY;
  aliases['TARGETSUPPLYDATE'] = COL.TARGET_SUPPLY;
  aliases['DOCUMENTDATE'] = COL.DOC_DATE;
  aliases['PARTNO'] = COL.PART;
  aliases['PARTNUMBER'] = COL.PART;
  aliases['SHORTTEXT'] = COL.DESC;
  aliases['ORDERQTY'] = COL.ORDER_QTY;
  aliases['QTYOUTSTANDING'] = COL.QTY_OS;
  aliases['NETPRICE'] = COL.NET_PRICE;
  aliases['NETVALUE'] = COL.NET_VALUE;
  aliases['SOURCESTOCK'] = COL.SOURCE;
  if (normalized.indexOf('KET/ETD') === 0 || normalized.indexOf('ESTIMASIBARANGDIKIRIM') >= 0) return COL.ETD;
  return aliases[normalized] || '';
}

function normalizeHeader_(v) {
  return String(v || '').toUpperCase().replace(/\s+/g, '').replace(/[._-]/g, '').trim();
}

function parseVendor_(v) {
  const text = String(v || '').trim();
  if (!text) return { code: '', name: '' };
  const match = text.match(/^(\d+)\s*(.*)$/);
  if (!match) return { code: text, name: text };
  return { code: match[1], name: String(match[2] || '').trim() || match[1] };
}

function recordKey_(o) {
  return [o[COL.PO], o[COL.ITEM], o[COL.PART], o[COL.VENDOR_CODE]]
    .map(v => String(v || '').trim()).join('|');
}

function makeRecordId_(o, occurrence) {
  const key = recordKey_(o) + '|DUP-' + String(occurrence || 1);
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8);
  return bytes.slice(0, 12).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').toUpperCase();
}

// ========================= INTERNAL: HISTORY =========================

function appendHistory_(recordObj, oldState, newState, session, action) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.HISTORY);
  const headers = CONFIG.HISTORY_HEADERS;
  const obj = {
    HISTORY_ID: Utilities.getUuid(),
    RECORD_ID: String(recordObj[COL.ID] || ''),
    ACTION: action,
    TIMESTAMP: new Date(),
    USER_ID: session.userId,
    USERNAME: session.username,
    ROLE: session.role,
    VENDOR_CODE: String(recordObj[COL.VENDOR_CODE] || ''),
    PO: recordObj[COL.PO] || '',
    ITEM: recordObj[COL.ITEM] || '',
    PART_NUMBER: recordObj[COL.PART] || '',
    OLD_ETA: oldState.eta || '',
    NEW_ETA: newState.eta || '',
    OLD_SOURCE: oldState.source || '',
    NEW_SOURCE: newState.source || '',
    OLD_ETD: oldState.etd || '',
    NEW_ETD: newState.etd || '',
    OLD_STATUS: oldState.status || '',
    NEW_STATUS: newState.status || '',
    OLD_NOTE: oldState.note || '',
    NEW_NOTE: newState.note || '',
    OLD_PHOTO_URL: oldState.photoUrl || '',
    NEW_PHOTO_URL: newState.photoUrl || '',
    IS_DELETED: false
  };
  sheet.appendRow(headers.map(h => obj[h] === undefined ? '' : obj[h]));
  return obj;
}

function appendSystemHistory_(session, action, note) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.HISTORY);
  const obj = {
    HISTORY_ID: Utilities.getUuid(), RECORD_ID: 'SYSTEM', ACTION: action, TIMESTAMP: new Date(),
    USER_ID: session.userId || '', USERNAME: session.username || '', ROLE: session.role || 'SYSTEM',
    VENDOR_CODE: '', PO: '', ITEM: '', PART_NUMBER: '', OLD_ETA: '', NEW_ETA: '',
    OLD_SOURCE: '', NEW_SOURCE: '', OLD_ETD: '', NEW_ETD: note || '',
    OLD_STATUS: '', NEW_STATUS: action, OLD_NOTE: '', NEW_NOTE: note || '',
    OLD_PHOTO_URL: '', NEW_PHOTO_URL: '', IS_DELETED: false
  };
  sheet.appendRow(CONFIG.HISTORY_HEADERS.map(h => obj[h] === undefined ? '' : obj[h]));
}

function historyToClient_(o) {
  return {
    historyId: String(o.HISTORY_ID || ''),
    recordId: String(o.RECORD_ID || ''),
    action: String(o.ACTION || ''),
    timestamp: toClientDateTime_(o.TIMESTAMP),
    username: String(o.USERNAME || ''),
    role: String(o.ROLE || ''),
    vendorCode: String(o.VENDOR_CODE || ''),
    po: valueText_(o.PO),
    item: valueText_(o.ITEM),
    partNumber: valueText_(o.PART_NUMBER),
    oldEta: toClientDate_(o.OLD_ETA) || valueText_(o.OLD_ETA),
    newEta: toClientDate_(o.NEW_ETA) || valueText_(o.NEW_ETA),
    oldSource: valueText_(o.OLD_SOURCE),
    newSource: valueText_(o.NEW_SOURCE),
    oldEtd: etdText_(o.OLD_ETD),
    newEtd: etdText_(o.NEW_ETD),
    oldStatus: valueText_(o.OLD_STATUS),
    newStatus: valueText_(o.NEW_STATUS),
    oldNote: valueText_(o.OLD_NOTE),
    newNote: valueText_(o.NEW_NOTE),
    oldPhotoUrl: valueText_(o.OLD_PHOTO_URL),
    newPhotoUrl: valueText_(o.NEW_PHOTO_URL)
  };
}

function findHistory_(historyId) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.HISTORY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idx = indexMap_(headers);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.HISTORY_ID] || '') === String(historyId)) {
      return { sheet: sheet, headers: headers, idx: idx, values: values[i], rowNumber: i + 1, obj: objectFromRow_(headers, values[i]) };
    }
  }
  return null;
}

function isLatestActiveHistory_(recordId, historyId) {
  const latest = latestActiveHistoryForRecord_(recordId);
  return latest && String(latest.obj.HISTORY_ID) === String(historyId);
}

function latestActiveHistoryForRecord_(recordId) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.HISTORY);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idx = indexMap_(headers);
  let latest = null;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.RECORD_ID] || '') !== String(recordId)) continue;
    if (toBoolean_(values[i][idx.IS_DELETED])) continue;
    const obj = objectFromRow_(headers, values[i]);
    if (!latest || dateTimeMs_(obj.TIMESTAMP) >= dateTimeMs_(latest.obj.TIMESTAMP)) {
      latest = { rowNumber: i + 1, obj: obj };
    }
  }
  return latest;
}


// ========================= INTERNAL: ADMIN NOTIFICATIONS =========================

function appendVendorNotification_(historyObj, recordObj, oldState, newState, session) {
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const info = notificationChangeInfo_(oldState, newState);
  const obj = {
    NOTIFICATION_ID: Utilities.getUuid(),
    HISTORY_ID: String(historyObj.HISTORY_ID || ''),
    RECORD_ID: String(recordObj[COL.ID] || ''),
    CREATED_AT: historyObj.TIMESTAMP || new Date(),
    VENDOR_CODE: String(recordObj[COL.VENDOR_CODE] || session.vendorCode || ''),
    VENDOR_NAME: String(recordObj[COL.VENDOR_NAME] || session.vendorName || ''),
    USERNAME: String(session.username || ''),
    PO: recordObj[COL.PO] || '',
    ITEM: recordObj[COL.ITEM] || '',
    PART_NUMBER: recordObj[COL.PART] || '',
    CHANGE_TYPES: info.types.join(','),
    CHANGE_SUMMARY: info.summary,
    NEW_ETA: newState.eta || '',
    NEW_SOURCE: newState.source || '',
    NEW_ETD: newState.etd || '',
    NEW_STATUS: newState.status || '',
    NEW_NOTE: newState.note || '',
    PHOTO_URL: newState.photoUrl || '',
    READ_BY: ''
  };
  sheet.appendRow(CONFIG.NOTIFICATION_HEADERS.map(h => obj[h] === undefined ? '' : obj[h]));
  return obj;
}

function syncVendorNotificationsFromHistory_() {
  const ss = getSpreadsheet_();
  const notifSheet = ensureSheet_(ss, CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const historySheet = ss.getSheetByName(CONFIG.SHEETS.HISTORY);
  if (!notifSheet || !historySheet) return 0;

  const notifValues = notifSheet.getDataRange().getValues();
  const notifHeaders = notifValues.length ? notifValues[0] : CONFIG.NOTIFICATION_HEADERS;
  const notifIdx = indexMap_(notifHeaders);
  const existing = {};
  for (let i = 1; i < notifValues.length; i++) {
    const id = String(notifValues[i][notifIdx.HISTORY_ID] || '');
    if (id) existing[id] = true;
  }

  const db = readDb_();
  const dbById = {};
  db.rows.forEach(r => { dbById[String(r.obj[COL.ID] || '')] = r.obj; });
  const parentDb = readParentDb_();
  parentDb.rows.forEach(function(r) {
    const mapped = {};
    mapped[COL.ID] = r.obj[PCOL.ID]; mapped[COL.PO] = r.obj[PCOL.PO];
    mapped[COL.ITEM] = 'ALL ITEMS'; mapped[COL.PART] = String(r.obj[PCOL.ITEM_COUNT] || 0) + ' LINE ITEMS';
    mapped[COL.VENDOR_CODE] = r.obj[PCOL.VENDOR_CODE]; mapped[COL.VENDOR_NAME] = r.obj[PCOL.VENDOR_NAME];
    dbById[String(r.obj[PCOL.ID] || '')] = mapped;
  });

  const historyValues = historySheet.getDataRange().getValues();
  if (historyValues.length < 2) return 0;
  const historyHeaders = historyValues[0];
  const output = [];
  for (let i = 1; i < historyValues.length; i++) {
    const h = objectFromRow_(historyHeaders, historyValues[i]);
    if (String(h.ROLE || '').toUpperCase() !== 'VENDOR') continue;
    if (String(h.ACTION || '') !== 'UPDATE_ETA') continue;
    if (toBoolean_(h.IS_DELETED)) continue;
    if (existing[String(h.HISTORY_ID || '')]) continue;
    const recordObj = dbById[String(h.RECORD_ID || '')] || {};
    const oldState = { eta: h.OLD_ETA, source: h.OLD_SOURCE, etd: h.OLD_ETD, status: h.OLD_STATUS, note: h.OLD_NOTE, photoUrl: h.OLD_PHOTO_URL };
    const newState = { eta: h.NEW_ETA, source: h.NEW_SOURCE, etd: h.NEW_ETD, status: h.NEW_STATUS, note: h.NEW_NOTE, photoUrl: h.NEW_PHOTO_URL };
    const info = notificationChangeInfo_(oldState, newState);
    const obj = {
      NOTIFICATION_ID: Utilities.getUuid(), HISTORY_ID: String(h.HISTORY_ID || ''), RECORD_ID: String(h.RECORD_ID || ''),
      CREATED_AT: h.TIMESTAMP || new Date(), VENDOR_CODE: String(h.VENDOR_CODE || recordObj[COL.VENDOR_CODE] || ''),
      VENDOR_NAME: String(recordObj[COL.VENDOR_NAME] || ''), USERNAME: String(h.USERNAME || ''), PO: h.PO || '', ITEM: h.ITEM || '',
      PART_NUMBER: h.PART_NUMBER || '', CHANGE_TYPES: info.types.join(','), CHANGE_SUMMARY: info.summary,
      NEW_ETA: h.NEW_ETA || '', NEW_SOURCE: h.NEW_SOURCE || '', NEW_ETD: h.NEW_ETD || '', NEW_STATUS: h.NEW_STATUS || '',
      NEW_NOTE: h.NEW_NOTE || '', PHOTO_URL: h.NEW_PHOTO_URL || '', READ_BY: ''
    };
    output.push(CONFIG.NOTIFICATION_HEADERS.map(k => obj[k] === undefined ? '' : obj[k]));
    existing[String(h.HISTORY_ID || '')] = true;
  }
  if (output.length) notifSheet.getRange(notifSheet.getLastRow() + 1, 1, output.length, CONFIG.NOTIFICATION_HEADERS.length).setValues(output);
  return output.length;
}

function readNotificationRows_() {
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    if (!values[i].some(v => v !== '' && v !== null)) continue;
    rows.push({ rowNumber: i + 1, obj: objectFromRow_(headers, values[i]) });
  }
  return rows;
}

function notificationToClient_(o, adminUserId) {
  return {
    notificationId: String(o.NOTIFICATION_ID || ''), historyId: String(o.HISTORY_ID || ''), recordId: String(o.RECORD_ID || ''),
    createdAt: toClientDateTime_(o.CREATED_AT), vendorCode: valueText_(o.VENDOR_CODE), vendorName: valueText_(o.VENDOR_NAME),
    username: valueText_(o.USERNAME), po: valueText_(o.PO), item: valueText_(o.ITEM), partNumber: valueText_(o.PART_NUMBER),
    changeTypes: String(o.CHANGE_TYPES || '').split(',').filter(Boolean), changeSummary: valueText_(o.CHANGE_SUMMARY),
    newEta: toClientDate_(o.NEW_ETA) || valueText_(o.NEW_ETA), newSource: valueText_(o.NEW_SOURCE), newEtd: etdText_(o.NEW_ETD),
    newStatus: valueText_(o.NEW_STATUS), newNote: valueText_(o.NEW_NOTE), photoUrl: valueText_(o.PHOTO_URL),
    isRead: notificationIsReadBy_(o.READ_BY, adminUserId)
  };
}

function notificationChangeInfo_(oldState, newState) {
  const types = [];
  const lines = [];
  function changed(type, oldValue, newValue, formatter) {
    const oldCmp = notificationComparable_(oldValue);
    const newCmp = notificationComparable_(newValue);
    if (oldCmp === newCmp) return;
    types.push(type);
    const oldText = formatter ? formatter(oldValue) : notificationDisplayText_(oldValue);
    const newText = formatter ? formatter(newValue) : notificationDisplayText_(newValue);
    lines.push(type + ': ' + oldText + ' → ' + newText);
  }
  changed('ETA', oldState.eta, newState.eta, notificationDisplayDate_);
  changed('SOURCE', oldState.source, newState.source);
  changed('ETD', oldState.etd, newState.etd);
  changed('STATUS', oldState.status, newState.status);
  changed('CATATAN', oldState.note, newState.note);
  if (notificationComparable_(oldState.photoUrl) !== notificationComparable_(newState.photoUrl)) {
    types.push('FOTO');
    lines.push('FOTO: bukti baru dilampirkan');
  }
  if (!types.length) {
    types.push('UPDATE');
    lines.push('Data vendor diperbarui');
  }
  return { types: types, summary: lines.join(' • ') };
}

function updateNotificationFromHistory_(historyId, oldState, newState) {
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;
  const headers = values[0];
  const idx = indexMap_(headers);
  const info = notificationChangeInfo_(oldState, newState);
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx.HISTORY_ID] || '') !== String(historyId || '')) continue;
    const row = values[i].slice();
    row[idx.CHANGE_TYPES] = info.types.join(',');
    row[idx.CHANGE_SUMMARY] = info.summary;
    row[idx.NEW_ETA] = newState.eta || '';
    row[idx.NEW_SOURCE] = newState.source || '';
    row[idx.NEW_ETD] = newState.etd || '';
    row[idx.NEW_STATUS] = newState.status || '';
    row[idx.NEW_NOTE] = newState.note || '';
    row[idx.PHOTO_URL] = newState.photoUrl || '';
    sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
    return true;
  }
  return false;
}

function removeNotificationForHistory_(historyId) {
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.NOTIFICATIONS, CONFIG.NOTIFICATION_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;
  const idx = indexMap_(values[0]);
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idx.HISTORY_ID] || '') === String(historyId || '')) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function notificationComparable_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return toClientDate_(value);
  return String(value === null || value === undefined ? '' : value).trim();
}

function notificationDisplayText_(value) {
  const text = String(value === null || value === undefined || value === '' ? '-' : value).trim();
  return text.length > 80 ? text.slice(0, 77) + '...' : text;
}

function notificationDisplayDate_(value) {
  const d = parseDate_(value);
  return d ? Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd/MM/yyyy') : '-';
}

function notificationDateKey_(value) {
  const d = parseDate_(value);
  return d ? Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
}

function notificationMatchesPeriod_(value, period) {
  const targetKey = notificationDateKey_(value);
  if (!targetKey) return false;
  if (period === 'ALL') return true;
  const todayKey = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  if (period !== '7_DAYS') return targetKey === todayKey;
  const toDayNumber = key => {
    const parts = String(key).split('-').map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000;
  };
  const diff = toDayNumber(todayKey) - toDayNumber(targetKey);
  return diff >= 0 && diff <= 6;
}

function notificationIsReadBy_(readBy, userId) {
  const target = String(userId || '');
  if (!target) return false;
  return String(readBy || '').split(';').map(x => x.trim()).filter(Boolean).indexOf(target) >= 0;
}

function addNotificationReader_(readBy, userId) {
  const target = String(userId || '').trim();
  const list = String(readBy || '').split(';').map(x => x.trim()).filter(Boolean);
  if (target && list.indexOf(target) < 0) list.push(target);
  return list.join(';');
}

// ========================= INTERNAL: USERS / SESSION =========================

/**
 * Membuat session login baru.
 * V6.1 memanggil fungsi ini tetapi definisinya terlewat, sehingga muncul
 * ReferenceError: createSession_ is not defined setelah username/password cocok.
 */
function createSession_(session) {
  if (!session || !session.userId || !session.username) {
    throw new Error('Data session tidak lengkap.');
  }

  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const nowMs = Date.now();
  const payload = Object.assign({}, session, {
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + (CONFIG.SESSION_SECONDS * 1000)
  });

  saveSessionPayload_(token, payload);
  return token;
}

/** Mengambil dan memvalidasi session untuk seluruh fungsi setelah login. */
function requireSession_(token) {
  const cleanToken = normalizeSessionToken_(token);
  if (!cleanToken) {
    throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
  }

  const key = sessionKey_(cleanToken);
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  let json = cache.get(key);

  // Cache Apps Script dapat terhapus sewaktu-waktu; Script Properties menjadi cadangan.
  if (!json) json = props.getProperty(key);
  if (!json) {
    throw new Error('Sesi login telah berakhir. Silakan login kembali.');
  }

  let session;
  try {
    session = JSON.parse(json);
  } catch (err) {
    deleteSession_(cleanToken);
    throw new Error('Data sesi tidak valid. Silakan login kembali.');
  }

  const expiresAtMs = Number(session.expiresAtMs || 0);
  if (!expiresAtMs || expiresAtMs <= Date.now()) {
    deleteSession_(cleanToken);
    throw new Error('Sesi login telah berakhir. Silakan login kembali.');
  }

  // Pastikan akun masih ada dan aktif. Ini juga mencegah session lama tetap digunakan
  // setelah akun vendor dinonaktifkan atau dihapus dari sheet USERS.
  const currentUser = getActiveUserForSession_(session.userId);
  if (!currentUser) {
    deleteSession_(cleanToken);
    throw new Error('Akun tidak aktif atau sudah dihapus. Silakan hubungi admin.');
  }

  session.username = currentUser.username;
  session.role = currentUser.role;
  session.vendorCode = currentUser.vendorCode;
  session.vendorName = currentUser.vendorName;
  session.mustChange = currentUser.mustChange;

  // Hidupkan kembali cache sesuai sisa waktu session.
  const remainingSeconds = Math.max(1, Math.min(
    CONFIG.SESSION_SECONDS,
    Math.floor((expiresAtMs - Date.now()) / 1000)
  ));
  cache.put(key, JSON.stringify(session), remainingSeconds);

  return session;
}

/** Membatasi fungsi tertentu hanya untuk role ADMIN. */
function requireAdmin_(token) {
  const session = requireSession_(token);
  if (String(session.role || '').toUpperCase() !== 'ADMIN') {
    throw new Error('Fitur ini hanya dapat digunakan Admin.');
  }
  return session;
}

/** Memperbarui isi session yang sudah ada, misalnya setelah ganti password. */
function refreshSession_(token, session) {
  const cleanToken = normalizeSessionToken_(token);
  if (!cleanToken) throw new Error('Token session tidak valid.');

  const key = sessionKey_(cleanToken);
  const props = PropertiesService.getScriptProperties();
  let oldPayload = null;
  const oldJson = props.getProperty(key) || CacheService.getScriptCache().get(key);
  if (oldJson) {
    try { oldPayload = JSON.parse(oldJson); } catch (e) { oldPayload = null; }
  }

  const nowMs = Date.now();
  const payload = Object.assign({}, oldPayload || {}, session || {}, {
    issuedAtMs: oldPayload && oldPayload.issuedAtMs ? oldPayload.issuedAtMs : nowMs,
    expiresAtMs: oldPayload && Number(oldPayload.expiresAtMs) > nowMs
      ? Number(oldPayload.expiresAtMs)
      : nowMs + (CONFIG.SESSION_SECONDS * 1000)
  });

  saveSessionPayload_(cleanToken, payload);
}

function saveSessionPayload_(token, payload) {
  const cleanToken = normalizeSessionToken_(token);
  if (!cleanToken) throw new Error('Token session tidak valid.');

  const json = JSON.stringify(payload);
  const key = sessionKey_(cleanToken);
  const remainingSeconds = Math.max(1, Math.min(
    CONFIG.SESSION_SECONDS,
    Math.floor((Number(payload.expiresAtMs) - Date.now()) / 1000)
  ));

  CacheService.getScriptCache().put(key, json, remainingSeconds);
  PropertiesService.getScriptProperties().setProperty(key, json);
  cleanupExpiredSessions_();
}

function deleteSession_(token) {
  const cleanToken = normalizeSessionToken_(token);
  if (!cleanToken) return;
  const key = sessionKey_(cleanToken);
  CacheService.getScriptCache().remove(key);
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function sessionKey_(token) {
  return 'SESSION_' + token;
}

/**
 * Membatasi fungsi setup / perbaikan / diagnostik. Tanpa penjagaan ini seluruh
 * fungsi global dapat dipanggil siapa pun lewat google.script.run tanpa login.
 * Tanpa token: hanya pemilik script (mis. dijalankan dari editor Apps Script).
 * Dengan token: wajib session Admin yang aktif.
 */
function requireMaintenanceAccess_(token) {
  if (String(token === null || token === undefined ? '' : token).trim()) {
    return requireAdmin_(token);
  }
  const effectiveEmail = userEmail_(Session.getEffectiveUser());
  const activeEmail = userEmail_(Session.getActiveUser());
  if (effectiveEmail && activeEmail && effectiveEmail === activeEmail) {
    return { userId: 'SCRIPT_OWNER', username: activeEmail, role: 'ADMIN' };
  }
  throw new Error('Fungsi ini hanya dapat dijalankan pemilik script atau Admin yang sedang login.');
}

function userEmail_(user) {
  try { return String((user && user.getEmail()) || '').toLowerCase(); } catch (e) { return ''; }
}

// Pembatas percobaan login untuk menahan serangan brute force pada password.
function loginFailureKey_(loginKey) {
  return 'LOGIN_FAIL_' + Utilities.base64EncodeWebSafe(String(loginKey || ''));
}

function loginFailureCount_(loginKey) {
  const raw = CacheService.getScriptCache().get(loginFailureKey_(loginKey));
  return raw ? Number(raw) || 0 : 0;
}

function assertLoginNotLocked_(loginKey) {
  if (loginFailureCount_(loginKey) >= CONFIG.LOGIN_MAX_FAILURES) {
    throw new Error('Percobaan login terlalu banyak. Coba lagi setelah '
      + Math.round(CONFIG.LOGIN_LOCK_SECONDS / 60) + ' menit.');
  }
}

function registerLoginFailure_(loginKey) {
  const cache = CacheService.getScriptCache();
  cache.put(loginFailureKey_(loginKey), String(loginFailureCount_(loginKey) + 1), CONFIG.LOGIN_LOCK_SECONDS);
}

function clearLoginFailures_(loginKey) {
  CacheService.getScriptCache().remove(loginFailureKey_(loginKey));
}

function normalizeSessionToken_(token) {
  const text = String(token || '').trim();
  return /^[A-Za-z0-9_-]{20,200}$/.test(text) ? text : '';
}

function cleanupExpiredSessions_() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const nowMs = Date.now();
  const expiredKeys = [];

  Object.keys(all).forEach(key => {
    if (key.indexOf('SESSION_') !== 0) return;
    try {
      const item = JSON.parse(all[key]);
      if (!item.expiresAtMs || Number(item.expiresAtMs) <= nowMs) expiredKeys.push(key);
    } catch (e) {
      expiredKeys.push(key);
    }
  });

  expiredKeys.forEach(key => props.deleteProperty(key));
}

function getActiveUserForSession_(userId) {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) return null;

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  if (values.length < 2) return null;

  const headers = displayValues[0].map(h => String(h || '').trim());
  const idx = indexMap_(headers);
  validateLoginHeaders_(idx);

  const targetId = String(userId || '').trim();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const displayRow = displayValues[i];
    const rowUserId = credentialCellText_(displayRow[idx.USER_ID], row[idx.USER_ID]);
    if (rowUserId !== targetId) continue;
    if (!toBoolean_(row[idx.ACTIVE])) return null;

    return {
      userId: rowUserId,
      username: credentialCellText_(displayRow[idx.USERNAME], row[idx.USERNAME]),
      role: credentialCellText_(displayRow[idx.ROLE], row[idx.ROLE]).toUpperCase() || 'VENDOR',
      vendorCode: credentialCellText_(displayRow[idx.VENDOR_CODE], row[idx.VENDOR_CODE]),
      vendorName: credentialCellText_(displayRow[idx.VENDOR_NAME], row[idx.VENDOR_NAME]),
      mustChange: toBoolean_(row[idx.MUST_CHANGE])
    };
  }
  return null;
}

/**
 * Diagnostik aman: mengecek header USERS, jumlah akun aktif, dan session engine.
 * Tidak menampilkan password.
 */
function diagnoseLoginSystemV62(token) {
  requireMaintenanceAccess_(token);
  ensureSystem_();
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const headers = displayValues[0].map(h => String(h || '').trim());
  const idx = indexMap_(headers);
  validateLoginHeaders_(idx);

  let totalUsers = 0;
  let activeUsers = 0;
  let adminUsers = 0;
  let vendorUsers = 0;
  let credentialRows = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row.some(v => v !== '' && v !== null)) continue;
    totalUsers++;
    if (toBoolean_(row[idx.ACTIVE])) activeUsers++;
    const role = credentialCellText_(displayValues[i][idx.ROLE], row[idx.ROLE]).toUpperCase();
    if (role === 'ADMIN') adminUsers++;
    if (role === 'VENDOR') vendorUsers++;
    const username = credentialCellText_(displayValues[i][idx.USERNAME], row[idx.USERNAME]);
    const password = credentialCellText_(displayValues[i][idx.PASSWORD_HASH], row[idx.PASSWORD_HASH]);
    if (username && password) credentialRows++;
  }

  // Uji create -> read -> delete session tanpa memakai akun nyata.
  const diagnosticSession = {
    userId: 'DIAGNOSTIC',
    username: 'diagnostic',
    role: 'ADMIN',
    vendorCode: '',
    vendorName: 'Diagnostic',
    mustChange: false,
    loginAt: new Date().toISOString(),
    appVersion: CONFIG.APP_VERSION
  };
  const probeToken = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const payload = Object.assign({}, diagnosticSession, {
    issuedAtMs: Date.now(),
    expiresAtMs: Date.now() + 60000
  });
  saveSessionPayload_(probeToken, payload);
  const stored = PropertiesService.getScriptProperties().getProperty(sessionKey_(probeToken));
  deleteSession_(probeToken);

  return {
    ok: Boolean(stored),
    appVersion: CONFIG.APP_VERSION,
    totalUsers: totalUsers,
    activeUsers: activeUsers,
    adminUsers: adminUsers,
    vendorUsers: vendorUsers,
    credentialRows: credentialRows,
    sessionEngine: stored ? 'OK' : 'FAILED',
    message: stored
      ? 'Database USERS dan session engine siap digunakan.'
      : 'Session engine gagal menyimpan token.'
  };
}


/**
 * Jalankan sekali setelah memasang V6 bila login plain-text masih gagal.
 * Fungsi ini merapikan USERNAME/PASSWORD_HASH, mengubah kolom credential menjadi teks,
 * memperbaiki username duplikat, dan mereset hash lama ke password default.
 */
function repairLoginSystemV6(token) {
  requireMaintenanceAccess_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ensureSystem_();
    const result = repairPlainLoginRows_();
    PropertiesService.getScriptProperties().setProperty('V5_PLAIN_CREDENTIALS_MIGRATED', 'TRUE');
    return {
      ok: true,
      message: 'Login V6 berhasil diperbaiki.',
      appVersion: CONFIG.APP_VERSION,
      repairedRows: result.repairedRows,
      resetLegacyHashes: result.resetLegacyHashes,
      duplicateUsernamesFixed: result.duplicateUsernamesFixed,
      blankCredentialsFixed: result.blankCredentialsFixed
    };
  } finally {
    lock.releaseLock();
  }
}

function repairPlainLoginRows_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) throw new Error('Sheet USERS tidak ditemukan.');

  const range = sheet.getDataRange();
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  if (values.length < 2) {
    return {
      repairedRows: 0,
      resetLegacyHashes: 0,
      duplicateUsernamesFixed: 0,
      blankCredentialsFixed: 0
    };
  }

  const headers = displayValues[0].map(h => String(h || '').trim());
  const idx = indexMap_(headers);
  validateLoginHeaders_(idx);

  const rows = values.slice(1).map(r => {
    const copy = r.slice(0, headers.length);
    while (copy.length < headers.length) copy.push('');
    return copy;
  });

  const usedUsernames = {};
  let repairedRows = 0;
  let resetLegacyHashes = 0;
  let duplicateUsernamesFixed = 0;
  let blankCredentialsFixed = 0;
  const now = new Date();

  rows.forEach((row, offset) => {
    if (!row.some(v => v !== '' && v !== null)) return;

    const displayRow = displayValues[offset + 1] || [];
    const role = credentialCellText_(displayRow[idx.ROLE], row[idx.ROLE]).toUpperCase() || 'VENDOR';
    const vendorCode = credentialCellText_(displayRow[idx.VENDOR_CODE], row[idx.VENDOR_CODE]);
    const vendorName = credentialCellText_(displayRow[idx.VENDOR_NAME], row[idx.VENDOR_NAME]);

    let username = credentialCellText_(displayRow[idx.USERNAME], row[idx.USERNAME]).toLowerCase();
    let password = credentialCellText_(displayRow[idx.PASSWORD_HASH], row[idx.PASSWORD_HASH]);
    let changed = false;

    if (!username) {
      username = role === 'ADMIN'
        ? CONFIG.DEFAULT_ADMIN.username
        : vendorUsernameBase_(vendorName, vendorCode);
      blankCredentialsFixed++;
      changed = true;
    }

    const normalizedUsername = normalizeLoginKey_(username);
    if (usedUsernames[normalizedUsername]) {
      username = role === 'ADMIN'
        ? uniqueUsername_('admin', String(offset + 1), usedUsernames)
        : uniqueVendorUsername_(vendorName, vendorCode, usedUsernames);
      duplicateUsernamesFixed++;
      changed = true;
    } else {
      usedUsernames[normalizedUsername] = true;
      username = normalizedUsername;
    }

    if (!password || looksLikeLegacySha256_(password.trim())) {
      password = role === 'ADMIN'
        ? generatePassword_()
        : defaultVendorPassword_(vendorCode, vendorName);
      if (!credentialCellText_(displayRow[idx.PASSWORD_HASH], row[idx.PASSWORD_HASH])) {
        blankCredentialsFixed++;
      } else {
        resetLegacyHashes++;
      }
      changed = true;
    } else if (password !== password.trim()) {
      password = password.trim();
      changed = true;
    }

    if (credentialCellText_(displayRow[idx.USERNAME], row[idx.USERNAME]) !== username) changed = true;
    if (credentialCellText_(displayRow[idx.PASSWORD_HASH], row[idx.PASSWORD_HASH]) !== password) changed = true;

    row[idx.USERNAME] = username;
    row[idx.PASSWORD_HASH] = password;
    row[idx.ROLE] = role;
    row[idx.VENDOR_CODE] = vendorCode;
    row[idx.VENDOR_NAME] = vendorName;

    if (row[idx.ACTIVE] === '' || row[idx.ACTIVE] === null) {
      row[idx.ACTIVE] = true;
      changed = true;
    }

    if (role === 'VENDOR' && toBoolean_(row[idx.MUST_CHANGE])) {
      row[idx.MUST_CHANGE] = false;
      changed = true;
    }

    if (changed) {
      row[idx.UPDATED_AT] = now;
      repairedRows++;
    }
  });

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Paksa credential dan kode vendor sebagai plain text agar tidak berubah format.
  sheet.getRange(2, idx.USERNAME + 1, Math.max(rows.length, 1), 1).setNumberFormat('@');
  sheet.getRange(2, idx.PASSWORD_HASH + 1, Math.max(rows.length, 1), 1).setNumberFormat('@');
  sheet.getRange(2, idx.VENDOR_CODE + 1, Math.max(rows.length, 1), 1).setNumberFormat('@');
  SpreadsheetApp.flush();

  return {
    repairedRows: repairedRows,
    resetLegacyHashes: resetLegacyHashes,
    duplicateUsernamesFixed: duplicateUsernamesFixed,
    blankCredentialsFixed: blankCredentialsFixed
  };
}

function validateLoginHeaders_(idx) {
  const required = [
    'USER_ID', 'USERNAME', 'PASSWORD_HASH', 'ROLE', 'VENDOR_CODE',
    'VENDOR_NAME', 'ACTIVE', 'MUST_CHANGE', 'LAST_LOGIN', 'UPDATED_AT'
  ];
  const missing = required.filter(h => idx[h] === undefined);
  if (missing.length) {
    throw new Error('Header sheet USERS tidak lengkap: ' + missing.join(', '));
  }
}

function normalizeLoginKey_(value) {
  let text = String(value === null || value === undefined ? '' : value);
  try { text = text.normalize('NFKC'); } catch (e) { /* ignore */ }
  return text
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function credentialCellText_(displayValue, rawValue) {
  const preferred = displayValue !== null && displayValue !== undefined && String(displayValue) !== ''
    ? displayValue
    : rawValue;
  let text = String(preferred === null || preferred === undefined ? '' : preferred);
  try { text = text.normalize('NFKC'); } catch (e) { /* ignore */ }
  return text.replace(/\u00A0/g, ' ').trim();
}

function normalizeVendorPasswordFlags_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) return 0;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  const idx = indexMap_(values[0]);
  let changed = 0;
  for (let i = 1; i < values.length; i++) {
    const role = String(values[i][idx.ROLE] || '').toUpperCase();
    if (role !== 'VENDOR' || !toBoolean_(values[i][idx.MUST_CHANGE])) continue;
    sheet.getRange(i + 1, idx.MUST_CHANGE + 1).setValue(false);
    changed++;
  }
  return changed;
}

function syncVendorUsersInternal_() {
  const db = readDb_();
  const vendorMap = {};
  db.rows.forEach(r => {
    const code = String(r.obj[COL.VENDOR_CODE] || '').trim();
    const name = String(r.obj[COL.VENDOR_NAME] || '').trim();
    if (code) vendorMap[code] = name;
  });

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = indexMap_(headers);
  const existingCode = {};
  const usedUsernames = {};
  values.slice(1).forEach(r => {
    const code = String(r[idx.VENDOR_CODE] || '');
    const username = String(r[idx.USERNAME] || '').trim().toLowerCase();
    if (code) existingCode[code] = true;
    if (username) usedUsernames[username] = true;
  });

  const newRows = [];
  const credentials = [];
  Object.keys(vendorMap).sort().forEach(code => {
    if (existingCode[code]) return;
    const vendorName = vendorMap[code];
    const username = uniqueVendorUsername_(vendorName, code, usedUsernames);
    const password = defaultVendorPassword_(code, vendorName);
    const userId = Utilities.getUuid();
    const now = new Date();
    const obj = {
      USER_ID: userId,
      USERNAME: username,
      PASSWORD_HASH: password,
      ROLE: 'VENDOR',
      VENDOR_CODE: code,
      VENDOR_NAME: vendorName,
      ACTIVE: true,
      MUST_CHANGE: false,
      LAST_LOGIN: '',
      CREATED_AT: now,
      UPDATED_AT: now
    };
    newRows.push(headers.map(h => obj[h] === undefined ? '' : obj[h]));
    credentials.push({ username: username, password: password, vendorCode: code, vendorName: vendorName });
  });
  if (newRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  return credentials;
}

/**
 * Migrasi V5 satu kali. Hash lama tidak dapat dibalik, sehingga seluruh password
 * direset menjadi password biasa yang dapat dibaca pada sheet USERS.
 */
function migrateCredentialsToPlainTextOnce_() {
  const props = PropertiesService.getScriptProperties();
  const key = 'V5_PLAIN_CREDENTIALS_MIGRATED';
  if (props.getProperty(key) === 'TRUE') return { migrated: false, credentials: [] };
  const result = regeneratePlainCredentialsInternal_(true);
  props.setProperty(key, 'TRUE');
  return { migrated: true, credentials: result.credentials };
}

function regeneratePlainCredentialsInternal_(includeAdmin) {
  const db = readDb_();
  const vendorMap = {};
  db.rows.forEach(r => {
    const code = String(r.obj[COL.VENDOR_CODE] || '').trim();
    const name = String(r.obj[COL.VENDOR_NAME] || '').trim();
    if (code) vendorMap[code] = name;
  });

  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idx = indexMap_(headers);
  const rows = values.slice(1).map(r => {
    const copy = r.slice(0, headers.length);
    while (copy.length < headers.length) copy.push('');
    return copy;
  });
  const now = new Date();
  const usedUsernames = {};
  const existingVendorCodes = {};
  const credentials = [];

  // Pertahankan username akun non-vendor yang tidak sedang dimigrasi.
  rows.forEach(r => {
    const role = String(r[idx.ROLE] || '').toUpperCase();
    if (role === 'VENDOR') return;
    if (role === 'ADMIN' && includeAdmin) return;
    const username = String(r[idx.USERNAME] || '').trim().toLowerCase();
    if (username) usedUsernames[username] = true;
  });

  // Admin direset satu kali dengan password acak agar hash lama dapat ditinggalkan.
  if (includeAdmin) {
    let adminNumber = 0;
    rows.forEach(r => {
      const role = String(r[idx.ROLE] || '').toUpperCase();
      if (role !== 'ADMIN') return;
      adminNumber++;
      const base = adminNumber === 1 ? CONFIG.DEFAULT_ADMIN.username : 'admin.' + adminNumber;
      const username = uniqueUsername_(base, String(adminNumber), usedUsernames);
      const password = generatePassword_();
      r[idx.USERNAME] = username;
      r[idx.PASSWORD_HASH] = password;
      r[idx.ACTIVE] = true;
      r[idx.MUST_CHANGE] = false;
      r[idx.UPDATED_AT] = now;
      credentials.push({ username: username, password: password, vendorCode: '', vendorName: 'ADMIN' });
    });
  }

  // Seluruh akun vendor memakai username dari nama vendor dan password biasa.
  rows.forEach(r => {
    const role = String(r[idx.ROLE] || '').toUpperCase();
    if (role !== 'VENDOR') return;
    const code = String(r[idx.VENDOR_CODE] || '').trim();
    const vendorName = String(vendorMap[code] || r[idx.VENDOR_NAME] || '').trim();
    const username = uniqueVendorUsername_(vendorName, code, usedUsernames);
    const password = defaultVendorPassword_(code, vendorName);
    r[idx.USERNAME] = username;
    r[idx.PASSWORD_HASH] = password;
    r[idx.VENDOR_NAME] = vendorName;
    r[idx.ACTIVE] = true;
    r[idx.MUST_CHANGE] = false;
    r[idx.UPDATED_AT] = now;
    if (code) existingVendorCodes[code] = true;
    credentials.push({ username: username, password: password, vendorCode: code, vendorName: vendorName });
  });

  // Tambahkan vendor dari database outstanding yang belum memiliki akun.
  Object.keys(vendorMap).sort().forEach(code => {
    if (existingVendorCodes[code]) return;
    const vendorName = vendorMap[code];
    const username = uniqueVendorUsername_(vendorName, code, usedUsernames);
    const password = defaultVendorPassword_(code, vendorName);
    const obj = {
      USER_ID: Utilities.getUuid(), USERNAME: username, PASSWORD_HASH: password,
      ROLE: 'VENDOR', VENDOR_CODE: code, VENDOR_NAME: vendorName,
      ACTIVE: true, MUST_CHANGE: false, LAST_LOGIN: '', CREATED_AT: now, UPDATED_AT: now
    };
    rows.push(headers.map(h => obj[h] === undefined ? '' : obj[h]));
    credentials.push({ username: username, password: password, vendorCode: code, vendorName: vendorName });
  });

  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return { credentials: credentials };
}

function vendorUsernameBase_(vendorName, vendorCode) {
  let text = String(vendorName || '').trim();
  try { text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { /* Apps Script V8 supports normalize */ }
  text = text.toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
  if (!text) {
    const suffix = String(vendorCode || '0000').replace(/\D/g, '').slice(-4) || '0000';
    text = 'vendor.' + suffix;
  }
  return text.slice(0, 42).replace(/\.$/, '');
}

function uniqueVendorUsername_(vendorName, vendorCode, usedUsernames) {
  const base = vendorUsernameBase_(vendorName, vendorCode);
  const suffix = String(vendorCode || '0000').replace(/\D/g, '').slice(-4) || '0000';
  return uniqueUsername_(base, suffix, usedUsernames);
}

function uniqueUsername_(base, suffix, usedUsernames) {
  let candidate = String(base || 'user').toLowerCase();
  let counter = 1;
  while (usedUsernames[candidate]) {
    candidate = String(base || 'user').toLowerCase() + '.' + String(suffix || counter);
    if (usedUsernames[candidate]) candidate += '.' + counter;
    counter++;
  }
  usedUsernames[candidate] = true;
  return candidate;
}

/**
 * Password awal vendor dibuat acak. Password lama dibuat dari VENDOR_CODE dan
 * VENDOR_NAME sehingga dapat ditebak siapa pun yang melihat daftar vendor pada
 * halaman login. Admin melihat password hasil generate pada menu User.
 */
function defaultVendorPassword_(vendorCode, vendorName) {
  return generatePassword_();
}

/** Password acak untuk akun baru dan reset password. */
function generatePassword_() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const length = Math.max(12, Number(CONFIG.GENERATED_PASSWORD_LENGTH) || 16);
  let entropy = '';
  while (entropy.length < length * 2) entropy += Utilities.getUuid().replace(/-/g, '');
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet.charAt(parseInt(entropy.substr(i * 2, 2), 16) % alphabet.length);
  }
  return out.slice(0, length - 5) + '@' + out.slice(length - 5);
}

function looksLikeLegacySha256_(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function legacyHashPassword_(password, userId) {
  const text = String(userId || '') + '|' + String(password || '');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

// ========================= INTERNAL: PHOTO =========================

function savePhoto_(dataUrl, originalName, recordObj, session) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Format foto tidak valid.');
  const mime = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Ukuran foto setelah kompresi maksimal 5 MB.');
  const ext = mime.indexOf('png') >= 0 ? 'png' : mime.indexOf('webp') >= 0 ? 'webp' : 'jpg';
  const safePo = String(recordObj[COL.PO] || 'NO_PO').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeItem = String(recordObj[COL.ITEM] || 'ITEM').replace(/[^a-zA-Z0-9_-]/g, '');
  const stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
  const filename = [safePo, safeItem, session.vendorCode || session.username, stamp].join('_') + '.' + ext;
  const blob = Utilities.newBlob(bytes, mime, filename);
  const file = ensurePhotoFolder_().createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* Workspace may block public links */ }
  const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  return { fileId: file.getId(), url: url, driveUrl: file.getUrl() };
}

// ========================= INTERNAL: UTILITIES =========================

function indexMap_(headers) {
  const map = {};
  headers.forEach((h, i) => { map[String(h)] = i; });
  return map;
}

function objectFromRow_(headers, row) {
  const o = {};
  headers.forEach((h, i) => { o[h] = row[i]; });
  return o;
}

function parseDateInput_(iso) {
  const text = String(iso || '').trim();
  if (!text) return '';
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Format ETA harus tanggal yang valid.');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function parseDate_(value) {
  if (!value && value !== 0) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value;
  if (typeof value === 'number' && value > 20000 && value < 80000) return new Date(Math.round((value - 25569) * 86400 * 1000));
  const text = String(value).trim();
  if (!text) return null;
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  m = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d;
}

function stripTime_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toClientDate_(value) {
  const d = parseDate_(value);
  return d ? Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
}

function parseOperationalDate_(value) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (!text || text === '-' || text === '735') return null;
  return parseDate_(value);
}

function toClientOperationalDate_(value) {
  const d = parseOperationalDate_(value);
  return d ? Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
}

function toClientDateTime_(value) {
  const d = parseDate_(value);
  return d ? Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss") : '';
}

function dateTimeMs_(value) {
  const d = parseDate_(value);
  return d ? d.getTime() : 0;
}

function number_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = Number(String(v || '').replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
}

function valueText_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return toClientDate_(v);
  return String(v);
}

/**
 * Menormalkan ETD yang terbaca sebagai Date object / string JavaScript
 * (contoh: Fri Aug 21 2026 00:00:00 GMT+0800) menjadi dd/MM/yyyy.
 * Keterangan ETD biasa tetap dipertahankan apa adanya.
 */
function etdText_(value) {
  if (value === null || value === undefined || value === '') return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, 'dd/MM/yyyy');
  }

  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Utilities.formatDate(excelDate, CONFIG.TIMEZONE, 'dd/MM/yyyy');
  }

  const text = String(value).trim();
  if (!text) return '';

  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  m = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3];

  const englishDate = text.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})\b/i);
  if (englishDate && (/\bGMT\b|\bUTC\b|Waktu Indonesia/i.test(text) || /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(text))) {
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const month = months[String(englishDate[1]).toLowerCase()];
    return ('0' + englishDate[2]).slice(-2) + '/' + month + '/' + englishDate[3];
  }

  return text;
}

function toBoolean_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1' || String(v).toUpperCase() === 'YA';
}

function statusLabel_(o) {
  // STATUS dari file import tidak dipakai sebelum ada jejak update vendor/admin.
  // UPDATED_BY/REVISION juga dibaca untuk kompatibilitas data update versi lama
  // yang belum memiliki LAST_UPDATE.
  const hasUpdate = Boolean(o[COL.LAST_UPDATE]) || Boolean(String(o[COL.UPDATED_BY] || '').trim()) || number_(o[COL.REVISION]) > 0;
  if (!hasUpdate) return 'Need Update';
  const status = String(o[COL.STATUS] || '').trim();
  return status || 'Updated';
}

function isReleasedRow_(o) {
  const release = String(o[COL.RELEASE] || '').trim().toUpperCase();
  if (!release) return false;
  // Menerima FULL RELEASE / RELEASED / RELEASE, tetapi menolak NOT YET RELEASE.
  if (/NOT\s*YET|NOT\s*RELEASE|UNRELEASE|BELUM|PENDING|WAIT/.test(release)) return false;
  return release.indexOf('RELEASE') >= 0;
}

function releaseStateForChildren_(children) {
  let released = 0;
  let notReleased = 0;
  (children || []).forEach(function(r) {
    if (isReleasedRow_(r.obj || {})) released++;
    else notReleased++;
  });
  if (released && notReleased) return 'MIXED';
  return released ? 'RELEASE' : 'NOT_RELEASE';
}

function parentReleaseState_(o) {
  const stored = String(o && o[PCOL.RELEASE_STATE] || '').trim().toUpperCase();
  if (stored === 'RELEASE' || stored === 'NOT_RELEASE' || stored === 'MIXED') return stored;

  const raw = String(o && o[PCOL.RELEASE] || '').trim();
  if (!raw) return 'NOT_RELEASE';
  let released = false;
  let notReleased = false;
  raw.split(/\s*,\s*/).filter(Boolean).forEach(function(value) {
    const probe = {};
    probe[COL.RELEASE] = value;
    if (isReleasedRow_(probe)) released = true;
    else notReleased = true;
  });
  if (released && notReleased) return 'MIXED';
  return released ? 'RELEASE' : 'NOT_RELEASE';
}

function buildParentSearchText_(children) {
  const values = [];
  (children || []).forEach(function(r) {
    const o = r.obj || {};
    values.push(
      o[COL.WO], o[COL.PO], o[COL.ITEM], o[COL.PART], o[COL.DESC],
      o[COL.VENDOR], o[COL.VENDOR_CODE], o[COL.VENDOR_NAME],
      o[COL.SLOC], o[COL.REQUISITIONER], o[COL.RELEASE],
      o[COL.AGING], o[COL.FULL_RELEASE_DATE], o[COL.TARGET_SUPPLY]
    );
  });
  return values.map(function(v) { return String(v || '').trim(); }).filter(Boolean).join(' ').toLowerCase().slice(0, 45000);
}

function isDeliveredStatus_(status) {
  const s = String(status || '').toUpperCase();
  return s.indexOf('DELIVERED') >= 0 || s.indexOf('SUDAH SUPPLY') >= 0 || s.indexOf('RECEIVED') >= 0 || s.indexOf('CLOSE') >= 0;
}

function objectEntriesSorted_(obj, byValueDesc) {
  return Object.keys(obj).map(k => ({ label: k, value: obj[k] })).sort((a, b) => {
    return byValueDesc ? b.value - a.value : b.value - a.value;
  });
}

function uniqueSorted_(arr) {
  const map = {};
  arr.forEach(v => { if (v !== '' && v !== null && v !== undefined) map[String(v)] = true; });
  return Object.keys(map).sort();
}

// ========================= V7: PARENT-CHILD PO DATABASE =========================

function rebuildOutstandingParentDatabase(token) {
  requireMaintenanceAccess_(token);
  ensureSystem_();
  const lock = LockService.getScriptLock();
  lock.waitLock(120000);
  try {
    const result = syncOutstandingParents_({ preserveUpdates: true });
    formatAllSheets_();
    return { ok: true, message: 'Database ringkasan PO berhasil dibangun ulang.', result: result };
  } finally {
    lock.releaseLock();
  }
}

function diagnoseParentChildV7(token) {
  requireMaintenanceAccess_(token);
  ensureSystem_();
  ensureParentData_();
  const db = readDb_();
  const parentDb = readParentDb_();
  const children = db.rows;
  const unlinked = children.filter(function(r) { return !String(r.obj[COL.PARENT_ID] || '').trim(); });
  const groups = groupChildrenByParent_(children);
  const orphanParents = parentDb.rows.filter(function(r) { return !(groups[String(r.obj[PCOL.ID] || '')] || []).length; });
  return {
    ok: unlinked.length === 0 && orphanParents.length === 0,
    appVersion: CONFIG.APP_VERSION,
    childCount: children.length,
    childReleasedCount: children.filter(function(r) { return isReleasedRow_(r.obj); }).length,
    childNotReleaseCount: children.filter(function(r) { return !isReleasedRow_(r.obj); }).length,
    parentPoCount: parentDb.rows.length,
    unlinkedChildCount: unlinked.length,
    orphanParentCount: orphanParents.length,
    message: unlinked.length === 0 && orphanParents.length === 0
      ? 'Relasi data PO dan line item valid.'
      : 'Relasi data perlu dibangun ulang melalui rebuildOutstandingParentDatabase().'
  };
}

function readParentDb_() {
  const sheet = ensureSheet_(getSpreadsheet_(), CONFIG.SHEETS.PARENT, CONFIG.PARENT_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0] : CONFIG.PARENT_HEADERS;
  const idx = indexMap_(headers);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    if (!values[i].some(function(v) { return v !== '' && v !== null; })) continue;
    rows.push({ rowNumber: i + 1, values: values[i], obj: objectFromRow_(headers, values[i]) });
  }
  return { sheet: sheet, headers: headers, idx: idx, rows: rows };
}

function makeParentPoId_(po, vendorCode, vendorName) {
  const vendorKey = String(vendorCode || '').trim() || String(vendorName || '').trim().toUpperCase();
  const key = [String(po || '').trim(), vendorKey].join('|');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8);
  return 'PO-' + bytes.slice(0, 10).map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('').toUpperCase();
}

function parentHasUpdate_(o) {
  return Boolean(o && o[PCOL.LAST_UPDATE]) || Boolean(String(o && o[PCOL.UPDATED_BY] || '').trim()) || number_(o && o[PCOL.REVISION]) > 0;
}

function parentStatusLabel_(o) {
  if (!parentHasUpdate_(o)) return 'Need Update';
  const status = String(o[PCOL.STATUS] || '').trim();
  return status || 'Updated';
}

function stateFromParentObj_(o) {
  return {
    eta: o[PCOL.ETA] || '', source: String(o[PCOL.SOURCE] || ''), etd: etdText_(o[PCOL.ETD]),
    status: String(o[PCOL.STATUS] || ''), note: String(o[PCOL.NOTE] || ''),
    photoUrl: String(o[PCOL.PHOTO_URL] || ''), photoFileId: String(o[PCOL.PHOTO_FILE_ID] || '')
  };
}

function uniqueTextValues_(children, key) {
  const map = {};
  children.forEach(function(r) {
    const raw = r.obj[key];
    const value = key === COL.ETD ? etdText_(raw) : String(raw || '').trim();
    if (value) map[value] = true;
  });
  return Object.keys(map).sort();
}

function summarizeValues_(values, emptyValue) {
  if (!values.length) return emptyValue || '';
  if (values.length === 1) return values[0];
  return 'MULTIPLE (' + values.length + '): ' + values.slice(0, 3).join(', ') + (values.length > 3 ? ', ...' : '');
}

function minDateFromChildren_(children, key) {
  let selected = null;
  children.forEach(function(r) {
    const d = parseDate_(r.obj[key]);
    if (d && (!selected || d.getTime() < selected.getTime())) selected = d;
  });
  return selected || '';
}

function maxDateFromChildren_(children, key) {
  let selected = null;
  children.forEach(function(r) {
    const d = parseDate_(r.obj[key]);
    if (d && (!selected || d.getTime() > selected.getTime())) selected = d;
  });
  return selected || '';
}

function maxOperationalDateFromChildren_(children, key) {
  let selected = null;
  children.forEach(function(r) {
    const d = parseOperationalDate_(r.obj[key]);
    if (d && (!selected || d.getTime() > selected.getTime())) selected = d;
  });
  return selected || '';
}

function maxNumberFromChildren_(children, key) {
  let selected = 0;
  children.forEach(function(r) {
    selected = Math.max(selected, number_(r.obj[key]));
  });
  return selected;
}

function latestUpdatedChild_(children) {
  let latest = null;
  children.forEach(function(r) {
    const hasUpdate = Boolean(r.obj[COL.LAST_UPDATE]) || Boolean(String(r.obj[COL.UPDATED_BY] || '').trim()) || number_(r.obj[COL.REVISION]) > 0;
    if (!hasUpdate) return;
    if (!latest || dateTimeMs_(r.obj[COL.LAST_UPDATE]) >= dateTimeMs_(latest.obj[COL.LAST_UPDATE])) latest = r;
  });
  return latest;
}

function syncOutstandingParents_(options) {
  CacheService.getScriptCache().remove(CONFIG.PARENT_CACHE_KEY);
  options = options || {};
  const preserveUpdates = options.preserveUpdates !== false;
  const ss = getSpreadsheet_();
  const parentSheet = ensureSheet_(ss, CONFIG.SHEETS.PARENT, CONFIG.PARENT_HEADERS);
  const db = readDb_();
  const existing = readParentDb_();
  const existingMap = {};
  existing.rows.forEach(function(r) { existingMap[String(r.obj[PCOL.ID] || '')] = r.obj; });

  const groups = {};
  const childRowCount = Math.max(0, db.sheet.getLastRow() - 1);
  const parentLinks = Array.from({ length: childRowCount }, function() { return ['']; });
  db.rows.forEach(function(r) {
    const parentId = makeParentPoId_(r.obj[COL.PO], r.obj[COL.VENDOR_CODE], r.obj[COL.VENDOR_NAME]);
    parentLinks[r.rowNumber - 2][0] = parentId;
    if (!groups[parentId]) groups[parentId] = [];
    groups[parentId].push(r);
  });
  if (childRowCount && db.idx[COL.PARENT_ID] !== undefined) {
    db.sheet.getRange(2, db.idx[COL.PARENT_ID] + 1, childRowCount, 1).setValues(parentLinks);
  }

  const now = new Date();
  const parentRows = [];
  Object.keys(groups).sort().forEach(function(parentId) {
    const children = groups[parentId];
    const first = children[0].obj;
    const old = existingMap[parentId];
    const latestChild = latestUpdatedChild_(children);
    const oldHasUpdate = preserveUpdates && old && parentHasUpdate_(old);
    const latestChildHasUpdate = Boolean(latestChild);

    let state;
    let meta;
    if (oldHasUpdate) {
      state = stateFromParentObj_(old);
      meta = {
        lastUpdate: old[PCOL.LAST_UPDATE] || '', updatedBy: old[PCOL.UPDATED_BY] || '',
        updatedRole: old[PCOL.UPDATED_ROLE] || '', revision: number_(old[PCOL.REVISION]),
        photoFileId: old[PCOL.PHOTO_FILE_ID] || ''
      };
    } else if (latestChildHasUpdate) {
      state = stateFromObj_(latestChild.obj);
      state.photoFileId = String(latestChild.obj[COL.PHOTO_FILE_ID] || '');
      meta = {
        lastUpdate: latestChild.obj[COL.LAST_UPDATE] || '', updatedBy: latestChild.obj[COL.UPDATED_BY] || '',
        updatedRole: latestChild.obj[COL.UPDATED_ROLE] || '', revision: number_(latestChild.obj[COL.REVISION]),
        photoFileId: latestChild.obj[COL.PHOTO_FILE_ID] || ''
      };
    } else {
      state = {
        source: summarizeValues_(uniqueTextValues_(children, COL.SOURCE), ''),
        eta: minDateFromChildren_(children, COL.ETA),
        etd: summarizeValues_(uniqueTextValues_(children, COL.ETD), ''),
        status: '', note: '', photoUrl: '', photoFileId: ''
      };
      meta = { lastUpdate: '', updatedBy: '', updatedRole: '', revision: 0, photoFileId: '' };
    }

    const itemValues = uniqueTextValues_(children, COL.ITEM);
    const woValues = uniqueTextValues_(children, COL.WO);
    const partValues = uniqueTextValues_(children, COL.PART);
    const unitValues = uniqueTextValues_(children, COL.UNIT);
    const releaseValues = uniqueTextValues_(children, COL.RELEASE);
    const slocValues = uniqueTextValues_(children, COL.SLOC);
    const reqValues = uniqueTextValues_(children, COL.REQUISITIONER);
    const obj = {};
    obj[PCOL.ID] = parentId;
    obj[PCOL.PO] = first[COL.PO] || '';
    obj[PCOL.VENDOR_CODE] = first[COL.VENDOR_CODE] || '';
    obj[PCOL.VENDOR_NAME] = first[COL.VENDOR_NAME] || first[COL.VENDOR] || '';
    obj[PCOL.DOC_DATE] = maxDateFromChildren_(children, COL.DOC_DATE);
    obj[PCOL.AGING] = maxNumberFromChildren_(children, COL.AGING);
    obj[PCOL.FULL_RELEASE_DATE] = maxOperationalDateFromChildren_(children, COL.FULL_RELEASE_DATE);
    obj[PCOL.TARGET_SUPPLY] = maxOperationalDateFromChildren_(children, COL.TARGET_SUPPLY);
    obj[PCOL.ITEM_COUNT] = children.length;
    obj[PCOL.WO_COUNT] = woValues.length;
    obj[PCOL.PART_COUNT] = partValues.length;
    obj[PCOL.ORDER_QTY] = children.reduce(function(sum, r) { return sum + number_(r.obj[COL.ORDER_QTY]); }, 0);
    obj[PCOL.QTY_OS] = children.reduce(function(sum, r) { return sum + number_(r.obj[COL.QTY_OS]); }, 0);
    obj[PCOL.UNIT] = unitValues.join(', ');
    obj[PCOL.NET_VALUE] = children.reduce(function(sum, r) { return sum + number_(r.obj[COL.NET_VALUE]); }, 0);
    obj[PCOL.RELEASE] = releaseValues.join(', ');
    obj[PCOL.RELEASE_STATE] = releaseStateForChildren_(children);
    obj[PCOL.SLOC] = slocValues.join(', ');
    obj[PCOL.REQUISITIONER] = reqValues.join(', ');
    obj[PCOL.SOURCE] = state.source || '';
    obj[PCOL.ETA] = state.eta || '';
    obj[PCOL.ETD] = state.etd || '';
    obj[PCOL.STATUS] = state.status || '';
    obj[PCOL.NOTE] = state.note || '';
    obj[PCOL.PHOTO_URL] = state.photoUrl || '';
    obj[PCOL.PHOTO_FILE_ID] = state.photoFileId || meta.photoFileId || '';
    obj[PCOL.LAST_UPDATE] = meta.lastUpdate || '';
    obj[PCOL.UPDATED_BY] = meta.updatedBy || '';
    obj[PCOL.UPDATED_ROLE] = meta.updatedRole || '';
    obj[PCOL.REVISION] = meta.revision || 0;
    obj[PCOL.CHILD_IDS] = children.map(function(r) { return String(r.obj[COL.ID] || ''); }).filter(Boolean).join(',');
    obj[PCOL.SEARCH] = buildParentSearchText_(children);
    obj[PCOL.CREATED_AT] = old && old[PCOL.CREATED_AT] ? old[PCOL.CREATED_AT] : now;
    obj[PCOL.UPDATED_AT] = now;
    parentRows.push(CONFIG.PARENT_HEADERS.map(function(h) { return obj[h] === undefined ? '' : obj[h]; }));
  });

  parentSheet.clearContents();
  parentSheet.getRange(1, 1, 1, CONFIG.PARENT_HEADERS.length).setValues([CONFIG.PARENT_HEADERS]);
  if (parentRows.length) parentSheet.getRange(2, 1, parentRows.length, CONFIG.PARENT_HEADERS.length).setValues(parentRows);
  formatParentSheet_(parentSheet, parentRows.length + 1);
  SpreadsheetApp.flush();
  CacheService.getScriptCache().put(CONFIG.PARENT_CACHE_KEY, '1', 21600);
  return { parentCount: parentRows.length, childCount: db.rows.length, linkedChildCount: Object.keys(groups).reduce(function(n, id) { return n + groups[id].length; }, 0) };
}

function ensureParentData_() {
  const cache = CacheService.getScriptCache();
  if (cache.get(CONFIG.PARENT_CACHE_KEY) === '1') return;

  const db = readDb_();
  const children = db.rows;
  const expected = {};
  let missingLink = false;
  children.forEach(function(r) {
    const id = makeParentPoId_(r.obj[COL.PO], r.obj[COL.VENDOR_CODE], r.obj[COL.VENDOR_NAME]);
    expected[id] = true;
    if (String(r.obj[COL.PARENT_ID] || '') !== id) missingLink = true;
  });
  const parentDb = readParentDb_();
  const actual = {};
  parentDb.rows.forEach(function(r) { actual[String(r.obj[PCOL.ID] || '')] = true; });
  const expectedIds = Object.keys(expected);
  const actualIds = Object.keys(actual);
  const mismatch = expectedIds.length !== actualIds.length || expectedIds.some(function(id) { return !actual[id]; });
  if (missingLink || mismatch) {
    syncOutstandingParents_({ preserveUpdates: true });
  } else {
    cache.put(CONFIG.PARENT_CACHE_KEY, '1', 21600);
  }
}

function groupChildrenByParent_(rows) {
  const map = {};
  rows.forEach(function(r) {
    const parentId = String(r.obj[COL.PARENT_ID] || '') || makeParentPoId_(r.obj[COL.PO], r.obj[COL.VENDOR_CODE], r.obj[COL.VENDOR_NAME]);
    if (!map[parentId]) map[parentId] = [];
    map[parentId].push(r);
  });
  Object.keys(map).forEach(function(id) {
    map[id].sort(function(a, b) {
      const itemA = String(a.obj[COL.ITEM] || '');
      const itemB = String(b.obj[COL.ITEM] || '');
      return itemA.localeCompare(itemB, undefined, { numeric: true });
    });
  });
  return map;
}

function resolveParentRecord_(recordId) {
  const parentDb = readParentDb_();
  let parent = parentDb.rows.find(function(r) { return String(r.obj[PCOL.ID] || '') === String(recordId || ''); });
  const db = readDb_();
  const childMap = groupChildrenByParent_(db.rows);
  if (!parent) {
    const child = db.rows.find(function(r) { return String(r.obj[COL.ID] || '') === String(recordId || ''); });
    if (child) {
      const parentId = String(child.obj[COL.PARENT_ID] || '') || makeParentPoId_(child.obj[COL.PO], child.obj[COL.VENDOR_CODE], child.obj[COL.VENDOR_NAME]);
      parent = parentDb.rows.find(function(r) { return String(r.obj[PCOL.ID] || '') === parentId; });
    }
  }
  if (!parent) return null;
  return { parent: parent, children: childMap[String(parent.obj[PCOL.ID] || '')] || [] };
}

function canAccessParent_(session, o) {
  if (session.role === 'ADMIN') return true;
  return String(o[PCOL.VENDOR_CODE] || '') === String(session.vendorCode || '');
}

function compareParentRows_(a, b, key) {
  switch (key) {
    case 'PO': return String(a[PCOL.PO] || '').localeCompare(String(b[PCOL.PO] || ''));
    case 'VENDOR': return String(a[PCOL.VENDOR_NAME] || '').localeCompare(String(b[PCOL.VENDOR_NAME] || ''));
    case 'AGING': return number_(a[PCOL.AGING]) - number_(b[PCOL.AGING]);
    case 'TARGET_SUPPLY': return dateTimeMs_(a[PCOL.TARGET_SUPPLY]) - dateTimeMs_(b[PCOL.TARGET_SUPPLY]);
    case 'ETA': return dateTimeMs_(a[PCOL.ETA]) - dateTimeMs_(b[PCOL.ETA]);
    case 'VALUE': return number_(a[PCOL.NET_VALUE]) - number_(b[PCOL.NET_VALUE]);
    case 'DOCUMENT_DATE': return dateTimeMs_(a[PCOL.DOC_DATE]) - dateTimeMs_(b[PCOL.DOC_DATE]);
    case 'LAST_UPDATE':
    default: return dateTimeMs_(a[PCOL.LAST_UPDATE]) - dateTimeMs_(b[PCOL.LAST_UPDATE]);
  }
}

function parentRowToClient_(r) {
  const o = r.obj;
  return {
    rowNumber: r.rowNumber,
    recordId: String(o[PCOL.ID] || ''), parentId: String(o[PCOL.ID] || ''),
    po: valueText_(o[PCOL.PO]), vendorCode: valueText_(o[PCOL.VENDOR_CODE]), vendorName: valueText_(o[PCOL.VENDOR_NAME]),
    documentDate: toClientDate_(o[PCOL.DOC_DATE]), aging: number_(o[PCOL.AGING]),
    poFullReleaseDate: toClientOperationalDate_(o[PCOL.FULL_RELEASE_DATE]), targetSupplyDate: toClientOperationalDate_(o[PCOL.TARGET_SUPPLY]), itemCount: number_(o[PCOL.ITEM_COUNT]), woCount: number_(o[PCOL.WO_COUNT]),
    partCount: number_(o[PCOL.PART_COUNT]), orderQuantity: number_(o[PCOL.ORDER_QTY]), qtyOs: number_(o[PCOL.QTY_OS]),
    unit: valueText_(o[PCOL.UNIT]), netValue: number_(o[PCOL.NET_VALUE]), releaseStatus: valueText_(o[PCOL.RELEASE]),
    releaseState: parentReleaseState_(o), slocSummary: valueText_(o[PCOL.SLOC]), requisitionerSummary: valueText_(o[PCOL.REQUISITIONER]),
    sourceStock: valueText_(o[PCOL.SOURCE]), eta: toClientDate_(o[PCOL.ETA]) || valueText_(o[PCOL.ETA]),
    etd: etdText_(o[PCOL.ETD]), status: valueText_(o[PCOL.STATUS]), statusLabel: parentStatusLabel_(o),
    note: valueText_(o[PCOL.NOTE]), photoUrl: valueText_(o[PCOL.PHOTO_URL]),
    lastUpdate: toClientDateTime_(o[PCOL.LAST_UPDATE]), updatedBy: valueText_(o[PCOL.UPDATED_BY]),
    updatedRole: valueText_(o[PCOL.UPDATED_ROLE]), revision: number_(o[PCOL.REVISION])
  };
}

function parentHistoryRecordObj_(parentObj, childCount) {
  const obj = {};
  obj[COL.ID] = parentObj[PCOL.ID] || '';
  obj[COL.PO] = parentObj[PCOL.PO] || '';
  obj[COL.ITEM] = 'ALL (' + Number(childCount || parentObj[PCOL.ITEM_COUNT] || 0) + ')';
  obj[COL.PART] = Number(childCount || parentObj[PCOL.ITEM_COUNT] || 0) + ' LINE ITEMS';
  obj[COL.VENDOR_CODE] = parentObj[PCOL.VENDOR_CODE] || '';
  obj[COL.VENDOR_NAME] = parentObj[PCOL.VENDOR_NAME] || '';
  return obj;
}

/**
 * Fast lookup parent berdasarkan ID tanpa membaca seluruh sheet.
 * Fallback recordId line-item tetap didukung untuk kompatibilitas histori versi lama.
 */
function findParentRecordFast_(recordId) {
  const ss = getSpreadsheet_();
  const parentSheet = ss.getSheetByName(CONFIG.SHEETS.PARENT);
  if (!parentSheet || parentSheet.getLastRow() < 2) return null;

  const parentHeaders = parentSheet.getRange(1, 1, 1, parentSheet.getLastColumn()).getValues()[0];
  const pidx = indexMap_(parentHeaders);
  let parentId = String(recordId || '').trim();
  let parentRowNumber = findExactRowFast_(parentSheet, pidx[PCOL.ID] + 1, parentId);

  if (!parentRowNumber) {
    const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
    if (!dbSheet || dbSheet.getLastRow() < 2) return null;
    const dbHeaders = dbSheet.getRange(1, 1, 1, dbSheet.getLastColumn()).getValues()[0];
    const didx = indexMap_(dbHeaders);
    const childRowNumber = findExactRowFast_(dbSheet, didx[COL.ID] + 1, parentId);
    if (!childRowNumber) return null;
    parentId = String(dbSheet.getRange(childRowNumber, didx[COL.PARENT_ID] + 1).getDisplayValue() || '').trim();
    if (!parentId) return null;
    parentRowNumber = findExactRowFast_(parentSheet, pidx[PCOL.ID] + 1, parentId);
  }

  if (!parentRowNumber) return null;
  const values = parentSheet.getRange(parentRowNumber, 1, 1, parentHeaders.length).getValues()[0];
  return {
    sheet: parentSheet,
    headers: parentHeaders,
    idx: pidx,
    rowNumber: parentRowNumber,
    values: values,
    obj: objectFromRow_(parentHeaders, values)
  };
}

function findExactRowFast_(sheet, columnNumber, value) {
  const target = String(value || '').trim();
  const lastRow = sheet ? sheet.getLastRow() : 0;
  if (!target || !sheet || lastRow < 2 || !columnNumber) return 0;
  const found = sheet.getRange(2, columnNumber, lastRow - 1, 1)
    .createTextFinder(target)
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findNext();
  return found ? found.getRow() : 0;
}

function findChildRowsByParentFast_(parentId, dbSheet, didx) {
  const lastRow = dbSheet.getLastRow();
  if (lastRow < 2) return [];
  const found = dbSheet.getRange(2, didx[COL.PARENT_ID] + 1, lastRow - 1, 1)
    .createTextFinder(String(parentId || '').trim())
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findAll();
  return (found || []).map(function(r) { return r.getRow(); }).sort(function(a, b) { return a - b; });
}

function contiguousRowGroups_(rowNumbers) {
  const rows = (rowNumbers || []).slice().sort(function(a, b) { return a - b; });
  const groups = [];
  rows.forEach(function(row) {
    const last = groups.length ? groups[groups.length - 1] : null;
    if (!last || row !== last.end + 1) groups.push({ start: row, end: row });
    else last.end = row;
  });
  return groups;
}

function repeatedRows_(count, rowValues) {
  const output = new Array(Math.max(0, Number(count) || 0));
  for (let i = 0; i < output.length; i++) output[i] = rowValues.slice();
  return output;
}

/**
 * Vendor update tidak perlu menjalankan validasi relasi seluruh database setiap 6 jam.
 * Rebuild penuh hanya dilakukan jika sheet parent memang belum tersedia/kosong.
 */
function ensureParentDataForUpdateFast_() {
  const ss = getSpreadsheet_();
  const parentSheet = ss.getSheetByName(CONFIG.SHEETS.PARENT);
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  if (!dbSheet) throw new Error('Sheet database OUTSTANDING tidak ditemukan. Jalankan setupSystem().');
  if (!parentSheet || parentSheet.getLastRow() < 2) {
    syncOutstandingParents_({ preserveUpdates: true });
  }
}

function applyStateToParentAndChildren_(parentId, state, session, options) {
  options = options || {};
  const parent = options.knownParent || findParentRecordFast_(parentId);
  if (!parent) throw new Error('PO tidak ditemukan.');

  const ss = getSpreadsheet_();
  const dbSheet = ss.getSheetByName(CONFIG.SHEETS.DB);
  if (!dbSheet) throw new Error('Database line item tidak ditemukan.');
  const dbHeaders = dbSheet.getRange(1, 1, 1, dbSheet.getLastColumn()).getValues()[0];
  const didx = indexMap_(dbHeaders);
  const childRows = findChildRowsByParentFast_(parentId, dbSheet, didx);
  if (!childRows.length) throw new Error('Line item tidak ditemukan.');

  const now = options.timestamp || new Date();
  const revision = options.incrementRevision === false
    ? number_(parent.obj[PCOL.REVISION])
    : Math.max(0, number_(parent.obj[PCOL.REVISION])) + 1;

  // 1 batch write untuk parent PO.
  const parentRow = parent.values.slice();
  parentRow[parent.idx[PCOL.ETA]] = state.eta || '';
  parentRow[parent.idx[PCOL.SOURCE]] = state.source || '';
  parentRow[parent.idx[PCOL.ETD]] = state.etd || '';
  parentRow[parent.idx[PCOL.STATUS]] = state.status || '';
  parentRow[parent.idx[PCOL.NOTE]] = state.note || '';
  parentRow[parent.idx[PCOL.PHOTO_URL]] = state.photoUrl || '';
  parentRow[parent.idx[PCOL.PHOTO_FILE_ID]] = state.photoFileId || parent.obj[PCOL.PHOTO_FILE_ID] || '';
  parentRow[parent.idx[PCOL.LAST_UPDATE]] = now;
  parentRow[parent.idx[PCOL.UPDATED_BY]] = session.username;
  parentRow[parent.idx[PCOL.UPDATED_ROLE]] = session.role;
  parentRow[parent.idx[PCOL.REVISION]] = revision;
  parentRow[parent.idx[PCOL.UPDATED_AT]] = now;
  parent.sheet.getRange(parent.rowNumber, 1, 1, parent.headers.length).setValues([parentRow]);

  // Line item umumnya berurutan per PO. Tulis per blok berurutan, bukan per baris.
  // Hanya kolom operasional yang berubah; master PO/PN/QTY tidak disentuh.
  const groups = contiguousRowGroups_(childRows);
  const op1Start = didx[COL.SOURCE] + 1;
  const op1Width = didx[COL.STATUS] - didx[COL.SOURCE] + 1; // SOURCE, ETA, ETD, STATUS
  const op1Values = [state.source || '', state.eta || '', state.etd || '', state.status || ''];

  const op2Start = didx[COL.NOTE] + 1;
  const op2Width = didx[COL.REVISION] - didx[COL.NOTE] + 1; // NOTE ... REVISION
  const op2Values = [
    state.note || '',
    state.photoUrl || '',
    state.photoFileId || parent.obj[PCOL.PHOTO_FILE_ID] || '',
    now,
    session.username,
    session.role,
    revision
  ];

  groups.forEach(function(g) {
    const count = g.end - g.start + 1;
    dbSheet.getRange(g.start, op1Start, count, op1Width).setValues(repeatedRows_(count, op1Values));
    dbSheet.getRange(g.start, op2Start, count, op2Width).setValues(repeatedRows_(count, op2Values));
  });

  // Tidak ada SpreadsheetApp.flush() dan tidak ada format ulang per submit.
  // Format kolom sudah disiapkan oleh setup/import.
  return {
    parent: {
      rowNumber: parent.rowNumber,
      values: parentRow,
      obj: objectFromRow_(parent.headers, parentRow)
    },
    childCount: childRows.length,
    writeGroups: groups.length
  };
}

function formatParentSheet_(sheet, lastRow) {
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  const lastCol = CONFIG.PARENT_HEADERS.length;
  sheet.getRange(1, 1, 1, lastCol)
    .setBackground('#991b1b').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 42);
  if (lastRow > 1) {
    const idx = indexMap_(CONFIG.PARENT_HEADERS);
    sheet.getRange(2, idx[PCOL.DOC_DATE] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[PCOL.AGING] + 1, lastRow - 1, 1).setNumberFormat('0');
    sheet.getRange(2, idx[PCOL.FULL_RELEASE_DATE] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[PCOL.TARGET_SUPPLY] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[PCOL.ETA] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(2, idx[PCOL.NET_VALUE] + 1, lastRow - 1, 1).setNumberFormat('#,##0');
    sheet.getRange(2, idx[PCOL.LAST_UPDATE] + 1, lastRow - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  }
  const widths = [190,120,110,230,100,80,120,120,80,80,80,120,110,110,140,160,130,150,170,150,100,250,150,250,220,160,140,120,100,80,380,420,140,140];
  widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
  if (sheet.getFilter()) sheet.getFilter().remove();
  if (lastRow >= 1) sheet.getRange(1, 1, Math.max(lastRow, 1), lastCol).createFilter();
}


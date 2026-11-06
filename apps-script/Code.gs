/**
 * RSVP receiver for Ethan's birthday site.
 * Paste into the sheet: Extensions > Apps Script, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone).
 */

var RSVP_TAB = 'אישורי הגעה';
var SETTINGS_TAB = 'הגדרות';
var DEFAULT_PAYBOX = 'https://links.payboxapp.com/uVBBWkJYQ7b';

// The site posts: name, allergies ("yes"/"no"), details.
function doPost(e) {
  var p = (e && e.parameter) || {};
  var name = clean_(p.name, 80);
  if (!name) return json_({ ok: false, error: 'missing name' });

  var hasAllergies = p.allergies === 'yes';
  var details = hasAllergies ? clean_(p.details, 300) : '';

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = tab_(RSVP_TAB, initRsvpTab_);
    sheet.appendRow([new Date(), name, hasAllergies ? 'כן' : 'לא', details]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

// The site reads the PayBox link from the "הגדרות" tab, cell B1.
function doGet() {
  var sheet = tab_(SETTINGS_TAB, function (s) {
    s.getRange('A1:B1').setValues([['קישור לפייבוקס', DEFAULT_PAYBOX]]);
    s.setRightToLeft(true);
  });
  var link = String(sheet.getRange('B1').getValue() || '').trim();
  return json_({ paybox: /^https:\/\//.test(link) ? link : DEFAULT_PAYBOX });
}

// Run once from the editor to create both tabs and grant permissions.
function setup() {
  doGet();
  tab_(RSVP_TAB, initRsvpTab_);
}

function initRsvpTab_(s) {
  s.appendRow(['נשלח בתאריך', 'שם הילד/ה', 'אלרגיות', 'פירוט אלרגיות']);
  s.setFrozenRows(1);
  s.getRange('A1:D1').setFontWeight('bold');
  s.setRightToLeft(true);
}

function tab_(name, init) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    init(sheet);
  }
  return sheet;
}

function clean_(value, max) {
  var s = String(value || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  // Keep text from being read as a formula.
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

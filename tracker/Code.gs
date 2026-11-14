/**
 * Goof n' Off boat tracker: a tiny Google Apps Script web app.
 * The Crossing page in captain mode POSTs a rounded position every 5 minutes;
 * the family view GETs the last 50 positions.
 *
 * Setup (once):
 * 1. In the "Crossing Tracker" Google Sheet: Extensions > Apps Script. Paste this file.
 * 2. Project Settings (gear) > Script Properties > Add: KEY = a short captain key you choose.
 *    (Type the same key on the helm iPad. It's never in the page's code.)
 * 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy, allow access.
 * 4. Copy the Web app URL and give it to Claude to put in the page.
 */
const SHEET = 'Track';

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['time', 'lat', 'lon', 'sog_kt', 'status']);
  }
  return sh;
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false }); }
  const key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || body.key !== key) return out_({ ok: false });
  const lat = Number(body.lat), lon = Number(body.lon);
  if (!isFinite(lat) || !isFinite(lon)) return out_({ ok: false });
  sheet_().appendRow([new Date(), lat, lon, body.sog === '' ? '' : Number(body.sog), body.status === 'arrived' ? 'arrived' : 'underway']);
  return out_({ ok: true });
}

function doGet() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return out_({ points: [] });
  const n = Math.min(50, last - 1);
  const rows = sh.getRange(last - n + 1, 1, n, 5).getValues();
  // Only show the last 24 hours, so an old trip never shows up on the map.
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const points = rows
    .map(r => ({ d: new Date(r[0]), r: r }))
    .filter(x => !isNaN(x.d.getTime()) && x.d.getTime() > cutoff)
    .map(x => ({ t: x.d.toISOString(), lat: x.r[1], lon: x.r[2], sog: x.r[3], status: x.r[4] }));
  return out_({ points });
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

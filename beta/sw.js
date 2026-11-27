// ---------- Saved copy for no signal (MVP row 17, W16; beta only) ----------
// A service worker: it keeps beta's own pages, scripts and styles (and the
// Leaflet map library) on the phone so beta still opens with no signal.
// - Scope is /crossing/beta/ only: the browser does not let it touch /next/
//   or the live page.
// - Network first: with signal the newest version always loads; the saved
//   copy is used only when there is no answer within 4 seconds.
// - Never saves data: forecast, NWS warnings, the tracker, map tiles and
//   radar go straight to the network. (The Plan page keeps its own last
//   forecast, marked as saved, in forecast.js.)
// - The family page and the two test pages are left alone.
// Bump VERSION in every pull request that changes beta's files; /pr-check
// checks that every beta page, script and style is listed below.
// Undo: delete this file. The phone drops the saved copy the next time it
// checks with signal (the browser removes a worker whose file is gone).
var VERSION = '2026-11-26-setup1';
var CACHE = 'cx-beta-app-' + VERSION;
var LEAFLET = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
               'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
var FILES = [
  './', 'index.html', 'live.html', 'mytrips.html', 'menu.html', 'boat.html', 'safety.html', 'customs.html',
  'settings.html', 'log.html', 'setup.html', 'float-plan.html', 'share.html', 'family-tab.html',
  'css/app.css', 'css/frame.css', 'css/log.css', 'css/onboard.css',
  'js/active-route.js', 'js/boat.js', 'js/boot.js', 'js/calendar.js', 'js/familytab.js', 'js/floatplan.js',
  'js/forecast.js', 'js/frame.js', 'js/helpers.js', 'js/live.js', 'js/livemenu.js', 'js/log.js', 'js/map.js',
  'js/mysetup.js', 'js/mytrips-page.js', 'js/mytrips.js', 'js/offline.js', 'js/onboard.js', 'js/photo.js',
  'js/plan.js', 'js/prefs.js', 'js/queue.js', 'js/routes.js', 'js/safety.js', 'js/settings.js', 'js/setup.js',
  'js/share.js', 'js/tides.js', 'js/tracker-api.js', 'js/trip-math.js', 'js/tripmap.js', 'js/warnings.js',
  '../apple-touch-icon.png?v=1', '../favicon.png?v=1'
];
// Pages that always go straight to the network (followers' page and test pages).
var BYPASS = /\/beta\/(family\.html|tracker-test\.html|trip-test\.html|sw\.js)$/;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // Each file on its own, so one missing file does not stop the rest.
    return Promise.all(FILES.concat(LEAFLET).map(function (u) {
      return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('cx-beta-app-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Beta's own files are those under this worker's scope (/crossing/beta/ on
// GitHub Pages), plus the two app icons one folder up.
var SCOPE = self.registration.scope, UP = new URL('../', SCOPE).pathname;
function ours(url) {
  if (LEAFLET.indexOf(url.href) !== -1) return true;
  if (url.origin !== self.location.origin) return false;
  if (BYPASS.test(url.pathname)) return false;
  return url.href.indexOf(SCOPE) === 0 || url.pathname === UP + 'apple-touch-icon.png' || url.pathname === UP + 'favicon.png';
}
function fromCache(req) {
  return caches.open(CACHE).then(function (c) {
    return c.match(req).then(function (r) { return r || c.match(req, { ignoreSearch: true }); });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (!ours(url)) return;   // data and everything else: straight to the network
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    var finish = function (r) { if (!done && r) { done = true; resolve(r); } };
    // No answer in 4 seconds: use the saved copy (keep waiting for the network if there is none).
    var timer = setTimeout(function () { fromCache(req).then(finish); }, 4000);
    fetch(req).then(function (r) {
      clearTimeout(timer);
      if (r && r.ok && (r.type === 'basic' || r.type === 'cors')) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      finish(r);
    }).catch(function () {
      clearTimeout(timer);
      fromCache(req).then(function (r) { finish(r || Response.error()); });
    });
  }));
});
// The Menu asks which version is saved.
self.addEventListener('message', function (e) {
  if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION });
});

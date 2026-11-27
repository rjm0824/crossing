// ---------- Turns on the saved copy for no signal (MVP row 17; beta) ----------
// Registers sw.js for /crossing/beta/ only. Loaded by beta's captain pages,
// never by the family page, so followers' phones are not affected.
// On the Menu page it also shows which version is saved and offers
// "Refresh saved copy" (#offlineBox).
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var here = location.pathname.replace(/[^/]*$/, '');
  if (!/\/beta\/$/.test(here)) return;   // beta only
  navigator.serviceWorker.register(here + 'sw.js', { scope: here }).catch(function () {});

  var box = document.getElementById('offlineBox');
  if (!box) return;
  var line = document.getElementById('offlineLine'), btn = document.getElementById('offlineRefresh');
  function show() {
    caches.keys().then(function (keys) {
      var k = keys.filter(function (x) { return x.indexOf('cx-beta-app-') === 0; })[0];
      line.textContent = k ? 'Saved for no signal: version ' + k.slice(12) + '. Beta opens even with no signal.'
        : 'Not saved yet. Open beta once with signal, then it opens with no signal too.';
    }).catch(function () { line.textContent = 'This browser can’t save beta for no signal.'; });
  }
  box.hidden = false; show();
  btn.onclick = function () {
    btn.disabled = true; line.textContent = 'Refreshing…';
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (x) { return x.indexOf('cx-beta-app-') === 0; }).map(function (x) { return caches.delete(x); }));
    }).then(function () { return navigator.serviceWorker.getRegistration(here); })
      .then(function (reg) { return reg ? reg.unregister() : null; })
      .then(function () { return navigator.serviceWorker.register(here + 'sw.js', { scope: here }); })
      .then(function () { setTimeout(function () { btn.disabled = false; show(); }, 2500); })
      .catch(function () { btn.disabled = false; line.textContent = 'Couldn’t refresh. Try again with signal.'; });
  };
})();

// ---------- Tracker service ----------
// The only code that talks to the tracker. Every request is a POST with a JSON
// body sent as plain text (never no-cors, so the real answer is read).
// Returns { ok: true, data } or { ok: false, error }, where error is the
// tracker's own word (invite, cap, not_found, bad_request, too_many, server)
// or 'network' when no answer came back in time.
var Tracker = (function () {
  'use strict';
  var PREVIEW = 'https://crossing-tracker-preview.rj-2a3.workers.dev';
  var TIMEOUT_MS = 20000;

  // On this computer only (localhost), ?api= points at a local test copy.
  function base() {
    try {
      var host = location.hostname;
      var api = new URLSearchParams(location.search).get('api');
      if (api && (host === 'localhost' || host === '127.0.0.1') && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(api)) return api;
    } catch (e) {}
    return PREVIEW;
  }
  var TRACKER = base();

  function call(path, body) {
    return new Promise(function (resolve) {
      var done = false;
      var finish = function (r) { if (!done) { done = true; clearTimeout(timer); resolve(r); } };
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
        finish({ ok: false, error: 'network' });
      }, TIMEOUT_MS);
      fetch(TRACKER + path, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = JSON.parse(text); } catch (e) {}
          if (res.ok && data && !data.error) return finish({ ok: true, data: data });
          // Cloudflare's own pages (daily limit, outage) are not JSON: treat as the server.
          finish({ ok: false, error: data && typeof data.error === 'string' ? data.error : 'server' });
        });
      }).catch(function () { finish({ ok: false, error: 'network' }); });
    });
  }

  return { TRACKER: TRACKER, call: call };
})();

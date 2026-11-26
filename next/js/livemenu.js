// ---------- ☰ menu on the Start trip / Live screen (live.html only) ----------
// Small fix (RJ, Nov 26): a way back to the app's menus from live.html.
// This file only draws a button and a sheet on top of the page. It never
// touches the trip, GPS, the send queue or the screen-awake lock: they keep
// running in live.js while the sheet is open. It only READS cx:next:trip to
// know whether a trip is sharing. Followers use family.html, which does not
// load this file, so they never see the ☰.
(function () {
  'use strict';
  var header = document.querySelector('body.tp header');
  if (!header) return;

  var home = new URLSearchParams(location.search).get('trip') === 'home';
  var q = home ? '?trip=home' : '';
  // A center console in profile (RJ: most users are powerboaters): hull, console, T-top, outboard.
  var CC = '<svg viewBox="0 0 28 20" width="30" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M4 12.5H26.5L23 17H6.5Z" fill="currentColor"/>' +            // hull, bow to the right
    '<path d="M11.5 12.5V8.5H15.5L17 12.5"/>' +                              // console with windscreen
    '<path d="M9 3.5H18.5M10.5 3.5V8.5M17 3.5V9.5"/>' +                               // T-top and its posts
    '<path d="M4 11V16.5H1.8V11Z" fill="currentColor"/></svg>';            // outboard on the transom
  // Same places as the bottom bar and Menu (Settings stays hidden until Dec 1).
  var ITEMS = [
    { label: 'Plan', ic: '⚓', href: 'index.html' + q + '#captain' },
    { label: 'Live', ic: '◉', here: true },
    { label: 'Family', ic: '♥', href: 'family-tab.html' + q },
    { label: 'My Boat', svg: CC, href: 'boat.html' + q },
    { label: 'Customs', ic: '▤', href: 'customs.html' + q },
    { label: 'Safety', ic: '✚', href: 'safety.html' + q },
    { label: 'Crossing log', ic: '✎', href: 'log.html' + q }
  ];

  function sharing() {
    try { var t = JSON.parse(localStorage.getItem('cx:next:trip') || 'null'); return !!(t && t.status === 'underway'); }
    catch (e) { return false; }
  }

  var css = document.createElement('style');
  css.textContent = [
    '.lm-open{margin-left:auto;flex:none;width:48px;height:48px;border-radius:12px;border:1px solid #B9C8D3;background:var(--panel);color:var(--ink);font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}',
    '.lm-open:active,.lm-open.lm-pressed{background:#DCE4EA}',
    '.lm-back{position:fixed;inset:0;z-index:2900;background:rgba(14,34,51,.45);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}',
    '.lm-back.lm-on{opacity:1}',
    '.lm-sheet{background:#fff;border-radius:18px 18px 0 0;width:100%;max-width:520px;max-height:85vh;overflow-y:auto;padding:10px 16px calc(16px + env(safe-area-inset-bottom));transform:translateY(100%);transition:transform .22s ease-out}',
    '.lm-on .lm-sheet{transform:none}',
    '@media (prefers-reduced-motion:reduce){.lm-back,.lm-sheet{transition:none}}',
    '.lm-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0 6px}',
    '.lm-top b{font-size:17px}',
    '.lm-x{width:48px;height:48px;border-radius:12px;border:1px solid #B9C8D3;background:var(--panel);color:var(--ink);font-size:22px;cursor:pointer}',
    '.lm-x:active,.lm-x.lm-pressed{background:#DCE4EA}',
    '.lm-list{list-style:none;margin:0;padding:0}',
    '.lm-list a{display:flex;align-items:center;gap:12px;min-height:54px;padding:6px 8px;border-top:1px solid var(--line);color:var(--ink);text-decoration:none;font-size:17px;font-weight:600;border-radius:10px;-webkit-tap-highlight-color:transparent}',
    '.lm-list li:first-child a{border-top:none}',
    '.lm-list a:active,.lm-list a.lm-pressed{background:#E6EEF3}',
    '.lm-list .lm-ic{width:32px;text-align:center;font-size:20px;color:var(--accent);display:flex;align-items:center;justify-content:center}',
    '.lm-list small{margin-left:auto;color:var(--soft);font-size:13px;font-weight:600}',
    '.lm-ask{display:flex;flex-direction:column;gap:10px;padding:6px 0 2px}',
    '.lm-ask b{font-size:17px}',
    '.lm-ask .bigbtn:active,.lm-ask .bigbtn.lm-pressed{filter:brightness(.85)}',
    '.lm-msg{font-size:14px;font-weight:600;min-height:1.2em;color:var(--go)}'
  ].join('\n');
  document.head.appendChild(css);

  // ---- The ☰ button, at the right end of the title row ----
  var open = document.createElement('button');
  open.type = 'button'; open.className = 'lm-open'; open.textContent = '☰';
  open.setAttribute('aria-label', 'Menu'); open.setAttribute('aria-haspopup', 'dialog');
  header.appendChild(open);

  // ---- The sheet ----
  var back = document.createElement('div');
  back.className = 'lm-back'; back.hidden = true;
  back.innerHTML =
    '<div class="lm-sheet" role="dialog" aria-modal="true" aria-labelledby="lmTitle">' +
      '<div class="lm-top"><b id="lmTitle">Go to</b><button type="button" class="lm-x" aria-label="Close menu">✕</button></div>' +
      '<ul class="lm-list"></ul>' +
      '<div class="lm-ask" hidden>' +
        '<b id="lmQ">Sharing pauses while you\'re away from this page. Stay on your trip?</b>' +
        '<button type="button" class="bigbtn lm-stay">Back to my trip</button>' +
        '<button type="button" class="bigbtn plain lm-leave">Leave anyway</button>' +
        '<div class="lm-msg" role="status" aria-live="polite"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(back);
  var sheet = back.firstChild, list = back.querySelector('.lm-list'), ask = back.querySelector('.lm-ask');
  var x = back.querySelector('.lm-x'), stay = back.querySelector('.lm-stay'), leave = back.querySelector('.lm-leave');
  var msg = back.querySelector('.lm-msg');
  var pending = null, busy = false;

  ITEMS.forEach(function (it) {
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = it.href || '#';
    if (it.here) a.setAttribute('aria-current', 'page');
    a.innerHTML = '<span class="lm-ic" aria-hidden="true"></span><span></span>' + (it.here ? '<small>You are here</small>' : '');
    if (it.svg) a.firstChild.innerHTML = it.svg;                     // fixed drawing above, no outside text
    else a.firstChild.textContent = it.ic + '\uFE0E';                // \uFE0E: plain symbol, not a colour emoji
    a.childNodes[1].textContent = it.label;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (busy) return;
      press(a);
      if (it.here) { later(close); return; }
      if (sharing()) { pending = it; later(showAsk); return; }
      go(it.href);
    });
    li.appendChild(a); list.appendChild(li);
  });

  // Every button shows it was pressed, then the real result.
  function press(el) { el.classList.add('lm-pressed'); setTimeout(function () { el.classList.remove('lm-pressed'); }, 250); }
  function later(fn) { setTimeout(fn, 150); }
  function go(href) { busy = true; setTimeout(function () { location.href = href; }, 150); }

  function reset() {
    busy = false; pending = null;
    list.hidden = false; ask.hidden = true; msg.textContent = '';
    stay.disabled = leave.disabled = false; leave.textContent = 'Leave anyway';
    sheet.setAttribute('aria-labelledby', 'lmTitle');
  }
  function show() {
    reset(); back.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    void back.offsetWidth;              // let the slide-up animation start
    back.classList.add('lm-on');
    x.focus();
  }
  function close() {
    back.classList.remove('lm-on');
    document.documentElement.style.overflow = '';
    setTimeout(function () { back.hidden = true; reset(); }, 230);
    open.focus();
  }
  function showAsk() {
    list.hidden = true; ask.hidden = false;
    sheet.setAttribute('aria-labelledby', 'lmQ');
    stay.focus();                       // "Back to my trip" is the default
  }

  open.addEventListener('click', function () { press(open); show(); });
  x.addEventListener('click', function () { if (busy) return; press(x); later(close); });
  back.addEventListener('click', function (e) { if (e.target === back && !busy) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !back.hidden && !busy) close(); });
  stay.addEventListener('click', function () {
    if (busy) return; busy = true; press(stay);
    stay.disabled = leave.disabled = true;
    msg.textContent = '✓ Staying on your trip. Sharing is still on.';
    setTimeout(close, 700);
  });
  leave.addEventListener('click', function () {
    if (busy || !pending) return; press(leave);
    stay.disabled = leave.disabled = true;
    leave.textContent = 'Leaving…';
    go(pending.href);
  });
  // Coming back with Safari's back arrow can restore this page as it was left.
  window.addEventListener('pageshow', function (e) { if (e.persisted && !back.hidden) { back.classList.remove('lm-on'); back.hidden = true; document.documentElement.style.overflow = ''; reset(); } });
})();

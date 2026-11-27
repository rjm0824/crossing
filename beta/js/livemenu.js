// ---------- Bottom bar on the Start trip / Live screen (live.html only) ----------
// RJ, Nov 26: the Live page gets the same bottom bar as the rest of the app
// (Plan · Live · Family · Menu). frame.js draws the bar, unchanged. This file
// adds only what live.html needs on top:
//   * the bar's styles, in the bar's usual dark colours (the Live page is
//     light, and frame.css is not loaded here so the Live page's own buttons
//     and messages keep their tested look);
//   * room at the bottom so the bar never covers Stop sharing or the
//     "Planning aid" line;
//   * while a trip is sharing, leaving asks first, because leaving this page
//     pauses sharing.
// It never touches the trip, GPS, the send queue or the screen-awake lock. It
// only READS cx:beta:trip. Followers use family.html, which does not load it.
(function () {
  'use strict';
  if (!document.body.classList.contains('tp')) return;

  function sharing() {
    try { var t = JSON.parse(localStorage.getItem('cx:beta:trip') || 'null'); return !!(t && t.status === 'underway'); }
    catch (e) { return false; }
  }

  var css = document.createElement('style');
  css.textContent = [
    // Room for the bar (frame.css does this on the other pages).
    'body.tp.framed{padding-bottom:calc(84px + env(safe-area-inset-bottom))}',
    // The bar, as in frame.css, with the dark-theme colours it has everywhere else.
    '.tp .tabbar{--soft:#9fb7c9;--accent:#5cc8ff;--line:#1f4260;--go:#2fbf71;position:fixed;left:0;right:0;bottom:0;z-index:1500;display:flex;background:#0a1824;border-top:1px solid var(--line);padding:0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}',
    '.tp .tabbar a{flex:1;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--soft);text-decoration:none;font-size:13px;font-weight:500;border-top:3px solid transparent;-webkit-tap-highlight-color:transparent}',
    '.tp .tabbar a .ic{font-size:19px;line-height:1}',
    '.tp .tabbar a.on{color:var(--accent);font-weight:700;border-top-color:var(--accent)}',
    '.tp .tabbar a .live{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--go);margin-left:4px;vertical-align:1px}',
    // Every button shows it was pressed.
    '.tp .tabbar a:active,.tp .tabbar a.lm-pressed{background:#16354d}',
    // The "Stay on your trip?" sheet.
    '.lm-back{position:fixed;inset:0;z-index:2900;background:rgba(14,34,51,.45);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .2s}',
    '.lm-back.lm-on{opacity:1}',
    '.lm-sheet{background:#fff;border-radius:18px 18px 0 0;width:100%;max-width:520px;padding:18px 16px calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;transform:translateY(100%);transition:transform .22s ease-out}',
    '.lm-on .lm-sheet{transform:none}',
    '@media (prefers-reduced-motion:reduce){.lm-back,.lm-sheet{transition:none}}',
    '.lm-sheet b{font-size:17px}',
    '.lm-sheet .bigbtn:active,.lm-sheet .bigbtn.lm-pressed{filter:brightness(.85)}',
    '.lm-msg{font-size:14px;font-weight:600;min-height:1.2em;color:var(--go)}'
  ].join('\n');
  document.head.appendChild(css);

  var back = document.createElement('div');
  back.className = 'lm-back'; back.hidden = true;
  back.innerHTML =
    '<div class="lm-sheet" role="dialog" aria-modal="true" aria-labelledby="lmQ">' +
      '<b id="lmQ">Sharing pauses while you\'re away from this page. Stay on your trip?</b>' +
      '<button type="button" class="bigbtn lm-stay">Back to my trip</button>' +
      '<button type="button" class="bigbtn plain lm-leave">Leave anyway</button>' +
      '<div class="lm-msg" role="status" aria-live="polite"></div>' +
    '</div>';
  document.body.appendChild(back);
  var stay = back.querySelector('.lm-stay'), leave = back.querySelector('.lm-leave'), msg = back.querySelector('.lm-msg');
  var pendingHref = null, busy = false, opener = null;

  function press(el) { el.classList.add('lm-pressed'); setTimeout(function () { el.classList.remove('lm-pressed'); }, 250); }
  function reset() { busy = false; pendingHref = null; msg.textContent = ''; stay.disabled = leave.disabled = false; leave.textContent = 'Leave anyway'; }
  function ask(href, from) {
    reset(); pendingHref = href; opener = from;
    back.hidden = false;
    void back.offsetWidth;              // let the slide-up animation start
    back.classList.add('lm-on');
    stay.focus();                       // "Back to my trip" is the default
  }
  function close() {
    back.classList.remove('lm-on');
    setTimeout(function () { back.hidden = true; reset(); }, 230);
    if (opener) opener.focus();
  }

  // The bar's links (drawn by frame.js). Capture phase, so this runs first
  // whichever script loads first.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.tabbar a');
    if (!a) return;
    press(a);
    if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); return; }   // Live: already here
    if (sharing()) { e.preventDefault(); ask(a.href, a); }
  }, true);

  back.addEventListener('click', function (e) { if (e.target === back && !busy) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !back.hidden && !busy) close(); });
  stay.addEventListener('click', function () {
    if (busy) return; busy = true; press(stay);
    stay.disabled = leave.disabled = true;
    msg.textContent = '✓ Staying on your trip. Sharing is still on.';
    setTimeout(close, 700);
  });
  leave.addEventListener('click', function () {
    if (busy || !pendingHref) return; busy = true; press(leave);
    stay.disabled = leave.disabled = true;
    leave.textContent = 'Leaving…';
    var href = pendingHref;
    setTimeout(function () { location.href = href; }, 150);
  });
  // The green "underway" dot on the Live tab: frame.js sets it once when the
  // page opens, but a trip starts and ends on this page, so keep it matching.
  setInterval(function () {
    var lab = document.querySelector('.tabbar a.on span:last-child');
    if (!lab) return;
    var dot = lab.querySelector('.live'), on = sharing();
    if (on && !dot) { dot = document.createElement('span'); dot.className = 'live'; dot.title = 'Trip underway'; lab.appendChild(dot); }
    else if (!on && dot) dot.remove();
  }, 2000);
  // Coming back with Safari's back arrow can restore this page as it was left.
  window.addEventListener('pageshow', function (e) { if (e.persisted && !back.hidden) { back.classList.remove('lm-on'); back.hidden = true; reset(); } });
})();

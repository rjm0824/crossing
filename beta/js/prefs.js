// ---------- Settings screen (MVP row 7) ----------
// Saved on this device only, as cx:beta:prefs = { intervalMin, overdueMin, keepAwake }.
// NOT CONNECTED YET (RJ, Nov 26): the Live screen is in a code freeze until
// after the crossing and still uses 5 min, 80 min and keep-awake on. After
// the crossing, live.js reads these values and this screen joins the Menu.
(function () {
  var KEY = 'cx:beta:prefs';
  function $(id) { return document.getElementById(id); }
  var GROUPS = [
    { id: 'intervalMin', title: 'Tracking interval', help: 'How often the boat\'s position is sent. Shorter uses more battery and data.',
      opts: [[1, '1 min'], [5, '5 min'], [10, '10 min'], [30, '30 min']], def: 5 },
    { id: 'overdueMin', title: 'Overdue time', help: 'How long after your planned arrival your followers see an overdue notice.',
      opts: [[30, '30 min'], [60, '60 min'], [80, '80 min'], [120, '2 hours']], def: 80 },
    { id: 'keepAwake', title: 'Keep screen on while sharing', help: 'Stops the phone or iPad from pausing tracking when it would go dark.',
      opts: [[true, 'On'], [false, 'Off']], def: true }
  ];
  var prefs = {};
  try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') prefs = v; } catch (e) {}
  // Only values on the list count; anything else falls back to the default.
  GROUPS.forEach(function (g) { if (!g.opts.some(function (o) { return o[0] === prefs[g.id]; })) prefs[g.id] = g.def; });

  function result(s, kind) { var el = $('prefsResult'); el.textContent = s; el.className = 'result' + (kind ? ' ' + kind : ''); }
  var box = $('prefsBox');
  function draw() {
    box.innerHTML = '';
    GROUPS.forEach(function (g) {
      var sec = document.createElement('div'); sec.className = 'pgroup';
      var h = document.createElement('div'); h.className = 'ptitle'; h.id = 'pt_' + g.id; h.textContent = g.title;
      var row = document.createElement('div'); row.className = 'seg'; row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-labelledby', h.id);
      g.opts.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1];
        var on = prefs[g.id] === o[0];
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false'); if (on) b.className = 'on';
        b.onclick = function () {
          prefs[g.id] = o[0];
          try { localStorage.setItem(KEY, JSON.stringify({ intervalMin: prefs.intervalMin, overdueMin: prefs.overdueMin, keepAwake: prefs.keepAwake, savedAt: Date.now() })); result('Saved on this device.', 'good'); }
          catch (e) { result('Couldn\'t save on this device. Check that private browsing is off.', 'wait'); }
          draw();
        };
        row.appendChild(b);
      });
      var p = document.createElement('div'); p.className = 'note'; p.textContent = g.help;
      sec.append(h, row, p); box.appendChild(sec);
    });
  }
  draw();
})();

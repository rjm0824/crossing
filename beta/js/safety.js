// ---------- Safety gear checklist (MVP row 7) ----------
// A reminder list, not an official requirement list. Ticks are saved on this
// device only (cx:beta:safety), by item id so a later list change can't
// move a tick onto the wrong item. "Reset for a new trip" clears them.
(function () {
  var KEY = 'cx:beta:safety';
  function $(id) { return document.getElementById(id); }
  var ITEMS = [
    ['pfd',      'Life jackets', 'One per person, sizes checked'],
    ['throw',    'Throwable cushion or ring', ''],
    ['flares',   'Flares in date', 'Day and night'],
    ['fire',     'Fire extinguishers charged', ''],
    ['horn',     'Horn or whistle', ''],
    ['vhf',      'VHF radio check', 'Channel 16'],
    ['epirb',    'EPIRB registered, battery in date', ''],
    ['firstaid', 'First aid kit', ''],
    ['lights',   'Navigation lights working', ''],
    ['bilge',    'Bilge pumps working', ''],
    ['ditch',    'Ditch bag packed', ''],
    ['anchor',   'Anchor and line ready', '']
  ];
  var ticks = {};
  try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.ticks && typeof v.ticks === 'object') ticks = v.ticks; } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ticks: ticks, savedAt: Date.now() })); }
    catch (e) { $('safetyCount').textContent = 'Couldn\'t save ticks on this device. Check that private browsing is off.'; }
  }

  var ol = $('safetyList');
  function draw() {
    ol.innerHTML = '';
    var n = 0;
    ITEMS.forEach(function (it) {
      var on = ticks[it[0]] === true; if (on) n++;
      var li = document.createElement('li'); if (on) li.className = 'done';
      var lab = document.createElement('label'); lab.className = 'chkrow';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = on;
      cb.onchange = function () { if (cb.checked) ticks[it[0]] = true; else delete ticks[it[0]]; save(); draw(); };
      var sp = document.createElement('span');
      var b = document.createElement('b'); b.textContent = it[1]; sp.appendChild(b);
      if (it[2]) { var s = document.createElement('small'); s.textContent = it[2]; sp.appendChild(s); }
      lab.append(cb, sp); li.appendChild(lab); ol.appendChild(li);
    });
    $('safetyCount').textContent = n + ' of ' + ITEMS.length + ' done' + (n === ITEMS.length ? ' ✓' : '');
  }

  // Two taps to clear, so a stray tap at the dock doesn't wipe the list.
  var armed = null;
  $('safetyReset').onclick = function () {
    var btn = this;
    if (!armed) {
      btn.textContent = 'Tap again to clear all ticks';
      armed = setTimeout(function () { armed = null; btn.textContent = 'Reset for a new trip'; }, 4000);
      return;
    }
    clearTimeout(armed); armed = null; btn.textContent = 'Reset for a new trip';
    ticks = {}; save(); draw();
  };
  draw();
})();

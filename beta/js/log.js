// ---------- Crossing log (test kit, Nov 27) ----------
// One-tap notes with the time, for the crossing home and the Dec 1 debrief.
// Saved on this device only as cx:beta:crosslog = [{ t, what, text }].
// No location. It never reads or changes the Live screen's saved data.
(function () {
  var KEY = 'cx:beta:crosslog', MAX = 500;
  var BUTTONS = ['Sharing started', 'Signal lost', 'Signal back', 'Check-in sent', 'Passed inlet', 'Home / trip ended', 'Battery %'];
  function $(id) { return document.getElementById(id); }

  var mem = null;   // used if the phone can't save (private browsing)
  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(v)) return v; } catch (e) {}
    return mem || [];
  }
  function save(list) {
    mem = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }

  function fmtTime(t) { return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function fmtDay(t) { return new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function zone(t) {
    try { return new Date(t).toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop(); } catch (e) { return ''; }
  }
  function line(e) { return e.what + (e.text ? ': ' + e.text : ''); }

  function result(s, kind) { var el = $('logResult'); el.textContent = s; el.className = 'result' + (kind ? ' ' + kind : ''); }

  var lastTap = {};
  function add(what, text) {
    var now = Date.now();
    if (!text && lastTap[what] && now - lastTap[what] < 3000) { result('Already noted: ' + what + '.', 'wait'); return false; }
    lastTap[what] = now;
    var list = load();
    list.push({ t: now, what: what, text: text || '' });
    if (list.length > MAX) list = list.slice(-MAX);
    var ok = save(list);
    result(ok ? 'Noted: ' + what + ' at ' + fmtTime(now) + '.' : 'Noted for now, but this phone can’t save it. Is private browsing on?', ok ? 'good' : 'wait');
    draw();
    return true;
  }

  // ---------- buttons ----------
  var grid = $('logBtns');
  BUTTONS.forEach(function (b) {
    var el = document.createElement('button');
    el.type = 'button'; el.textContent = b;
    el.addEventListener('click', function () {
      if (b === 'Battery %') { openBattery(); return; }
      if (add(b)) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 900); }
    });
    grid.appendChild(el);
  });

  $('noteForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = clip($('noteText').value, 200);
    if (!t) { $('noteText').focus(); return; }
    add('Note', t);
    $('noteText').value = '';
  });

  // ---------- battery ----------
  // Safari can't read the iPad's battery, so the captain types what it shows.
  function openBattery() {
    $('battNum').value = ''; $('battMsg').textContent = '';
    $('battDlg').hidden = false; $('battNum').focus();
  }
  function closeBattery() { $('battDlg').hidden = true; }
  $('battCancel').addEventListener('click', closeBattery);
  $('battSave').addEventListener('click', function () {
    var v = clip($('battNum').value, 3);
    if (!/^\d{1,3}$/.test(v) || +v > 100) { $('battMsg').textContent = 'Enter a number from 0 to 100.'; $('battMsg').className = 'result bad'; $('battNum').focus(); return; }
    closeBattery();
    add('Battery', v + '%');
  });
  $('battNum').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('battSave').click(); });

  // ---------- list ----------
  function draw() {
    var list = load(), ul = $('logList');
    ul.replaceChildren();
    $('logEmpty').hidden = list.length > 0;
    $('logCount').textContent = list.length ? '(' + list.length + ')' : '';
    $('logCopy').disabled = $('logShare').disabled = $('logClear').disabled = !list.length;
    list.slice().reverse().forEach(function (e) {
      var li = document.createElement('li');
      var t = document.createElement('span'); t.className = 'lt'; t.textContent = fmtTime(e.t);
      var w = document.createElement('span'); w.className = 'lw'; w.textContent = line(e);
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '×';
      x.setAttribute('aria-label', 'Delete ' + line(e) + ' at ' + fmtTime(e.t));
      x.addEventListener('click', function () {
        if (!confirm('Delete "' + line(e) + '" at ' + fmtTime(e.t) + '?')) return;
        save(load().filter(function (o) { return !(o.t === e.t && o.what === e.what && o.text === e.text); }));
        result('Deleted.', ''); draw();
      });
      li.append(t, w, x); ul.appendChild(li);
    });
  }

  // The whole log as plain text, oldest first, with a date line when the day changes.
  function asText() {
    var list = load(), out = ['Crossing log (' + zone(list.length ? list[0].t : Date.now()) + ' times)'], day = '';
    list.forEach(function (e) {
      var d = fmtDay(e.t);
      if (d !== day) { out.push('', d); day = d; }
      out.push(fmtTime(e.t) + '  ' + line(e));
    });
    return out.join('\n');
  }

  $('logCopy').addEventListener('click', function () {
    var text = asText();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      result(ok ? 'Copied. Paste it into Notes or a message.' : 'Couldn’t copy here. Use Share instead.', ok ? 'good' : 'wait');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { result('Copied. Paste it into Notes or a message.', 'good'); }, fallback);
    } else fallback();
  });

  if (!navigator.share) $('logShare').hidden = true;
  $('logShare').addEventListener('click', function () {
    navigator.share({ title: 'Crossing log', text: asText() }).catch(function () {});
  });

  $('logClear').addEventListener('click', function () {
    if (!confirm('Clear the whole log on this phone? Copy it first if you need it.')) return;
    save([]); result('Log cleared.', ''); draw();
  });

  draw();
})();

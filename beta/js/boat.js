// ---------- My Boat (profile only, MVP row 7) ----------
// Saved on this device only, in the boat part of the saved setup
// (cx:beta:setup, see setup.js; moved there in row 8, RJ Nov 27). The old
// cx:beta:boat is copied in once and left as it was. No ID numbers (RJ,
// Nov 26): no hull ID, no registration number. Not sent anywhere.
(function () {
  function $(id) { return document.getElementById(id); }
  var FIELDS = [
    { id: 'name',   label: 'Boat name',          max: 40, ph: "Goof n' Off" },
    { id: 'make',   label: 'Make and model',     max: 60, ph: 'e.g. Center console, make and model' },
    { id: 'length', label: 'Length (feet)',      max: 3,  ph: 'e.g. 39', num: true },
    { id: 'engines',label: 'Engines',            max: 60, ph: 'e.g. Twin 300 hp outboards' },
    { id: 'colour', label: 'Hull colour',        max: 30, ph: 'e.g. White with a blue stripe' },
    { id: 'marina', label: 'Home marina',        max: 60, ph: 'Where the boat is kept' }
  ];
  // Today's preview is RJ's boat, so the name starts filled in.
  var DEFAULTS = { name: "Goof n' Off" };

  function load() {
    var s = window.CXSetup.load();
    return s && s.boat && Object.keys(s.boat).length ? s.boat : null;
  }
  function clean(f, v) {
    v = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, f.max);
    if (f.num) { v = v.replace(/[^0-9]/g, ''); if (v && (+v < 10 || +v > 200)) return null; }
    return v;
  }

  var saved = load(), start = saved || DEFAULTS;
  var form = $('boatForm');
  FIELDS.forEach(function (f) {
    var wrap = document.createElement('label'); wrap.className = 'ffield';
    var lb = document.createElement('span'); lb.textContent = f.label;
    var inp = document.createElement('input');
    inp.id = 'b_' + f.id; inp.maxLength = f.max; inp.placeholder = f.ph; inp.autocomplete = 'off';
    if (f.num) { inp.inputMode = 'numeric'; inp.pattern = '[0-9]*'; }
    inp.value = clean(f, start[f.id]) || '';
    inp.addEventListener('input', function () { status(''); $('boatSave').disabled = false; });
    wrap.append(lb, inp); form.appendChild(wrap);
  });

  function status(s, kind) { var el = $('boatResult'); el.textContent = s; el.className = 'result' + (kind ? ' ' + kind : ''); }
  if (saved) { status('Saved on this device.', 'good'); $('boatSave').disabled = true; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var out = {}, bad = null;
    FIELDS.forEach(function (f) {
      var v = clean(f, $('b_' + f.id).value);
      if (v === null) { bad = bad || f; return; }
      out[f.id] = v; $('b_' + f.id).value = v;
    });
    if (bad) { status(bad.label + ': enter a number from 10 to 200.', 'wait'); $('b_' + bad.id).focus(); return; }
    if (!out.name) { status('Add a boat name first.', 'wait'); $('b_name').focus(); return; }
    if (!window.CXSetup.save({ boat: out })) { status('Couldn\'t save on this device. Check that private browsing is off.', 'wait'); return; }
    $('boatSave').disabled = true;
    status('Saved on this device.', 'good');
  });
})();

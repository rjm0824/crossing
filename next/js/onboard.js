// ---------- Onboarding without AI (MVP row 8) ----------
// Screens follow docs/mockups/Onboarding.dc.html. Reached from Menu → Setup
// only, until after the crossing (RJ, Nov 27). Saves into the one setup
// (setup.js). Tapped chips fill the form; typed answers are placed in the form
// as written (no AI until row 16). Everything stays on this device.
(function () {
  var S = window.CXSetup;
  var app = document.getElementById('ob');
  var STEPS = 7;   // safety, questions, boat, limits, route (row 9), followers, tracking

  // The 7 questions. Chips come from the mockup; route chips are only the
  // routes that exist today (the Bimini presets arrive in row 9).
  var HULLS = ['Center console', 'Walkaround', 'Express cruiser', 'Catamaran'];
  var Q = [
    { ask: 'What do you call her?', chips: ["Goof n' Off", 'No name yet'], ph: 'Boat name' },
    { ask: 'What kind of boat is she?', chips: HULLS, ph: 'e.g. Sportfish' },
    { ask: 'How long, and what’s pushing her?', chips: ['30 ft · twin outboards', '34 ft · triple outboards', '40 ft · twin diesels'], ph: 'e.g. 39 ft, triple 300s' },
    { ask: 'Cruise speed and fuel tank?', chips: ['26 kt · 150 gal', '30 kt · 300 gal', '20 kt · 400 gal'], ph: 'e.g. 26 kt, 215 gal' },
    { ask: 'About how much fuel does she burn at cruise?', chips: ['9 gph', '14 gph', 'Not sure'], ph: 'e.g. 28 gph' },
    { ask: 'Where do you usually go?', chips: ['West Palm → Green Turtle', 'Somewhere else'], ph: 'e.g. Lake Worth to Great Sale' },
    { ask: 'Who worries when you’re out there? They can watch you cross, live, from one link. No app needed.', chips: ['Haile + Mom', 'Just one person', 'Set up later'], ph: 'First names, e.g. Haile, Mom' }
  ];

  var saved = S.load() || {};
  var st = {
    screen: 'welcome',
    agree: !!saved.agreedAt,
    answers: Array.isArray(saved.answers) ? saved.answers.slice(0, Q.length) : []
  };

  // ---------- small helpers ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function go(screen) { if (!st.form && /^(boat|limits|route|mymap|followers|tracking)$/.test(screen)) startForm(); st.screen = screen; render(); window.scrollTo(0, 0); }

  // Rough fuel burn when the captain taps "Not sure": by length, engines and
  // boat type. Shown in amber as an estimate to check after the first trip.
  function estimateBurn(f) {
    var len = +f.length;
    if (!len) return null;
    var e = (f.engines || '').toLowerCase(), k = 1;
    if (/single|one\b/.test(e)) k = 0.7;
    if (/triple|three/.test(e)) k = 1.35;
    if (/quad|four/.test(e)) k = 1.7;
    if (/diesel/.test(e)) k *= 0.75;
    if (/catamaran/i.test(f.type || '')) k *= 0.9;
    return Math.max(3, Math.round(len * 0.55 * k));
  }

  // Turns the answers into form values (strings, as the form shows them).
  // Chips are read exactly; typed answers go in as written, for the captain
  // to check on the next screens.
  function fromAnswers(a) {
    var f = { name: '', type: '', length: '', engines: '', cruise: '', tank: '', burn: '', burnEstimate: false, routeText: '', followers: [] };
    function A(i) { return a[i] && !a[i].skip ? a[i] : null; }
    var m;
    if (A(0)) f.name = A(0).chip && A(0).text === 'No name yet' ? '' : A(0).text;
    if (A(1)) f.type = A(1).text;
    if (A(2)) {
      if (A(2).chip && (m = /^(\d+) ft · (.+)$/.exec(A(2).text))) { f.length = m[1]; f.engines = cap(m[2]); }
      else f.engines = A(2).text;
    }
    if (A(3)) {
      if (A(3).chip && (m = /^(\d+) kt · (\d+) gal$/.exec(A(3).text))) { f.cruise = m[1]; f.tank = m[2]; }
      else f.cruise = A(3).text;
    }
    if (A(4)) {
      if (A(4).chip && A(4).text === 'Not sure') {
        var est = estimateBurn(f);
        if (est) { f.burn = String(est); f.burnEstimate = true; }
      } else if (A(4).chip && (m = /^(\d+) gph$/.exec(A(4).text))) f.burn = m[1];
      else f.burn = A(4).text;
    }
    if (A(5)) f.routeText = A(5).text;
    if (A(6)) {
      var t = A(6).text;
      if (A(6).chip && t === 'Set up later') f.followers = [];
      else if (A(6).chip && t === 'Just one person') f.followers = [''];
      else f.followers = t.split(/\s*(?:,|\+|&|\band\b)\s*/i).map(function (n) { return clip(n, 40); }).filter(Boolean).slice(0, 6);
    }
    return f;
  }

  function saveAnswers() { S.save({ answers: st.answers, answersAt: Date.now() }); }

  // ---------- screens ----------
  function previewBanner() {
    var bar = h('div', { class: 'preview', text: 'PREVIEW · test copy, not the live page' });
    if (location.pathname.indexOf('/next/') !== -1) bar.style.display = 'block';
    return bar;
  }
  function planningAid() {
    return h('div', { class: 'nfn' }, [h('b', { text: 'Planning aid, not for navigation.' }), ' The captain decides.']);
  }

  function welcome() {
    var started = st.answers.length > 0 || st.agree, finished = !!(S.load() || {}).doneAt;
    return h('div', { class: 'welcome' }, [h('div', { class: 'ob-in' }, [
      h('div', { class: 'top' }, [
        h('a', { class: 'exit', href: 'menu.html', text: '‹ Menu' }),
        h('span', { class: 'appname', text: '[App name]' }),
        h('h1', { text: 'Know when to go.' }),
        h('p', { class: 'lede', text: 'Seas, wind and tides along your whole route, checked against your limits. And the people who worry about you can watch you cross, live, from one link.' })
      ]),
      art(),
      h('div', { class: 'acts' }, [
        h('button', { type: 'button', class: 'bigwhite', id: 'obStart', text: finished ? 'Change my setup' : started ? 'Carry on setting up' : 'Set up my boat', onclick: function () { go('safety'); } }),
        started ? h('button', { type: 'button', class: 'linkbtn', style: 'color:#A9C3D3;align-self:center', text: 'Start the questions over', onclick: function () {
          if (!confirm('Clear your answers to the questions and start over?')) return;
          st.answers = []; saveAnswers(); go('safety');
        } }) : null,
        h('span', { class: 'small', text: 'About 2 minutes. Free while we test it with friends.' }),
        planningAid()
      ])
    ])]);
  }

  // A simple drawing for the welcome screen: a crossing on a map, and a
  // follower's phone on shore.
  function art() {
    var NS = 'http://www.w3.org/2000/svg';
    var wrap = h('div', { class: 'art', 'aria-hidden': 'true' });
    wrap.innerHTML = '<svg xmlns="' + NS + '" viewBox="0 0 340 200" role="img">' +
      '<path d="M0 0 H48 Q60 60 44 110 Q36 160 52 200 H0 Z" fill="#23405A"/>' +
      '<path d="M340 40 Q300 52 292 80 Q286 104 304 118 Q326 130 340 126 Z" fill="#23405A"/>' +
      '<path d="M56 120 C120 70 200 140 288 92" fill="none" stroke="#5CC8FF" stroke-width="3" stroke-dasharray="7 7" stroke-linecap="round"/>' +
      '<circle cx="56" cy="120" r="6" fill="#A9C3D3"/><circle cx="288" cy="92" r="6" fill="#A9C3D3"/>' +
      '<circle cx="168" cy="104" r="11" fill="#2FBF71" opacity=".25"/><circle cx="168" cy="104" r="6" fill="#2FBF71"/>' +
      '<rect x="196" y="132" width="128" height="52" rx="10" fill="#FFFFFF"/>' +
      '<text x="208" y="153" font-size="12" font-weight="700" fill="#0E2233" font-family="system-ui,sans-serif">On the way</text>' +
      '<text x="208" y="171" font-size="11" fill="#4A5E6D" font-family="system-ui,sans-serif">Arriving about 12:40</text>' +
      '</svg>';
    return wrap;
  }

  function stepFrame(n, title, onBack, body, foot) {
    var bars = h('div', { class: 'ob-bars', style: '--n:' + STEPS });
    for (var i = 1; i <= STEPS; i++) bars.appendChild(h('span', { class: i <= n ? 'on' : '' }));
    return h('div', { class: 'ob' }, [
      previewBanner(),
      h('header', { class: 'ob-head' }, [h('div', { class: 'ob-in' }, [
        h('div', { class: 'row' }, [
          h('button', { type: 'button', class: 'ob-back', text: 'Back', onclick: onBack }),
          h('span', { class: 'ob-count', text: 'Step ' + n + ' of ' + STEPS })
        ]),
        bars,
        h('h1', { text: title })
      ])]),
      h('main', { class: 'ob-body' }, [h('div', { class: 'ob-in' }, body)]),
      h('footer', { class: 'ob-foot' }, [h('div', { class: 'ob-in' }, [foot, planningAid()])])
    ]);
  }

  function safety() {
    var input = h('input', { type: 'checkbox', id: 'obAgree', checked: st.agree, onchange: function () {
      st.agree = input.checked;
      S.save({ agreedAt: st.agree ? Date.now() : null });
      render();
    } });
    var box = h('label', { class: 'agree' + (st.agree ? ' on' : ''), for: 'obAgree' }, [
      input,
      h('span', { class: 'box', 'aria-hidden': 'true', text: st.agree ? '✓' : '' }),
      h('span', {}, ['I understand. I’m the captain and I make the call. I’ve read the ',
        h('a', { href: '../privacy.html', target: '_blank', rel: 'noopener', text: 'Privacy statement' }), '.'])
    ]);
    return stepFrame(1, 'Safety first', function () { go('welcome'); }, [
      h('div', { class: 'ob-card' }, [
        h('p', {}, [h('b', { text: 'This is a planning aid, not a navigation tool.' })]),
        h('p', { text: 'Forecasts can be wrong. Use your charts, plotter, VHF and your own eyes. The captain always decides.' }),
        h('p', { text: 'The family link is a courtesy. It never replaces a VHF radio, an EPIRB or calling the Coast Guard.' })
      ]),
      box,
      h('p', { class: 'ob-placeholder', text: 'Placeholder wording: to be reviewed by RJ’s attorney before launch. There is no Terms of use page yet.' })
    ], h('button', { type: 'button', class: 'ob-next', id: 'obNext', disabled: !st.agree, text: 'Continue', onclick: function () { if (st.agree) go('tell'); } }));
  }

  function tell() {
    var a = st.answers, done = a.length >= Q.length, f = fromAnswers(a);
    var msgs = h('div', { class: 'msgs', 'aria-live': 'polite' });
    for (var i = 0; i < Q.length && i <= a.length; i++) {
      msgs.appendChild(h('div', { class: 'msg', text: Q[i].ask }));
      if (i >= a.length) break;
      var ans = a[i];
      if (ans.skip) { msgs.appendChild(h('div', { class: 'msg me skip', text: 'Skipped' })); continue; }
      msgs.appendChild(h('div', { class: 'msg me', text: ans.text }));
      if (i === 4 && ans.chip && ans.text === 'Not sure') {
        msgs.appendChild(h('div', { class: 'msg est', text: f.burnEstimate
          ? 'No problem. I’ll estimate about ' + f.burn + ' gph for a boat like yours. Check it after your first trip.'
          : 'No problem. Add the length on the next screen and fill in the burn when you know it.' }));
      }
      if (i === 5 && !(ans.chip && ans.text === 'West Palm → Green Turtle')) {
        msgs.appendChild(h('div', { class: 'msg est', text: 'For now, plans use West Palm → Abaco via Green Turtle. More routes are being added.' }));
      }
    }
    if (done) msgs.appendChild(h('div', { class: 'msg done', text: 'Got it. Next, check your boat.' }));

    var body = [h('p', { class: 'ob-help', text: 'A few quick questions. Tap or type an answer. I’ll fill in the forms and you check them.' }), msgs];

    function answer(text, chip) {
      text = clip(text, 80);
      if (!text) return;
      st.answers = a.concat([{ text: text, chip: !!chip }]);
      saveAnswers();
      render(chip ? 'scroll' : 'type');
    }

    if (!done) {
      var q = Q[a.length];
      var field = h('input', { type: 'text', id: 'obType', maxlength: '80', autocomplete: 'off', enterkeyhint: 'send', placeholder: q.ph, 'aria-label': 'Type an answer' });
      var send = h('button', { type: 'submit', text: 'Add' });
      body.push(h('div', { class: 'qcount', text: 'Question ' + (a.length + 1) + ' of ' + Q.length }));
      body.push(h('div', { class: 'chips' }, q.chips.map(function (c) {
        return h('button', { type: 'button', class: 'chip', text: c, onclick: function () { answer(c, true); } });
      })));
      body.push(h('form', { class: 'typed', onsubmit: function (e) { e.preventDefault(); answer(field.value, false); } }, [field, send]));
      body.push(h('button', { type: 'button', class: 'linkbtn', text: 'Skip this question', onclick: function () {
        st.answers = a.concat([{ skip: true }]); saveAnswers(); render('scroll');
      } }));
      body.push(h('p', { class: 'ob-help', text: 'No signal? Tap the answers or use the keyboard. You can skip and fill the forms yourself.' }));
    }
    if (a.length) body.push(h('button', { type: 'button', class: 'linkbtn', text: 'Change my last answer', onclick: function () {
      st.answers = a.slice(0, -1); saveAnswers(); render('scroll');
    } }));

    return stepFrame(2, 'Tell me about your boat', function () { go('safety'); }, body,
      h('button', { type: 'button', class: 'ob-next' + (done ? '' : ' quiet'), id: 'obNext', text: done ? 'Check my boat' : 'Skip, I’ll fill the forms', onclick: function () { startForm(); go('boat'); } }));
  }

  // ---------- Step 3: your boat ----------
  // The form starts from the answers when they are newer than the last check
  // of this screen; otherwise from what was saved here.
  var NUMS = {
    length: { label: 'Length (feet)', min: 10, max: 200, ph: 'e.g. 39' },
    cruise: { label: 'Cruise speed (knots)', min: 5, max: 60, ph: 'e.g. 26', key: 'cruiseKt' },
    tank:   { label: 'Fuel tank (gallons)', min: 10, max: 2000, ph: 'e.g. 215', key: 'tankGal' },
    burn:   { label: 'Fuel burn at cruise (gallons an hour)', min: 1, max: 200, ph: 'e.g. 28', key: 'burnGph' }
  };
  function startForm() {
    var s = S.load() || {}, b = s.boat || {}, f = fromAnswers(st.answers);
    var useAnswers = st.answers.length && (s.answersAt || 0) > (s.boatCheckedAt || 0);
    function pick(k, savedV) { var a = f[k]; return useAnswers && a ? a : (savedV != null && savedV !== '' ? String(savedV) : a); }
    st.form = {
      name: pick('name', b.name), type: pick('type', b.type), length: pick('length', b.length), engines: pick('engines', b.engines),
      cruise: pick('cruise', b.cruiseKt), tank: pick('tank', b.tankGal), burn: pick('burn', b.burnGph),
      burnEstimate: useAnswers && f.burn ? f.burnEstimate : !!b.burnEstimate
    };
    var savedF = Array.isArray(s.followers) ? s.followers.map(function (x) { return { name: x.name || '', phone: x.phone || '' }; }) : null;
    var useAnsF = st.answers[6] && !st.answers[6].skip && (s.answersAt || 0) > (s.followersCheckedAt || 0);
    st.followers = useAnsF || !savedF ? f.followers.map(function (n) { return { name: n, phone: '' }; }) : savedF;
    // Route (row 9): the saved pick, else Abaco. Only ready routes are offered (routes.js).
    st.routeId = routeById(s.route && s.route.id, s).id;
    var L = s.limits || {};
    st.limits = { preset: L.preset || 'standard', seasFt: L.seasFt || 4, windKt: L.windKt || 15, noNorthInStream: L.noNorthInStream !== false };
  }
  function numOK(k, v) { var n = Number(String(v).replace(',', '.')); return isFinite(n) && n >= NUMS[k].min && n <= NUMS[k].max ? Math.round(n * 10) / 10 : null; }

  // The boat photo (photo.js): picked from the phone's photos or camera, made
  // smaller and saved on this device only. Replaces the outline (RJ, Nov 27).
  function setPhoto(blob) {
    if (st.photoUrl) URL.revokeObjectURL(st.photoUrl);
    st.photoUrl = blob ? URL.createObjectURL(blob) : null;
  }
  function cameraIcon() {
    var w = h('span', { class: 'camicon', 'aria-hidden': 'true' });
    w.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>';
    return w;
  }
  function photoCard() {
    var card = h('div', { class: 'ob-card photocard' });
    var input = h('input', { type: 'file', accept: 'image/*', id: 'obPhotoFile', class: 'vh', tabindex: '-1', 'aria-hidden': 'true' });
    var note = h('div', { class: 'obresult', 'aria-live': 'polite' });
    function pick() { note.textContent = ''; input.value = ''; input.click(); }
    function draw() {
      var top;
      if (st.photoUrl) {
        top = [h('img', { src: st.photoUrl, alt: 'Photo of your boat', class: 'boatphoto', id: 'obPhotoImg' }),
          h('div', { class: 'photorow' }, [
            h('span', { class: 'photook', text: '\u2713 Photo added' }),
            h('span', { class: 'photoacts' }, [
              h('button', { type: 'button', class: 'linkbtn', id: 'obPhotoChange', text: 'Use a different photo', onclick: pick }),
              h('button', { type: 'button', class: 'linkbtn quiet', id: 'obPhotoRemove', text: 'Remove', onclick: function () {
                window.CXPhoto.remove().catch(function () {}).then(function () { setPhoto(null); draw(); });
              } })
            ])
          ])];
      } else {
        top = [h('button', { type: 'button', class: 'addphoto', id: 'obPhoto', disabled: !!st.photoBusy, onclick: pick }, [
          cameraIcon(),
          h('b', { text: st.photoBusy ? 'Saving your photo\u2026' : 'Add a photo of your boat' }),
          h('small', { text: 'A side view works best. It stays on this phone.' })
        ])];
      }
      card.replaceChildren.apply(card, top.concat([note, input]));
    }
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      note.textContent = ''; st.photoBusy = true; draw();
      window.CXPhoto.save(file).then(function (b) { st.photoBusy = false; setPhoto(b); draw(); })
        .catch(function () { st.photoBusy = false; draw(); note.textContent = 'Couldn\u2019t use that photo. Try a different one.'; });
    });
    if (!st.photoLoaded) {
      st.photoLoaded = true;
      window.CXPhoto.get().then(function (b) { if (b) { setPhoto(b); draw(); } }).catch(function () {});
    }
    draw();
    return card;
  }

  function field(id, label, value, opts) {
    opts = opts || {};
    var inp = h('input', { id: 'f_' + id, type: 'text', value: value || '', maxlength: opts.max || '60', autocomplete: 'off', placeholder: opts.ph || '', inputmode: opts.num ? 'decimal' : null });
    inp.addEventListener('input', function () { st.form[id] = inp.value; if (id === 'burn') { st.form.burnEstimate = false; wrap.classList.remove('est'); } if (opts.oninput) opts.oninput(); });
    var wrap = h('label', { class: 'obfield' + (opts.est ? ' est' : '') }, [h('span', { text: label }), inp, opts.extra || null]);
    return wrap;
  }

  function boat() {
    var f = st.form;
    var typeChips = h('div', { class: 'chips small' }, HULLS.map(function (t) {
      return h('button', { type: 'button', class: 'chip' + (f.type === t ? ' on' : ''), 'aria-pressed': f.type === t ? 'true' : 'false', text: t, onclick: function () { f.type = t; document.getElementById('f_type').value = t; render(); } });
    }));
    var msg = h('div', { class: 'obresult', 'aria-live': 'polite' });
    var body = [
      photoCard(),
      h('p', { class: 'ob-help', text: 'The photo is optional. No photo? Skip it; you can add one later in Menu \u2192 Setup.' }),
      st.answers.length ? h('p', { class: 'ob-ok', text: 'Filled in from your answers. Check it over and change anything that’s wrong.' }) : null,
      h('div', { class: 'ob-card' }, [
        field('name', 'Boat name', f.name, { max: 40, ph: "e.g. Goof n' Off" }),
        field('type', 'Type of boat', f.type, { max: 40, ph: 'e.g. Center console', extra: typeChips }),
        field('length', NUMS.length.label, f.length, { num: true, max: 6, ph: NUMS.length.ph }),
        field('engines', 'Engines', f.engines, { max: 60, ph: 'e.g. Triple 300 hp outboards' }),
        field('cruise', NUMS.cruise.label, f.cruise, { num: true, max: 6, ph: NUMS.cruise.ph }),
        field('tank', NUMS.tank.label, f.tank, { num: true, max: 6, ph: NUMS.tank.ph }),
        field('burn', NUMS.burn.label + (f.burnEstimate ? ' · estimate' : ''), f.burn, { num: true, max: 6, ph: NUMS.burn.ph, est: f.burnEstimate,
          extra: f.burnEstimate ? h('small', { text: 'A rough estimate for a boat like yours. Check it after your first trip.' }) : null })
      ]),
      !f.burn ? h('div', { class: 'ob-ask' }, [
        h('p', { text: 'One thing missing: about how much fuel do you burn at cruise?' }),
        h('div', { class: 'chips small' }, ['9', '14'].map(function (g) {
          return h('button', { type: 'button', class: 'chip', text: g + ' gph', onclick: function () { f.burn = g; f.burnEstimate = false; render(); } });
        }).concat([h('button', { type: 'button', class: 'chip', text: 'Estimate for me', onclick: function () {
          var e = estimateBurn({ length: numOK('length', f.length) || '', engines: f.engines, type: f.type });
          if (!e) { msg.textContent = 'Add the length first, then I can estimate.'; return; }
          f.burn = String(e); f.burnEstimate = true; render();
        } })]))
      ]) : null
    ];
    function save() {
      var out = { name: clip(f.name, 40), type: clip(f.type, 40), engines: clip(f.engines, 60), burnEstimate: !!f.burnEstimate };
      var bad = null;
      ['length', 'cruise', 'tank', 'burn'].forEach(function (k) {
        var raw = clip(f[k], 20), v = raw === '' ? '' : numOK(k, raw);
        if (v === null) { bad = bad || k; return; }
        if (k === 'length') out.length = v === '' ? '' : String(Math.round(v)); else out[NUMS[k].key] = v === '' ? null : v;
      });
      if (bad) {
        msg.textContent = NUMS[bad].label + ': enter a number from ' + NUMS[bad].min + ' to ' + NUMS[bad].max + '.';
        var el = document.getElementById('f_' + bad); el.focus(); el.scrollIntoView({ block: 'center' });
        return;
      }
      if (!S.save({ boat: out, boatCheckedAt: Date.now() })) { msg.textContent = 'Couldn’t save on this device. Check that private browsing is off.'; return; }
      go('limits');
    }
    return stepFrame(3, 'Your boat', function () { go('tell'); }, body, h('div', {}, [msg, h('button', { type: 'button', class: 'ob-next', id: 'obNext', text: 'Looks right', onclick: save })]));
  }

  // ---------- Step 4: limits ----------
  var PRESETS = [['cautious', 'Cautious', 3, 12], ['standard', 'Standard', 4, 15], ['experienced', 'Experienced', 5, 18]];
  function limits() {
    var L = st.limits;
    function stepper(label, key, unit, min, max) {
      function nudge(d) { L[key] = Math.max(min, Math.min(max, L[key] + d)); L.preset = 'custom'; render(); }
      return h('div', { class: 'stepper' }, [
        h('div', {}, [h('span', { text: label }), h('b', { id: 'v_' + key, text: L[key] + ' ' + unit })]),
        h('div', { class: 'pm' }, [
          h('button', { type: 'button', 'aria-label': 'Less ' + label.toLowerCase(), text: '−', disabled: L[key] <= min, onclick: function () { nudge(-1); } }),
          h('button', { type: 'button', 'aria-label': 'More ' + label.toLowerCase(), text: '+', disabled: L[key] >= max, onclick: function () { nudge(1); } })
        ])
      ]);
    }
    var sw = h('button', { type: 'button', class: 'switchrow', role: 'switch', 'aria-checked': L.noNorthInStream ? 'true' : 'false', id: 'obNorth', onclick: function () { L.noNorthInStream = !L.noNorthInStream; render(); } }, [
      h('span', {}, [h('b', { text: 'No north wind in the Gulf Stream' }), h('small', { text: 'Wind against the current stacks up steep waves' })]),
      h('span', { class: 'sw' + (L.noNorthInStream ? ' on' : ''), 'aria-hidden': 'true' })
    ]);
    return stepFrame(4, 'Your limits', function () { go('boat'); }, [
      h('p', { class: 'ob-lede', text: 'Your limits decide GO or NO-GO. Start from a preset, then adjust.' }),
      h('div', { class: 'presets' }, PRESETS.map(function (p) {
        var on = L.preset === p[0];
        return h('button', { type: 'button', class: on ? 'on' : '', 'aria-pressed': on ? 'true' : 'false', onclick: function () { L.preset = p[0]; L.seasFt = p[2]; L.windKt = p[3]; render(); } },
          [h('b', { text: p[1] }), h('small', { text: p[2] + ' ft · ' + p[3] + ' kt' })]);
      })),
      stepper('Max seas', 'seasFt', 'ft', 1, 8),
      stepper('Max wind', 'windKt', 'kt', 5, 30),
      sw,
      h('p', { class: 'ob-help', text: 'Seas over your max, or north wind at your max in the Stream, is NO-GO. Wind over your max anywhere else is CROSSABLE, not comfortable. Standard uses the same seas and north-wind numbers as the Plan page today.' })
    ], h('button', { type: 'button', class: 'ob-next', id: 'obNext', text: 'Save my limits', onclick: function () {
      S.save({ limits: { preset: L.preset, seasFt: L.seasFt, windKt: L.windKt, noNorthInStream: L.noNorthInStream } });
      go('route');
    } }));
  }

  // ---------- Step 5: your route (MVP row 9) ----------
  function route() {
    var list = readyRoutes(S.load());
    var cards = list.map(function (r) {
      var on = st.routeId === r.id;
      var pts = h('ol', { class: 'ptlist' }, r.points.map(function (p) {
        return h('li', {}, [p.name, p.stream ? h('span', { class: 'stag', text: 'Stream' }) : null]);
      }));
      return h('button', { type: 'button', class: 'routecard' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', id: 'rt_' + r.id,
        onclick: function () { st.routeId = r.id; render(); } }, [
        h('b', { text: r.name }),
        h('small', { text: 'About ' + Math.round(routeNm(r)) + ' nm \u00b7 ' + r.sub }),
        on ? pts : null,
        on && r.home.from ? h('small', { text: 'Trip home: the same route reversed, starting at ' + r.home.from + '.' }) : null,
        on && r.mine ? h('small', { text: 'Trip home: the same route reversed.' }) : null
      ]);
    });
    var hasMine = list.some(function (r) { return r.mine; });
    cards.push(h('button', { type: 'button', class: 'routecard add', id: 'rtMine', onclick: function () { go('mymap'); } }, [
      h('b', { text: hasMine ? 'Change my own route' : 'Tap my own points on the map' }),
      h('small', { text: 'Anywhere. Name each point and mark which are in the Gulf Stream.' })
    ]));
    return stepFrame(5, 'Your route', function () { go('limits'); }, [
      h('p', { class: 'ob-lede', text: 'Pick your usual crossing. The trip home flips it.' }),
      h('div', { class: 'routes' }, cards),
      h('p', { class: 'ob-help', text: '\u201cStream\u201d marks where the no-north-wind rule applies. Fort Lauderdale and Miami to Bimini are being added.' })
    ], h('button', { type: 'button', class: 'ob-next', id: 'obNext', text: 'Use this route', onclick: function () {
      S.save({ route: { id: st.routeId } });
      go('followers');
    } }));
  }

  // ---------- Step 5b: my own route on the map (MVP row 9) ----------
  // A fixed crosshair, as in the home port picker: move the map until the
  // crosshair is on the spot, then "Add point here". A tap on the map moves
  // it there too. (A tap alone did not register on RJ's iPad, Nov 25.)
  // The map library loads only here, so the rest of Setup works with no signal.
  var LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min';
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (st.leafletLoading) return st.leafletLoading;
    st.leafletLoading = new Promise(function (ok, fail) {
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + '.css'; document.head.appendChild(css);
      var js = document.createElement('script'); js.src = LEAFLET + '.js';
      js.onload = function () { window.L ? ok() : fail(); };
      js.onerror = function () { st.leafletLoading = null; js.remove(); fail(); };
      document.head.appendChild(js);
    });
    return st.leafletLoading;
  }
  function legNm(a, b) {
    var R = 3440.065, rad = function (d) { return d * Math.PI / 180; };
    var dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    var x = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function mymap() {
    var saved = (S.load() || {}).myRoute || {};
    if (!st.myPts) st.myPts = Array.isArray(saved.points) ? saved.points.map(function (p) { return { name: p.name, lat: p.lat, lon: p.lon, stream: !!p.stream }; }) : [];
    if (st.myName == null) st.myName = saved.name || 'My route';
    var pts = st.myPts, msg = h('div', { class: 'obresult', 'aria-live': 'polite' });
    var mapEl = h('div', { class: 'mymap', id: 'obMap', 'aria-label': 'Map for placing your route points' });
    var wrap = h('div', { class: 'mapwrap' }, [mapEl, h('div', { class: 'xhair', 'aria-hidden': 'true' })]);
    var mapNote = h('p', { class: 'ob-help', id: 'obMapNote', text: 'Loading the map\u2026' });
    var listEl = h('ol', { class: 'mypts', id: 'obPts' });
    var total = h('p', { class: 'ob-help', id: 'obTotal' });
    var addBtn = h('button', { type: 'button', class: 'ob-next', id: 'obAddPt', disabled: true, text: 'Add point here' });
    var map = null, layer = null;

    function drawMap() {
      if (!map) return;
      layer.clearLayers();
      if (pts.length > 1) L.polyline(pts.map(function (p) { return [p.lat, p.lon]; }), { color: '#0F5F7A', weight: 3, dashArray: '6 6' }).addTo(layer);
      pts.forEach(function (p, i) {
        L.marker([p.lat, p.lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'ptpin' + (p.stream ? ' stream' : ''), html: String(i + 1), iconSize: [28, 28] }) }).addTo(layer);
      });
    }
    function drawList() {
      var nm = 0; for (var i = 1; i < pts.length; i++) nm += legNm(pts[i - 1], pts[i]);
      total.textContent = pts.length ? pts.length + (pts.length === 1 ? ' point' : ' points') + (pts.length > 1 ? ' \u00b7 about ' + Math.round(nm) + ' nm' : '') : 'No points yet. Put the crosshair on your start and tap Add point here.';
      listEl.replaceChildren.apply(listEl, pts.map(function (p, i) {
        var nmIn = h('input', { type: 'text', value: p.name, maxlength: '30', autocomplete: 'off', id: 'pn_' + i, 'aria-label': 'Name of point ' + (i + 1) });
        nmIn.addEventListener('input', function () { p.name = nmIn.value; });
        var tick = h('input', { type: 'checkbox', id: 'ps_' + i, checked: p.stream });
        tick.addEventListener('change', function () { p.stream = tick.checked; drawMap(); });
        return h('li', {}, [
          h('span', { class: 'pnum' + (p.stream ? ' stream' : ''), text: String(i + 1) }),
          h('div', { class: 'pmain' }, [nmIn, h('label', { class: 'ptick', for: 'ps_' + i }, [tick, ' In the Gulf Stream'])]),
          h('button', { type: 'button', class: 'rm', 'aria-label': 'Remove point ' + (i + 1), text: '\u00d7', onclick: function () { pts.splice(i, 1); drawList(); drawMap(); } })
        ]);
      }));
      addBtn.disabled = !map || pts.length >= 12;
      addBtn.textContent = pts.length >= 12 ? '12 points is the most' : 'Add point here';
    }
    addBtn.addEventListener('click', function () {
      if (!map || pts.length >= 12) return;
      var c = map.getCenter(), r5 = function (v) { return Math.round(v * 1e5) / 1e5; };
      pts.push({ name: 'Point ' + (pts.length + 1), lat: r5(c.lat), lon: r5(((c.lng + 540) % 360) - 180), stream: false });
      msg.textContent = '';
      drawList(); drawMap();
    });

    var nameIn = h('input', { type: 'text', id: 'obRouteName', value: st.myName, maxlength: '40', autocomplete: 'off' });
    nameIn.addEventListener('input', function () { st.myName = nameIn.value; });

    var screen = stepFrame(5, 'Your own route', function () { st.myPts = null; st.myName = null; go('route'); }, [
      h('p', { class: 'ob-lede', text: 'Move the map until the crosshair is on a point, then tap Add point here. Start to finish, in order.' }),
      wrap, mapNote, addBtn, total, listEl,
      h('label', { class: 'obfield' }, [h('span', { text: 'Route name' }), nameIn]),
      h('p', { class: 'ob-help', text: 'Tick \u201cIn the Gulf Stream\u201d for points where the no-north-wind rule should apply. Points are for the forecast only, not a course to steer.' })
    ], h('div', {}, [msg, h('button', { type: 'button', class: 'ob-next', id: 'obNext', text: 'Use my route', onclick: function () {
      if (pts.length < 2) { msg.textContent = 'Add at least 2 points: a start and a finish.'; return; }
      var out = pts.map(function (p, i) { return { name: clip(p.name, 30) || 'Point ' + (i + 1), lat: p.lat, lon: p.lon, stream: !!p.stream }; });
      if (!S.save({ myRoute: { name: clip(st.myName, 40) || 'My route', points: out }, route: { id: 'mine' } })) { msg.textContent = 'Couldn\u2019t save on this device. Check that private browsing is off.'; return; }
      st.routeId = 'mine'; st.myPts = null; st.myName = null;
      go('route');
    } })]));

    drawList();
    loadLeaflet().then(function () {
      if (!document.body.contains(mapEl)) return;
      map = L.map(mapEl, { zoomControl: true, attributionControl: true });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 15, maxNativeZoom: 13, attribution: 'Tiles \u00a9 Esri, GEBCO' }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 15, maxNativeZoom: 13 }).addTo(map);
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '\u00a9 OpenSeaMap' }).addTo(map);
      layer = L.layerGroup().addTo(map);
      map.on('click', function (e) { map.panTo(e.latlng); });
      if (pts.length) map.fitBounds(pts.map(function (p) { return [p.lat, p.lon]; }), { padding: [30, 30], maxZoom: 12 });
      else map.setView([26.3, -79.4], 7);
      setTimeout(function () { map.invalidateSize(); }, 120);
      mapNote.textContent = 'Pinch to zoom. Numbered dots are your points; blue ones are in the Stream.';
      drawList(); drawMap();
    }).catch(function () {
      mapNote.textContent = 'The map needs signal. Pick a route above for now, or try again when you\u2019re online.';
      mapNote.className = 'ob-placeholder';
    });
    return screen;
  }

  // ---------- Step 6: who follows you ----------
  function phoneOK(p) { p = clip(p, 24); return p === '' || (/^[+()\d\s.-]+$/.test(p) && p.replace(/\D/g, '').length >= 7 && p.replace(/\D/g, '').length <= 15); }
  function followers() {
    var list = st.followers, msg = h('div', { class: 'obresult', 'aria-live': 'polite' });
    var rows = list.map(function (fo, i) {
      var nm = h('input', { type: 'text', id: 'fn_' + i, value: fo.name, maxlength: '40', autocomplete: 'off', placeholder: 'First name', 'aria-label': 'Follower ' + (i + 1) + ' first name' });
      nm.addEventListener('input', function () { fo.name = nm.value; ini.textContent = (clip(nm.value, 1) || '?').toUpperCase(); rm.setAttribute('aria-label', 'Remove ' + (clip(nm.value, 40) || 'this follower')); });
      var ph = h('input', { type: 'tel', id: 'fp_' + i, value: fo.phone, maxlength: '24', autocomplete: 'off', placeholder: 'Phone (optional)', 'aria-label': 'Follower ' + (i + 1) + ' phone, optional' });
      ph.addEventListener('input', function () { fo.phone = ph.value; });
      var ini = h('span', { class: 'ini', 'aria-hidden': 'true', text: (clip(fo.name, 1) || '?').toUpperCase() });
      var rm = h('button', { type: 'button', class: 'rm', 'aria-label': 'Remove ' + (clip(fo.name, 40) || 'this follower'), text: '×', onclick: function () { list.splice(i, 1); render(); } });
      return h('div', { class: 'follower' }, [ini, h('div', { class: 'fins' }, [nm, ph]), rm]);
    });
    return stepFrame(6, 'Who follows you', function () { go('route'); }, [
      h('p', { class: 'ob-lede', text: 'Who should get the link to follow you? They don’t need the app.' }),
      h('div', { class: 'followers' }, rows),
      list.length < 6 ? h('button', { type: 'button', class: 'addrow', id: 'obAdd', text: '+ Add a follower', onclick: function () {
        list.push({ name: '', phone: '' }); render(); var el = document.getElementById('fn_' + (list.length - 1)); if (el) el.focus();
      } }) : null,
      h('div', { class: 'ob-card ob-help' }, [
        h('p', { text: 'When you start a trip, you send them one text with the link. The family page shows the rest: where you are, when you arrive, and if you’re overdue.' }),
        h('p', { text: 'The app never sends texts itself. A phone number is optional and is kept on this device to fill in that text.' })
      ])
    ], h('div', {}, [msg, h('button', { type: 'button', class: 'ob-next', id: 'obNext', text: list.length ? 'Continue' : 'Skip for now', onclick: function () {
      var out = [], bad = -1;
      list.forEach(function (fo, i) {
        var n = clip(fo.name, 40), p = clip(fo.phone, 24);
        if (!n && !p) return;
        if (!n && bad < 0) { bad = i; msg.textContent = 'Add a first name, or remove that row.'; document.getElementById('fn_' + i).focus(); return; }
        if (!phoneOK(p) && bad < 0) { bad = i; msg.textContent = n + '’s phone: use digits only, like (561) 555-0123, or leave it empty.'; document.getElementById('fp_' + i).focus(); return; }
        out.push({ name: n, phone: p });
      });
      if (bad >= 0) return;
      st.followers = out.map(function (x) { return { name: x.name, phone: x.phone }; });
      S.save({ followers: out, followersCheckedAt: Date.now() });
      go('tracking');
    } })]));
  }

  // ---------- Step 7: tracking on the water ----------
  // Location: asks the phone once so the question doesn't pop up at the dock.
  // The position it returns is not kept or sent. Keep screen on: the same
  // choice as Settings (cx:next:prefs.keepAwake), which the Live screen reads
  // after the crossing (Dec 1).
  var PREFS = 'cx:next:prefs';
  function readPrefs() { try { var v = JSON.parse(localStorage.getItem(PREFS) || 'null'); if (v && typeof v === 'object') return v; } catch (e) {} return {}; }
  function tracking() {
    var p = readPrefs(), awake = p.keepAwake !== false;
    var loc = st.loc || 'ask';
    var locTxt = { ask: 'Allow', asking: 'Asking…', ok: 'Allowed ✓', no: 'Not allowed', none: 'Not on this device' }[loc];
    var locBtn = h('button', { type: 'button', class: 'permrow', id: 'obLoc', disabled: loc === 'asking' || loc === 'ok', onclick: function () {
      if (!navigator.geolocation) { st.loc = 'none'; render(); return; }
      st.loc = 'asking'; render();
      navigator.geolocation.getCurrentPosition(function () { st.loc = 'ok'; render(); }, function (e) { st.loc = e && e.code === 1 ? 'no' : 'ok'; render(); }, { maximumAge: 600000, timeout: 20000 });
    } }, [
      h('span', {}, [h('b', { text: 'Location while a trip is on' }), h('small', { text: 'Sends your position to your private tracker, only during a trip' })]),
      h('span', { class: 'pill' + (loc === 'ok' ? ' on' : loc === 'no' ? ' no' : '') , text: locTxt })
    ]);
    var awakeBtn = h('button', { type: 'button', class: 'switchrow', role: 'switch', id: 'obAwake', 'aria-checked': awake ? 'true' : 'false', onclick: function () {
      var q = readPrefs(); q.keepAwake = !awake; q.savedAt = Date.now();
      try { localStorage.setItem(PREFS, JSON.stringify(q)); } catch (e) {}
      render();
    } }, [
      h('span', {}, [h('b', { text: 'Keep screen on while sharing' }), h('small', { text: 'Stops the phone or iPad pausing tracking when it locks' })]),
      h('span', { class: 'sw' + (awake ? ' on' : ''), 'aria-hidden': 'true' })
    ]);
    return stepFrame(7, 'Tracking on the water', function () { go('followers'); }, [
      h('p', { class: 'ob-lede', text: 'Two quick things so tracking works on the water.' }),
      locBtn,
      loc === 'no' ? h('p', { class: 'ob-placeholder', text: 'To turn it on: iPhone Settings → Privacy & Security → Location Services → Safari Websites → While Using the App.' }) : null,
      awakeBtn,
      h('p', { class: 'ob-help', text: 'Your location is only shared while a trip is running, and stops when you arrive. Tapping Allow now shares nothing.' })
    ], h('button', { type: 'button', class: 'ob-next', id: 'obNext', text: 'Finish', onclick: function () {
      S.save({ doneAt: Date.now() });
      go('done');
    } }));
  }

  // ---------- Done: the first verdict ----------
  // Tomorrow's best departure on today's route, judged with the saved limits,
  // using the Plan page's own forecast code (forecast.js, mysetup.js).
  function firstVerdict(box) {
    // Same badge colours and words as the Plan page.
    var WORDS = ['GO', 'CROSS-ABLE', 'NO-GO'], CLS = ['go', 'maybe', 'no'];
    var SAY = ['Looks like a go', 'Crossable, not comfortable', 'Not today'];
    function show(kids) { box.replaceChildren.apply(box, kids); }
    if (typeof loadForecast !== 'function') return;
    Object.assign(MY, readMySetup());
    Object.assign(RT, buildRoute());
    var day = etDate(new Date(Date.now() + 86400e3));
    var label = h('span', { class: 'vlabel', text: 'Tomorrow \u00b7 ' + RT.orig + ' \u2192 ' + RT.dest });
    show([label, h('p', { class: 'ob-help', text: 'Checking tomorrow\u2019s forecast\u2026' })]);
    loadForecast().then(function () {
      var best = null;
      for (var hr = 5.5; hr <= 11; hr += 0.5) {
        var o = scoreRun(etTime(day, hr));
        if (o.level >= 0 && (!best || o.level < best.level || (o.level === best.level && o.worstWave < best.worstWave))) best = o;
      }
      if (!best) { show([label, h('p', { class: 'ob-help', text: 'The forecast doesn\u2019t reach tomorrow yet. Open your plan to see the days it covers.' })]); return; }
      var arr = best.rows[best.rows.length - 1].t;
      show([label,
        h('div', { class: 'vrow' }, [
          h('span', { class: 'vbadge ' + CLS[best.level], id: 'obWord', text: WORDS[best.level] }),
          h('span', { class: 'vwhy' }, [h('b', { class: 'vsay', text: SAY[best.level] }), 'Best departure ', h('b', { text: fmtT(best.dep) }), '. Worst seas ' + best.worstWave.toFixed(1) + ' ft. ' + RT.dest + ' about ' + fmtT(arr) + '.'])
        ]),
        best.flags.length ? h('p', { class: 'ob-help', text: best.flags[0] }) : null,
        h('p', { class: 'ob-help', text: 'Judged with your limits: seas ' + MY.seasFt + ' ft, wind ' + MY.windKt + ' kt, at ' + MY.cruiseKt + ' kt. Forecasts can be wrong; the captain decides.' })
      ].filter(Boolean));
    }).catch(function () {
      show([label, h('p', { class: 'ob-help', text: 'Couldn\u2019t reach the forecast. Open your plan when you have signal.' })]);
    });
  }

  function done() {
    var names = (S.load() || {}).followers || [];
    names = names.map(function (x) { return x.name; }).filter(Boolean);
    var follow = names.length ? names.slice(0, -1).join(', ') + (names.length > 1 ? ' and ' : '') + names[names.length - 1] + (names.length > 1 ? ' get' : ' gets') + ' a link to watch you cross when you start a trip.' : 'Add the people who worry about you in ☰ Menu → Setup.';
    var verdictBox = h('div', { class: 'ob-card', id: 'obVerdict' });
    firstVerdict(verdictBox);
    return h('div', { class: 'ob' }, [previewBanner(), h('main', { class: 'ob-body' }, [h('div', { class: 'ob-in donebox' }, [
      h('span', { class: 'kicker', text: 'You’re set' }),
      h('h1', { text: 'Here\u2019s your first answer.' }),
      verdictBox,
      h('div', { class: 'ob-card tips' }, [h('b', { text: 'Tips' }),
        h('span', { text: '• ' + follow }),
        h('span', { text: '• Add it to your Home Screen: Share → Add to Home Screen' }),
        h('span', { text: '• Change anything later in ☰ Menu → Setup' })]),
      h('a', { class: 'ob-next', id: 'obOpen', href: 'index.html#captain', text: 'Open my plan' }),
      h('a', { class: 'ob-second', href: 'menu.html', text: 'Back to Menu' }),
      planningAid()
    ])])]);
  }

  var SCREENS = { welcome: welcome, safety: safety, tell: tell, boat: boat, limits: limits, route: route, mymap: mymap, followers: followers, tracking: tracking, done: done };
  // after: 'type' keeps the keyboard up for the next answer; 'scroll' shows the newest message.
  function render(after) {
    app.replaceChildren(st.screen === 'welcome' ? h('div', { class: 'ob' }, [previewBanner(), welcome()]) : SCREENS[st.screen]());
    if (st.screen === 'welcome') document.title = (location.pathname.indexOf('/next/') !== -1 ? 'PREVIEW · ' : '') + 'Setup · Crossing';
    if (after) {
      var t = document.getElementById('obType');
      if (t && after === 'type') t.focus({ preventScroll: true });
      var foot = document.querySelector('.ob-foot');
      window.scrollTo(0, document.body.scrollHeight - (foot ? foot.offsetHeight : 0));
    }
  }
  render();
})();

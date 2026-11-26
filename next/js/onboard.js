// ---------- Onboarding without AI (MVP row 8) ----------
// Screens follow docs/mockups/Onboarding.dc.html. Reached from Menu → Setup
// only, until after the crossing (RJ, Nov 27). Saves into the one setup
// (setup.js). Tapped chips fill the form; typed answers are placed in the form
// as written (no AI until row 16). Everything stays on this device.
(function () {
  var S = window.CXSetup;
  var app = document.getElementById('ob');
  var STEPS = 6;   // safety, questions, boat, limits, followers, tracking (route joins in row 9)

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
  function go(screen) { st.screen = screen; render(); window.scrollTo(0, 0); }

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

  function saveAnswers() { S.save({ answers: st.answers }); }

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
    var started = st.answers.length > 0 || st.agree;
    return h('div', { class: 'welcome' }, [h('div', { class: 'ob-in' }, [
      h('div', { class: 'top' }, [
        h('a', { class: 'exit', href: 'menu.html', text: '‹ Menu' }),
        h('span', { class: 'appname', text: '[App name]' }),
        h('h1', { text: 'Know when to go.' }),
        h('p', { class: 'lede', text: 'Seas, wind and tides along your whole route, checked against your limits. And the people who worry about you can watch you cross, live, from one link.' })
      ]),
      art(),
      h('div', { class: 'acts' }, [
        h('button', { type: 'button', class: 'bigwhite', id: 'obStart', text: started ? 'Carry on setting up' : 'Set up my boat', onclick: function () { go('safety'); } }),
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
      h('button', { type: 'button', class: 'ob-next' + (done ? '' : ' quiet'), id: 'obNext', text: done ? 'Check my boat' : 'Skip, I’ll fill the forms', onclick: function () { go('later'); } }));
  }

  // Temporary end screen for this step of row 8: shows how the answers fill
  // the form. The next step replaces it with the boat, limits, followers and
  // tracking screens.
  function later() {
    var f = fromAnswers(st.answers);
    function row(label, v, est) { return h('li', { class: est ? 'est' : '' }, [h('span', { text: label }), h('b', { text: v || '–' })]); }
    return stepFrame(3, 'Your boat', function () { go('tell'); }, [
      h('p', { class: 'ob-ok', text: 'Filled in from your answers. You’ll check and change them on this screen.' }),
      h('div', { class: 'ob-card' }, [h('ul', { class: 'rows' }, [
        row('Boat name', f.name), row('Type of boat', f.type),
        row('Length (feet)', f.length), row('Engines', f.engines),
        row('Cruise speed (kt)', f.cruise), row('Fuel tank (gal)', f.tank),
        row('Fuel burn at cruise (gph)', f.burn ? f.burn + (f.burnEstimate ? ' (estimate)' : '') : '', f.burnEstimate),
        row('Route', 'West Palm → Abaco via Green Turtle'),
        row('Followers', f.followers.length ? f.followers.map(function (n) { return n || '(name to add)'; }).join(', ') : '')
      ])]),
      h('p', { class: 'ob-placeholder', text: 'Being built: checking your boat, limits, followers and tracking come in the next update. Nothing here changes your plan yet.' })
    ], h('a', { class: 'ob-next', href: 'menu.html', style: 'display:flex;align-items:center;justify-content:center;text-decoration:none', text: 'Back to Menu' }));
  }

  var SCREENS = { welcome: welcome, safety: safety, tell: tell, later: later };
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

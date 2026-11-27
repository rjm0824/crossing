// ---------- App frame (MVP row 7) ----------
// The bottom bar for the captain's app. On the Plan page it shows only in
// captain mode (#captain), so the plain preview link looks as before. Other
// frame pages (Menu and its screens) always show it.
// It only READS the trip the Live screen saved (cx:beta:trip); it never writes it.
(function () {
  var page = document.body.getAttribute('data-tab') || 'plan';
  var isPlan = page === 'plan';
  if (isPlan && !location.hash.startsWith('#captain')) return;

  var home = new URLSearchParams(location.search).get('trip') === 'home';
  var q = home ? '?trip=home' : '';
  var underway = false;
  try { var tr = JSON.parse(localStorage.getItem('cx:beta:trip') || 'null'); underway = !!(tr && tr.status === 'underway'); } catch (e) {}

  // Tabs appear here only once their screen exists (no dead buttons).
  // My Trips joined in MVP row 14a (beta, Nov 26), in the mockup's order.
  var tabs = [
    { id: 'plan', label: 'Plan', ic: '⚓', href: 'index.html' + q + '#captain' },
    { id: 'live', label: 'Live', ic: '◉', href: 'live.html' + q, dot: underway },
    { id: 'mytrips', label: 'My Trips', ic: '▤', href: 'mytrips.html' + q },
    { id: 'family', label: 'Family', ic: '♥', href: 'family-tab.html' + q },
    { id: 'menu', label: 'Menu', ic: '☰', href: 'menu.html' + q }
  ];

  var nav = document.createElement('nav');
  nav.className = 'tabbar';
  nav.setAttribute('aria-label', 'App sections');
  tabs.forEach(function (t) {
    var a = document.createElement('a');
    a.href = t.href;
    if (t.id === page) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
    var ic = document.createElement('span'); ic.className = 'ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = t.ic;
    var lb = document.createElement('span'); lb.textContent = t.label;
    if (t.dot) { var d = document.createElement('span'); d.className = 'live'; d.title = 'Trip underway'; lb.appendChild(d); }
    a.append(ic, lb);
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
  document.body.classList.add('framed');

  // Menu pages: BETA banner and the trip direction on their own links.
  if (!isPlan) {
    var bar = document.getElementById('previewBar');
    if (bar && location.pathname.indexOf('/beta/') !== -1) { bar.style.display = 'block'; document.title = 'BETA · ' + document.title; }
    document.querySelectorAll('a[data-keep-trip]').forEach(function (a) {
      var h = a.getAttribute('href'), i = h.indexOf('#');   // the trip goes before any #captain
      a.href = i < 0 ? h + q : h.slice(0, i) + q + h.slice(i);
    });
  }
})();

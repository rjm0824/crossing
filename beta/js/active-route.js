// ---------- The route the Plan page plans (MVP row 9) ----------
// Plan page only, after mysetup.js. For the Abaco route (or no setup) it hands
// back the very same points, distances and names as today (settings.js and
// helpers.js, read only: the Live screen uses them and is frozen until after
// the crossing). For another route it builds them from the route's points:
// straight lines between them, Stream marks as the no-north-wind rule, and
// the order reversed for the trip home.
function buildRoute() {
  const r = MY.route;
  if (!r || r.id === 'abaco') {
    return { abaco: true, id: 'abaco', name: r ? r.name : 'West Palm → Abaco via Green Turtle',
      wp: WP, track: TRACK, cum: cum, totalNm: TOTAL_NM, orig: ORIG, dest: DEST };
  }
  let wp = r.points.map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, ocean: !!p.stream }));
  if (HOME) wp = wp.slice().reverse();
  const track = wp.map(p => ({ lat: p.lat, lon: p.lon }));
  const c = [0];
  for (let i = 1; i < track.length; i++) c.push(c[i - 1] + nm(track[i - 1], track[i]));
  return { abaco: false, id: r.id, name: r.name, wp, track, cum: c, totalNm: c[c.length - 1],
    orig: wp[0].name, dest: wp[wp.length - 1].name };
}
const RT = buildRoute();   // the Setup page refreshes it with Object.assign(RT, buildRoute())
// Route names can be typed by the captain, so any name going into page code
// is shown as plain text. (Abaco's fixed names have no special characters,
// so its page is unchanged.)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

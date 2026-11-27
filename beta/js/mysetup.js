// ---------- The saved setup, for the Plan page's verdict (MVP row 8) ----------
// Reads cx:beta:setup (see setup.js) and falls back to today's numbers in
// settings.js. settings.js itself is not changed: the Live screen reads it and
// is in a code freeze until after the crossing (RJ, Nov 26). Loaded by the Plan
// page and the Setup page only, after settings.js.
function readMySetup() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('cx:beta:setup') || 'null'); } catch (e) {}
  const b = (s && s.boat) || {}, L = s && s.limits;
  const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi) ? v : null;
  const burn = num(b.burnGph, 1, 200);
  const my = {
    saved: !!(s && (s.boat || s.limits)),
    cruiseKt: num(b.cruiseKt, 5, 60) || CRUISE_KT,
    tankGal: num(b.tankGal, 10, 2000) || FUEL_TANK,
    burnGph: burn,
    burnEstimate: !!(burn && b.burnEstimate),
    seasFt: (L && num(L.seasFt, 1, 8)) || 4,          // today's Plan page: over 4 ft is NO-GO
    windKt: (L && num(L.windKt, 5, 30)) || 15,        // today's: north wind 15 kt+ in the Stream is NO-GO
    noNorth: !L || L.noNorthInStream !== false,
    windRule: !!L,                                    // any wind over the max is CROSSABLE, once limits are saved
    // The chosen route (routes.js; row 9). Only Abaco is ready, so the Plan page's
    // points don't change yet; switching them comes with the Bimini presets.
    route: (typeof routeById === 'function') ? routeById(s && s.route && s.route.id, s) : null,
    // Plan page part A (row 11): the boat's name, the followers' first names
    // and the link to the captain's own papers folder (My Boat; https only).
    boatName: (typeof b.name === 'string' && b.name.trim()) ? b.name.trim().slice(0, 40) : "Goof n' Off",
    followers: (s && Array.isArray(s.followers) ? s.followers : [])
      .map(f => String((f && f.name) || '').trim().slice(0, 40)).filter(Boolean),
    papers: (typeof b.papers === 'string' && /^https:\/\/[^\s"'<>]+$/.test(b.papers)) ? b.papers : null
  };
  // "Haile and Mom", "Haile, Mom and Raul", or a plain fallback when none are saved.
  my.followerList = function () {
    const f = my.followers;
    if (!f.length) return 'the people who follow you';
    return f.length === 1 ? f[0] : f.slice(0, -1).join(', ') + ' and ' + f[f.length - 1];
  };
  // Fuel for a run: today's figures scaled by distance, or the captain's burn
  // with 20% on top for sea state and idling.
  my.fuel = function (dist) {
    const hrs = dist / my.cruiseKt;
    if (my.burnGph) return { lo: Math.round(my.burnGph * hrs), hi: Math.round(my.burnGph * hrs * 1.2), estimate: my.burnEstimate };
    return { lo: Math.round(BURN_LOW * dist / ROUTE_NM_REF), hi: Math.round(BURN_HIGH * dist / ROUTE_NM_REF), estimate: false };
  };
  return my;
}
const MY = readMySetup();   // the Setup page refreshes it with Object.assign(MY, readMySetup())

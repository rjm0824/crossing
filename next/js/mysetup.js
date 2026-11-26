// ---------- The saved setup, for the Plan page's verdict (MVP row 8) ----------
// Reads cx:next:setup (see setup.js) and falls back to today's numbers in
// settings.js. settings.js itself is not changed: the Live screen reads it and
// is in a code freeze until after the crossing (RJ, Nov 26). Loaded by the Plan
// page and the Setup page only, after settings.js.
function readMySetup() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem('cx:next:setup') || 'null'); } catch (e) {}
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
    windRule: !!L                                     // any wind over the max is CROSSABLE, once limits are saved
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

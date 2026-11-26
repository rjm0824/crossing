// ---------- Routes (MVP row 9) ----------
// One shape for every route, so Setup, the Plan page and later saved trips
// read routes the same way. Loaded after settings.js on the Plan and Setup
// pages only. settings.js is not changed: the Live screen reads its Abaco
// numbers and is in a code freeze until after the crossing.
//
// Route shape:
// {
//   id, name, sub,                // 'abaco', 'West Palm → Abaco via Green Turtle', a one-line summary
//   ready,                        // false until RJ has checked the points against charts
//   points: [ { id, name, lat, lon, stream } ],  // in order; stream: the "no north wind in the
//                                                //  Gulf Stream" rule applies here (inlets too)
//   track: [ { lat, lon }, ... ], // the line run along (straight between points if none)
//   arriveYards,                  // counts as arrived within this of the last point
//   tide: { noaa, note },         // NOAA station on the Florida side; the far side uses the ocean model
//   home: { from, points }        // the trip home: the route reversed, plus any extra start points
// }
const ROUTES = (function () {
  const fromWP = p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, stream: !!p.ocean || p.id === 'inlet' });
  const straight = pts => pts.map(p => ({ lat: p.lat, lon: p.lon }));
  const pt = (id, name, lat, lon, stream) => ({ id, name, lat, lon, stream: !!stream });

  const abaco = {
    id: 'abaco',
    name: 'West Palm → Abaco via Green Turtle',
    sub: 'Palm Beach Inlet · Memory Rock · the Bank · Green Turtle Cay',
    ready: true,
    points: WP_OUT.map(fromWP),          // from settings.js, read only
    track: TRACK_OUT,                    // RJ's own Aug 14 Garmin line
    arriveYards: 500,
    tide: { noaa: NOAA_TIDE_STATION, note: 'NOAA Lake Worth Pier; Green Turtle from the ocean model' },
    home: { from: 'Guana Cay', points: [pt('guana', 'Guana Cay', 26.6950, -77.1300), pt('whale', 'Whale Cay Passage', 26.7400, -77.1900)] }
  };

  // DRAFT points (docs/route-points.md), not chart-checked: ready stays false
  // until RJ approves them. Nothing offers a route that isn't ready.
  const ftl = [pt('inlet', 'Port Everglades Inlet', 26.0936, -80.1085, true), pt('buoy', 'Port Everglades sea buoy', 26.0930, -80.0870, true),
    pt('stream', 'Gulf Stream (mid)', 25.9100, -79.7200, true), pt('approach', 'Bimini approach (outside)', 25.7050, -79.3150), pt('bimini', 'Bimini (Alice Town)', 25.7260, -79.2980)];
  const mia = [pt('inlet', 'Government Cut', 25.7625, -80.1265, true), pt('buoy', 'Miami sea buoy', 25.7600, -80.0900, true),
    pt('stream', 'Gulf Stream (mid)', 25.7400, -79.7000, true), pt('approach', 'Bimini approach (outside)', 25.7050, -79.3150), pt('bimini', 'Bimini (Alice Town)', 25.7260, -79.2980)];

  return [
    abaco,
    { id: 'ftl-bimini', name: 'Fort Lauderdale → Bimini', sub: 'Port Everglades · the Stream · Alice Town', ready: false,
      points: ftl, track: straight(ftl), arriveYards: 500, tide: { noaa: null, note: 'station to confirm' }, home: { from: null, points: [] } },
    { id: 'mia-bimini', name: 'Miami → Bimini', sub: 'Government Cut · the Stream · Alice Town', ready: false,
      points: mia, track: straight(mia), arriveYards: 500, tide: { noaa: null, note: 'station to confirm' }, home: { from: null, points: [] } }
  ];
})();

// Routes a captain can pick today.
function readyRoutes() { return ROUTES.filter(r => r.ready); }
// The route for a saved id; anything unknown or not ready falls back to Abaco.
function routeById(id) { return readyRoutes().find(r => r.id === id) || ROUTES[0]; }
// Length along the route's line, in nautical miles.
function routeNm(r) {
  const R = 3440.065, rad = d => d * Math.PI / 180;
  let total = 0;
  for (let i = 1; i < r.track.length; i++) {
    const a = r.track[i - 1], b = r.track[i];
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(x));
  }
  return total;
}
